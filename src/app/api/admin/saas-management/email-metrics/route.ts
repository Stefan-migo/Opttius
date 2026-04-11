import { NextRequest, NextResponse } from "next/server";

import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

/**
 * GET /api/admin/saas-management/email-metrics
 * Returns aggregated email metrics from email_send_events (Resend webhooks).
 * Root/dev only.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);

    const supabase = createServiceRoleClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString();

    const { data: events, error } = await supabase
      .from("email_send_events")
      .select("event_type, email_id")
      .gte("created_at", fromDate);

    if (error) {
      logger.error("Error fetching email metrics", { error });
      return NextResponse.json(
        { error: "Failed to fetch metrics" },
        { status: 500 },
      );
    }

    const delivered = new Set<string>();
    const opened = new Set<string>();
    const clicked = new Set<string>();

    for (const e of events || []) {
      const id = e.email_id || "";
      if (e.event_type === "email.delivered") delivered.add(id);
      if (e.event_type === "email.opened") opened.add(id);
      if (e.event_type === "email.clicked") clicked.add(id);
    }

    const totalDelivered = delivered.size;
    const totalOpened = opened.size;
    const totalClicked = clicked.size;
    const openRate =
      totalDelivered > 0
        ? Math.round((totalOpened / totalDelivered) * 1000) / 10
        : 0;
    const clickRate =
      totalDelivered > 0
        ? Math.round((totalClicked / totalDelivered) * 1000) / 10
        : 0;

    return NextResponse.json({
      totalDelivered,
      totalOpened,
      totalClicked,
      openRate,
      clickRate,
      period: "30d",
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json(
        { error: err.message || "Unauthorized" },
        { status: err.statusCode || 401 },
      );
    }
    logger.error("Error in email metrics GET", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
