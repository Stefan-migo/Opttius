/**
 * Customers Analytics service — POST analytics summary endpoint.
 * Extracted from customersService.ts to reduce file size. No behavioral changes.
 */
import { NextRequest } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import { createApiSuccessResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/lib/supabase/server";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export async function handleCustomersAnalytics(
  request: NextRequest,
  _requestId: string,
) {
  logger.info("Customers Analytics API called");
  const { client: rawClient, getUser } = await createClientFromRequest(request);
  const supabase = rawClient as unknown;
  const user = (await getUser()).data?.user as { id: string } | undefined;
  if (!user) throw new AuthenticationError("Unauthorized");

  const { data: isAdminResult } = (await supabase.rpc("is_admin", {
    user_id: user.id,
  } as IsAdminParams)) as { data: IsAdminResult | null };
  if (!isAdminResult) throw new AuthorizationError("Admin access required");

  const branchContext = await getBranchContext(request, user.id, supabase);

  const applyBranchFilter = (query: unknown) =>
    addBranchFilter(
      query,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

  const { count: totalCount } = await applyBranchFilter(
    supabase.from("customers").select("*", { count: "exact", head: true }),
  );
  const { count: activeCount } = await applyBranchFilter(
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  );
  const { count: recentCount } = await applyBranchFilter(
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      ),
  );

  return createApiSuccessResponse({
    summary: {
      totalCustomers: totalCount || 0,
      activeCustomers: activeCount || totalCount || 0,
      newCustomersThisMonth: recentCount || 0,
    },
  });
}
