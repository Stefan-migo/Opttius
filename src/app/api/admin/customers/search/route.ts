import { NextRequest, NextResponse } from "next/server";

import { RateLimitError } from "@/lib/api/errors";
import { createApiErrorResponse, createApiSuccessResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import { rateLimitConfigs, withRateLimit } from "@/lib/rate-limiting";
import { formatRUT, normalizeRUT } from "@/lib/utils/rut";
import { createClientFromRequest } from "@/utils/supabase/server";

import { buildOrQuery, buildSearchQuery, getRpcBranchParams, resolveBranchContext, searchByRut } from "../searchHelpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    return await (withRateLimit(rateLimitConfigs.search) as unknown)(request, async () => {
      try {
        const { client: supabase, getUser } = await createClientFromRequest(request);
        const { data: userData } = await getUser();
        const user = userData?.user as { id: string } | undefined;
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
        if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

        const { branchContext, orgBranchIds, fieldOperationId, operativoBranchId } = await resolveBranchContext(request, user, supabase);
        const { rpcBranchId, rpcBranchIds } = getRpcBranchParams(branchContext, orgBranchIds, fieldOperationId, operativoBranchId);
        const buildFilteredCustomersQuery = buildSearchQuery(supabase, branchContext, orgBranchIds, fieldOperationId, operativoBranchId);

        const query = (request.nextUrl.searchParams.get("q") || "").trim();
        if (query.length < 1) return createApiSuccessResponse([], { requestId });

        const normalizedSearchTerm = normalizeRUT(query);
        const formattedSearchTerm = formatRUT(normalizedSearchTerm);
        const isRutSearch = /^[\d.\-Kk\s]+$/.test(query) && normalizedSearchTerm.length >= 2;

        let customers: unknown[] = [];

        // Approach 1: RUT search via SQL function
        if (isRutSearch && !fieldOperationId) {
          const rutCustomers = await searchByRut(supabase, query, normalizedSearchTerm, rpcBranchId, rpcBranchIds);
          customers.push(...rutCustomers);
        }

        // Approach 2: Standard ilike search
        try {
          const orQuery = buildOrQuery(query, normalizedSearchTerm, formattedSearchTerm, isRutSearch);
          const result = await buildFilteredCustomersQuery().or(orQuery).limit(20);

          const existingIds = new Set(customers.map((c: unknown) => c.id));
          (result.data || []).forEach((c: unknown) => { if (!existingIds.has(c.id)) { customers.push(c); existingIds.add(c.id); } });

          if (result.error) throw result.error;
        } catch (orError: unknown) {
          logger.warn("OR query failed, trying alternative approach", orError);
          try {
            const searchPattern = `%${query}%`;
            const normalizedPattern = `%${normalizedSearchTerm}%`;
            const formattedPattern = `%${formattedSearchTerm}%`;

            const queries: Promise<unknown>[] = [
              buildFilteredCustomersQuery().or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`).limit(20) as unknown,
              buildFilteredCustomersQuery().ilike("email", searchPattern).limit(20) as unknown,
              buildFilteredCustomersQuery().ilike("phone", searchPattern).limit(20) as unknown,
            ];
            if (isRutSearch) {
              queries.push(buildFilteredCustomersQuery().ilike("rut", searchPattern).limit(20) as unknown);
              queries.push(buildFilteredCustomersQuery().ilike("rut", normalizedPattern).limit(20) as unknown);
              queries.push(buildFilteredCustomersQuery().ilike("rut", formattedPattern).limit(20) as unknown);
            } else {
              queries.push(buildFilteredCustomersQuery().ilike("rut", searchPattern).limit(20) as unknown);
            }

            const results = await Promise.all(queries);
            const existingIds = new Set(customers.map((c: unknown) => c.id));
            results.forEach((r: unknown) => { if (r.data) r.data.forEach((c: unknown) => { if (!existingIds.has(c.id)) { customers.push(c); existingIds.add(c.id); } }); });
            customers = customers.slice(0, 20);
          } catch (fallbackError: unknown) {
            logger.error("Fallback search also failed", fallbackError);
            throw fallbackError;
          }
        }

        return createApiSuccessResponse(customers, { requestId });
      } catch (error) {
        if (error instanceof RateLimitError) {
          return NextResponse.json({ error: error.message }, { status: 429 });
        }
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Error in customer search API", err);
        return createApiErrorResponse(err, { requestId });
      }
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    logger.error("Unexpected error in GET handler", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
