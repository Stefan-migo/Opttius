import { NextRequest } from "next/server";

import { parseAnalyticsPeriod } from "@/lib/analytics/analytics-service";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import { createApiErrorResponse, createApiSuccessResponse } from "@/lib/api/response";
import { computeDashboardAnalytics } from "@/lib/api/services/dashboardAnalyticsService";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.debug("Analytics Dashboard API called", { requestId });

    const { client: supabase, getUser } = await createClientFromRequest(request);

    // Auth check
    const { data: userData, error: userError } = await getUser();
    const user = userData?.user;
    if (userError || !userData?.user) {
      return createApiErrorResponse(new AuthenticationError("Unauthorized"));
    }

    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
    if (!isAdmin) {
      return createApiErrorResponse(new AuthorizationError("Admin access required"));
    }

    // Tier feature check
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    if (adminUser?.organization_id) {
      const { validateFeature } = await import("@/lib/saas/tier-validator");
      const hasAdvancedAnalytics = await validateFeature(adminUser.organization_id, "advanced_analytics");
      if (!hasAdvancedAnalytics) {
        return createApiErrorResponse(
          new AuthorizationError("Analíticas avanzadas no están incluidas en tu plan. Actualiza a Pro o Premium."),
        );
      }
    }

    // Branch context
    const branchContext = await getBranchContext(request, user.id);
    const { searchParams } = new URL(request.url);
    const period = parseAnalyticsPeriod(searchParams);

    // Date ranges
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();
    const periodStartStr = getLocalDateString(startDate);
    const periodEndStr = getLocalDateString(endDate);
    const prevPeriodStart = new Date(startDate);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - period);

    // Org branch IDs for global view
    let orgBranchIds: string[] = [];
    if (branchContext.isSuperAdmin && !branchContext.branchId && branchContext.organizationId) {
      const { data: branches } = await supabase
        .from("branches")
        .select("id")
        .eq("organization_id", branchContext.organizationId);
      orgBranchIds = (branches || []).map((b: { id: string }) => b.id);
    }

    const analytics = await computeDashboardAnalytics({
      orgId: branchContext.organizationId,
      branchId: branchContext.branchId,
      isSuperAdmin: branchContext.isSuperAdmin,
      organizationId: branchContext.organizationId,
      orgBranchIds,
      period,
      startDate,
      endDate,
      startStr,
      endStr,
      periodStartStr,
      periodEndStr,
      prevPeriodStartStr: getLocalDateString(prevPeriodStart),
    });

    logger.info("Analytics calculated successfully", { period, branchId: branchContext.branchId, requestId });
    return createApiSuccessResponse({ analytics }, { requestId });
  } catch (error) {
    logger.error("Analytics API error:", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Failed to fetch analytics data"),
      { requestId },
    );
  }
}
