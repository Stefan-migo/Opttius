import { NextRequest, NextResponse } from "next/server";
import {
  createClientFromRequest,
  createServiceRoleClient,
} from "@/utils/supabase/server";
import { normalizeRUT, formatRUT } from "@/lib/utils/rut";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { RateLimitError } from "@/lib/api/errors";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    return await (withRateLimit(rateLimitConfigs.search) as any)(
      request,
      async () => {
        try {
          const { client: supabase, getUser } =
            await createClientFromRequest(request);

          // Check admin authorization
          const { data, error: userError } = await getUser();
          const user = data?.user;
          if (userError || !user) {
            return NextResponse.json(
              { error: "Unauthorized" },
              { status: 401 },
            );
          }

          const { data: isAdmin } = await supabase.rpc("is_admin", {
            user_id: user.id,
          });
          if (!isAdmin) {
            return NextResponse.json(
              { error: "Admin access required" },
              { status: 403 },
            );
          }

          // Get branch context
          const branchContext = await getBranchContext(
            request,
            user.id,
            supabase,
          );

          // Use service role client to bypass RLS and ensure we can search all customers
          const supabaseServiceRole = createServiceRoleClient();

          // Pre-fetch branch IDs for org when in global view (needed for both RPC and standard search)
          let orgBranchIds: string[] | null = null;
          if (
            !branchContext.branchId &&
            branchContext.isSuperAdmin &&
            branchContext.organizationId
          ) {
            const { data: branches } = await supabaseServiceRole
              .from("branches")
              .select("id")
              .eq("organization_id", branchContext.organizationId);
            orgBranchIds = branches?.map((b: { id: string }) => b.id) || [];
          }

          // Build a customers query with branch filter (sync, no async return)
          const buildFilteredCustomersQuery = () => {
            const q = supabaseServiceRole
              .from("customers")
              .select("id, first_name, last_name, email, phone, rut");
            const { branchId, isSuperAdmin, organizationId, accessibleBranches } =
              branchContext;
            if (branchId) return q.eq("branch_id", branchId);
            if (isSuperAdmin && orgBranchIds && orgBranchIds.length > 0) {
              return q.in("branch_id", orgBranchIds);
            }
            if (isSuperAdmin && organizationId) {
              return q.eq("branch_id", "00000000-0000-0000-0000-000000000000");
            }
            const primaryBranchId =
              accessibleBranches.find((b: { isPrimary?: boolean }) => b.isPrimary)
                ?.id || accessibleBranches[0]?.id;
            return q.eq(
              "branch_id",
              primaryBranchId || "00000000-0000-0000-0000-000000000000",
            );
          };

          // Get branch params for RPC (p_branch_id or p_branch_ids)
          let rpcBranchId: string | null = null;
          let rpcBranchIds: string[] | null = null;
          if (branchContext.branchId) {
            rpcBranchId = branchContext.branchId;
          } else if (
            branchContext.isSuperAdmin &&
            branchContext.organizationId
          ) {
            rpcBranchIds = orgBranchIds;
          } else if (!branchContext.isSuperAdmin) {
            // Regular admin without branch - no results
            rpcBranchIds = [];
          }

          const searchParams = request.nextUrl.searchParams;
          const query = searchParams.get("q") || "";

          if (query.length < 1) {
            return createApiSuccessResponse([], { requestId });
          }
          const searchTerm = query.trim();

          // Normalize RUT: remove dots, dashes, and spaces for searching
          // This allows searching with or without formatting
          const normalizedSearchTerm = normalizeRUT(searchTerm);

          // Also format the normalized RUT (in case user searches without format but RUT is stored with format)
          const formattedSearchTerm = formatRUT(normalizedSearchTerm);

          logger.debug("Searching customers", {
            query: searchTerm,
            normalized: normalizedSearchTerm,
            formatted: formattedSearchTerm,
          });

          // Check if search term looks like a RUT (mostly numbers, possibly with dots/dashes/K)
          // Allow partial RUT searches (minimum 2 characters for partial match to be more flexible)
          // This allows searching even with incomplete RUTs
          const isRutSearch =
            /^[\d.\-Kk\s]+$/.test(searchTerm) &&
            normalizedSearchTerm.length >= 2;

          // Try multiple search approaches - PostgREST syntax can be tricky
          // Approach 1: For RUT searches, use SQL function for better partial matching
          let customers: any[] = [];
          let error: any = null;

          // If this looks like a RUT search, try the SQL function first (handles partial matches better)
          if (isRutSearch) {
            try {
              logger.debug("Using RUT search function", {
                searchTerm,
                normalized: normalizedSearchTerm,
                rpcBranchId,
                rpcBranchIdsCount: rpcBranchIds?.length,
              });

              const rpcParams = (term: string) => {
                const params: Record<string, unknown> = {
                  rut_search_term: term,
                };
                if (rpcBranchIds && rpcBranchIds.length === 0) {
                  return null;
                }
                if (rpcBranchId) {
                  params.p_branch_id = rpcBranchId;
                } else if (rpcBranchIds && rpcBranchIds.length > 0) {
                  params.p_branch_ids = rpcBranchIds;
                }
                return params;
              };

              const params1 = rpcParams(searchTerm);
              const params2 = rpcParams(normalizedSearchTerm);

              if (params1 === null || params2 === null) {
                customers = [];
              } else {
                const { data: rutCustomers1, error: rutError1 } =
                  await supabaseServiceRole.rpc(
                    "search_customers_by_rut",
                    params1,
                  );

                const { data: rutCustomers2, error: rutError2 } =
                  await supabaseServiceRole.rpc(
                    "search_customers_by_rut",
                    params2,
                  );

                const rutCustomersMap = new Map();
                [...(rutCustomers1 || []), ...(rutCustomers2 || [])].forEach(
                  (c: any) => {
                    if (!rutCustomersMap.has(c.id)) {
                      rutCustomersMap.set(c.id, c);
                    }
                  },
                );
                const rutCustomers = Array.from(rutCustomersMap.values());
                customers.push(...rutCustomers);

                if (rutError1 || rutError2) {
                  logger.warn("RUT function error", {
                    error: rutError1?.message || rutError2?.message,
                  });
                }
                logger.debug("Found customers via RUT function", {
                  count: rutCustomers.length,
                });
              }
            } catch (rpcError: any) {
              logger.debug(
                "RUT function not available or old signature, using standard search",
                { error: rpcError.message },
              );
            }
          }

          // Approach 2: Use or() with ilike (standard PostgREST syntax) for all fields
          try {
            // Build the or() query string - format: field.ilike.pattern
            // Note: business_name doesn't exist in profiles table, removed from search
            const searchPattern = `%${searchTerm}%`;
            const normalizedPattern = `%${normalizedSearchTerm}%`;
            const formattedPattern = `%${formattedSearchTerm}%`;

            // For RUT search, we need to search both the formatted and normalized versions
            // We'll use a more complex query that handles RUT normalization
            let orQuery = `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`;

            // Add RUT search patterns (original, normalized, and formatted)
            if (isRutSearch) {
              // Also search with original term, normalized term, and formatted term
              // This covers all cases:
              // - User searches "123456789" -> finds RUTs stored as "123456789" or "12.345.678-9"
              // - User searches "12.345.678-9" -> finds RUTs stored as "12.345.678-9" or "123456789"
              // - User searches "102534" (partial) -> RUT function handles this, but we also try standard search
              orQuery += `,rut.ilike.${searchPattern},rut.ilike.${normalizedPattern},rut.ilike.${formattedPattern}`;
            } else {
              // For non-RUT searches, still try RUT field with original pattern
              orQuery += `,rut.ilike.${searchPattern}`;
            }

            logger.debug("OR query", { orQuery });

            const filteredQuery = buildFilteredCustomersQuery();
            const result = await filteredQuery.or(orQuery).limit(20);

            // Combine results from RUT function and standard search
            const standardResults = result.data || [];

            // Merge results, avoiding duplicates
            const existingIds = new Set(customers.map((c) => c.id));
            standardResults.forEach((customer: any) => {
              if (!existingIds.has(customer.id)) {
                customers.push(customer);
                existingIds.add(customer.id);
              }
            });

            error = result.error;

            if (error) {
              logger.error("Search error with or()", error);
              throw error;
            }
          } catch (orError: any) {
            logger.warn(
              "OR query failed, trying alternative approach",
              orError,
            );

            // Fallback: Try individual queries and combine results
            try {
              const searchPattern = `%${searchTerm}%`;
              const normalizedPattern = `%${normalizedSearchTerm}%`;
              const formattedPattern = `%${formattedSearchTerm}%`;

              const allCustomers: any[] = [];

              const queries: Promise<any>[] = [
                buildFilteredCustomersQuery()
                  .or(
                    `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`,
                  )
                  .limit(20) as unknown as Promise<any>,
                buildFilteredCustomersQuery()
                  .ilike("email", searchPattern)
                  .limit(20) as unknown as Promise<any>,
                buildFilteredCustomersQuery()
                  .ilike("phone", searchPattern)
                  .limit(20) as unknown as Promise<any>,
              ];

              if (isRutSearch) {
                queries.push(
                  buildFilteredCustomersQuery()
                    .ilike("rut", searchPattern)
                    .limit(20) as unknown as Promise<any>,
                  buildFilteredCustomersQuery()
                    .ilike("rut", normalizedPattern)
                    .limit(20) as unknown as Promise<any>,
                  buildFilteredCustomersQuery()
                    .ilike("rut", formattedPattern)
                    .limit(20) as unknown as Promise<any>,
                );
              } else {
                queries.push(
                  buildFilteredCustomersQuery()
                    .ilike("rut", searchPattern)
                    .limit(20) as unknown as Promise<any>,
                );
              }

              const results = await Promise.all(queries);

              // Combine results from queries
              results.forEach((result) => {
                if (result.data) {
                  allCustomers.push(...result.data);
                }
              });

              // Remove duplicates by id and combine with existing customers from RUT function
              const existingIds = new Set(customers.map((c) => c.id));
              allCustomers.forEach((customer: any) => {
                if (!existingIds.has(customer.id)) {
                  customers.push(customer);
                  existingIds.add(customer.id);
                }
              });

              // Limit to 20 total results
              customers = customers.slice(0, 20);
              logger.debug("Found customers using fallback method", {
                count: customers.length,
              });
            } catch (fallbackError: any) {
              logger.error("Fallback search also failed", fallbackError);
              error = fallbackError;
            }
          }

          if (error) {
            logger.error("Error searching customers", error);
            throw error;
          }

          logger.debug("Found customers", { count: customers.length });

          return createApiSuccessResponse(customers || [], { requestId });
        } catch (error) {
          if (error instanceof RateLimitError) {
            logger.warn("Rate limit exceeded for customer search", {
              error: error.message,
            });
            return NextResponse.json({ error: error.message }, { status: 429 });
          }
          const err =
            error instanceof Error ? error : new Error(String(error));
          logger.error("Error in customer search API", err);
          return createApiErrorResponse(err, { requestId });
        }
      },
    );
  } catch (error) {
    // Catch any errors from withRateLimit itself (e.g., RateLimitError thrown before try-catch)
    if (error instanceof RateLimitError) {
      logger.warn("Rate limit exceeded", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    // Log and return error response for any other unexpected errors
    logger.error(
      "Unexpected error in GET handler",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
