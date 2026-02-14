import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { normalizeRUT, formatRUT } from "@/lib/utils/rut";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { RateLimitError } from "@/lib/api/errors";
import { createApiSuccessResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    return await (withRateLimit(rateLimitConfigs.search) as any)(
      request,
      async () => {
        try {
          const supabase = await createClient();

          // Check admin authorization
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
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
          const branchContext = await getBranchContext(request, user.id);

          // Build branch filter function
          const applyBranchFilter = (query: any) => {
            return addBranchFilter(
              query,
              branchContext.branchId,
              branchContext.isSuperAdmin,
              branchContext.organizationId,
            );
          };

          const searchParams = request.nextUrl.searchParams;
          const query = searchParams.get("q") || "";

          if (query.length < 1) {
            return createApiSuccessResponse([], { requestId });
          }

          // Use service role client to bypass RLS and ensure we can search all customers
          const supabaseServiceRole = createServiceRoleClient();
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
          // Note: RPC doesn't have branch context, so we'll filter results after
          if (isRutSearch) {
            try {
              logger.debug("Using RUT search function", {
                searchTerm,
                normalized: normalizedSearchTerm,
              });

              // Try with original search term (handles formatted RUTs like "12.345.678-9")
              const { data: rutCustomers1, error: rutError1 } =
                await supabaseServiceRole.rpc("search_customers_by_rut", {
                  rut_search_term: searchTerm,
                });

              // Also try with normalized term (handles unformatted RUTs like "123456789")
              const { data: rutCustomers2, error: rutError2 } =
                await supabaseServiceRole.rpc("search_customers_by_rut", {
                  rut_search_term: normalizedSearchTerm,
                });

              // Combine results and remove duplicates
              const rutCustomersMap = new Map();
              [...(rutCustomers1 || []), ...(rutCustomers2 || [])].forEach(
                (c: any) => {
                  if (!rutCustomersMap.has(c.id)) {
                    rutCustomersMap.set(c.id, c);
                  }
                },
              );
              const rutCustomers = Array.from(rutCustomersMap.values());

              if ((rutCustomers1 || rutCustomers2) && rutCustomers.length > 0) {
                // Filter by branch if not in global view
                let filteredRutCustomers = rutCustomers;
                if (branchContext.branchId) {
                  // Get customer IDs that belong to the selected branch
                  const { data: branchCustomers } = await supabaseServiceRole
                    .from("customers")
                    .select("id")
                    .eq("branch_id", branchContext.branchId);

                  const branchCustomerIds = new Set(
                    (branchCustomers || []).map((c) => c.id),
                  );
                  filteredRutCustomers = rutCustomers.filter((c: any) =>
                    branchCustomerIds.has(c.id),
                  );
                } else if (!branchContext.isSuperAdmin) {
                  // Regular admin without branch selected - no results
                  filteredRutCustomers = [];
                }

                customers.push(...filteredRutCustomers);
                logger.debug("Found customers via RUT function", {
                  count: filteredRutCustomers.length,
                });
              } else if (rutError1 || rutError2) {
                logger.warn("RUT function error", {
                  error: rutError1?.message || rutError2?.message,
                });
              }
            } catch (rpcError: any) {
              logger.debug(
                "RUT function not available, using standard search",
                {
                  error: rpcError.message,
                },
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

            const result = await applyBranchFilter(
              supabaseServiceRole
                .from("customers")
                .select("id, first_name, last_name, email, phone, rut"),
            )
              .or(orQuery)
              .limit(20);

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
            // For RUT, we need to search both formatted and normalized versions
            try {
              const searchPattern = `%${searchTerm}%`;
              const normalizedPattern = `%${normalizedSearchTerm}%`;
              const formattedPattern = `%${formattedSearchTerm}%`;

              const allCustomers: any[] = [];

              const queries = [
                applyBranchFilter(
                  supabaseServiceRole
                    .from("customers")
                    .select("id, first_name, last_name, email, phone, rut"),
                )
                  .or(
                    `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`,
                  )
                  .limit(20),
                applyBranchFilter(
                  supabaseServiceRole
                    .from("customers")
                    .select("id, first_name, last_name, email, phone, rut"),
                )
                  .ilike("email", searchPattern)
                  .limit(20),
                applyBranchFilter(
                  supabaseServiceRole
                    .from("customers")
                    .select("id, first_name, last_name, email, phone, rut"),
                )
                  .ilike("phone", searchPattern)
                  .limit(20),
              ];

              // For RUT search, try original, normalized, and formatted patterns
              // Also try the SQL function for normalized RUT search (partial matches)
              if (isRutSearch) {
                // Try SQL function first for better partial matching
                // Pass both original and normalized terms to handle all cases
                try {
                  // Try with original search term (handles formatted RUTs)
                  const { data: rutCustomers1 } = await supabaseServiceRole.rpc(
                    "search_customers_by_rut",
                    { rut_search_term: searchTerm },
                  );

                  // Also try with normalized term (handles unformatted RUTs)
                  const { data: rutCustomers2 } = await supabaseServiceRole.rpc(
                    "search_customers_by_rut",
                    { rut_search_term: normalizedSearchTerm },
                  );

                  // Combine results and remove duplicates
                  const rutCustomersMap = new Map();
                  [...(rutCustomers1 || []), ...(rutCustomers2 || [])].forEach(
                    (c: any) => {
                      if (!rutCustomersMap.has(c.id)) {
                        rutCustomersMap.set(c.id, c);
                      }
                    },
                  );
                  const rutCustomers = Array.from(rutCustomersMap.values());

                  if (rutCustomers.length > 0) {
                    // Filter by branch if not in global view
                    let filteredRutCustomers = rutCustomers;
                    if (branchContext.branchId) {
                      // Get customer IDs that belong to the selected branch
                      const { data: branchCustomers } =
                        await supabaseServiceRole
                          .from("customers")
                          .select("id")
                          .eq("branch_id", branchContext.branchId);

                      const branchCustomerIds = new Set(
                        (branchCustomers || []).map((c) => c.id),
                      );
                      filteredRutCustomers = rutCustomers.filter((c: any) =>
                        branchCustomerIds.has(c.id),
                      );
                    } else if (!branchContext.isSuperAdmin) {
                      // Regular admin without branch selected - no results
                      filteredRutCustomers = [];
                    }

                    allCustomers.push(...filteredRutCustomers);
                  }
                } catch (rpcError) {
                  logger.debug("RUT function not available in fallback");
                }

                queries.push(
                  applyBranchFilter(
                    supabaseServiceRole
                      .from("customers")
                      .select("id, first_name, last_name, email, phone, rut"),
                  )
                    .ilike("rut", searchPattern)
                    .limit(20),
                  applyBranchFilter(
                    supabaseServiceRole
                      .from("customers")
                      .select("id, first_name, last_name, email, phone, rut"),
                  )
                    .ilike("rut", normalizedPattern)
                    .limit(20),
                  applyBranchFilter(
                    supabaseServiceRole
                      .from("customers")
                      .select("id, first_name, last_name, email, phone, rut"),
                  )
                    .ilike("rut", formattedPattern)
                    .limit(20),
                );
              } else {
                // For non-RUT searches, still try RUT field with original pattern
                queries.push(
                  applyBranchFilter(
                    supabaseServiceRole
                      .from("customers")
                      .select("id, first_name, last_name, email, phone, rut"),
                  )
                    .ilike("rut", searchPattern)
                    .limit(20),
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
          logger.error("Error in customer search API", error);
          return NextResponse.json(
            {
              error: "Internal server error",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
          );
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
