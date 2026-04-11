/**
 * GET /api/admin/saas-management/new-users-flow/stats
 * Stats for new-users-flow dashboard (root only)
 */
import { NextRequest, NextResponse } from "next/server";

import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const now = new Date();
    const expiringEnd = new Date(now);
    expiringEnd.setDate(expiringEnd.getDate() + 2);

    const [
      pendingRes,
      approvedRes,
      demoOrgsRes,
      convertedRes,
      totalApprovedRes,
      expiringRes,
      stageCounts,
    ] = await Promise.all([
      supabase
        .from("demo_requests")
        .select("id", { count: "exact", head: true })
        .eq("funnel_stage", "pending"),
      supabase
        .from("demo_requests")
        .select("id", { count: "exact", head: true })
        .eq("funnel_stage", "approved")
        .gte("reviewed_at", monthStart.toISOString()),
      supabase
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .contains("metadata", { is_demo: true }),
      supabase
        .from("demo_requests")
        .select("id", { count: "exact", head: true })
        .eq("funnel_stage", "converted"),
      supabase
        .from("demo_requests")
        .select("id", { count: "exact", head: true })
        .in("funnel_stage", [
          "approved",
          "demo_expiring",
          "demo_expired",
          "meeting_scheduled",
          "post_meeting",
          "negotiation",
          "migration",
          "converted",
        ]),
      supabase
        .from("demo_requests")
        .select("id", { count: "exact", head: true })
        .in("funnel_stage", ["approved", "demo_expiring"])
        .gte("demo_expires_at", now.toISOString())
        .lte("demo_expires_at", expiringEnd.toISOString()),
      supabase
        .from("demo_requests")
        .select("funnel_stage")
        .in("funnel_stage", [
          "pending",
          "approved",
          "demo_expiring",
          "demo_expired",
          "meeting_scheduled",
          "post_meeting",
          "negotiation",
          "migration",
          "converted",
          "rejected",
          "lost",
        ]),
    ]);

    const totalApproved = totalApprovedRes.count ?? 0;
    const totalConverted = convertedRes.count ?? 0;
    const conversionRate =
      totalApproved > 0
        ? Math.round((totalConverted / totalApproved) * 100)
        : 0;

    const stageMap: Record<string, number> = {};
    for (const row of stageCounts.data ?? []) {
      const s = row.funnel_stage as string;
      stageMap[s] = (stageMap[s] ?? 0) + 1;
    }

    return NextResponse.json({
      pendingRequests: pendingRes.count ?? 0,
      approvedThisMonth: approvedRes.count ?? 0,
      activeDemos: demoOrgsRes.count ?? 0,
      conversionRate,
      totalConverted,
      totalApproved,
      expiringSoon: expiringRes.count ?? 0,
      byStage: stageMap,
    });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    logger.error("Error in GET new-users-flow stats", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
