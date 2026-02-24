import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/admin/saas-management/email-events
 * Returns recent email events from Resend webhooks for the History tab.
 * Root/dev only.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);

    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const eventType = searchParams.get("event_type") || "";

    let query = supabase
      .from("email_send_events")
      .select("id, email_id, event_type, recipient, subject, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventType && eventType !== "all") {
      query = query.eq("event_type", eventType);
    }

    const { data: events, error } = await query;

    if (error) {
      logger.error("Error fetching email events", { error });
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 },
      );
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json(
        { error: err.message || "Unauthorized" },
        { status: err.statusCode || 401 },
      );
    }
    logger.error("Error in email events GET", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
