import { NextRequest, NextResponse } from "next/server";

import { sendDemoExpiredEmail } from "@/lib/email/templates/saas";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * GET /api/cron/demo-expired-followup
 * Triggered by Vercel Cron daily at 08:30 UTC.
 * Sends "demo expired" emails to demo_requests with funnel_stage in (approved, demo_expiring)
 * and demo_expires_at < NOW().
 * Updates funnel_stage to demo_expired and last_email_sent.
 * Requires CRON_SECRET for authorization.
 */
export const dynamic = "force-dynamic";

async function getDefaultMeetingUrl(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<string> {
  const { data } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_key", "demo_funnel_meeting_url")
    .is("organization_id", null)
    .is("branch_id", null)
    .maybeSingle();
  const val = data?.config_value;
  if (typeof val === "string" && val.startsWith("http")) return val;
  return process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/contacto`
    : "https://www.opttius.cl/contacto";
}

export async function GET(request: NextRequest) {
  if (
    process.env.CRON_SECRET &&
    request.headers.get("authorization") !==
      `Bearer ${process.env.CRON_SECRET}` &&
    request.headers.get("x-cron-secret") !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    const { data: requests, error } = await supabase
      .from("demo_requests")
      .select("id, email, full_name, meeting_url")
      .in("funnel_stage", ["approved", "demo_expiring"])
      .lt("demo_expires_at", now);

    if (error) {
      logger.error("Demo expired followup cron: fetch failed", { error });
      return NextResponse.json(
        { error: "Failed to fetch", details: error.message },
        { status: 500 },
      );
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired demos to follow up",
        sent: 0,
      });
    }

    const defaultMeetingUrl = await getDefaultMeetingUrl(supabase);
    let sent = 0;

    for (const req of requests) {
      const meetingUrl = (req.meeting_url as string) || defaultMeetingUrl;

      const result = await sendDemoExpiredEmail({
        email: req.email as string,
        fullName: (req.full_name as string) || null,
        meetingUrl,
      });

      if (result.success) {
        sent++;
        await supabase
          .from("demo_requests")
          .update({
            funnel_stage: "demo_expired",
            last_email_sent: "demo_expired",
            last_email_sent_at: new Date().toISOString(),
            last_contact_at: new Date().toISOString(),
          })
          .eq("id", req.id);
      } else {
        logger.warn("Demo expired email failed", {
          id: req.id,
          error: result.error,
        });
      }
    }

    logger.info("Demo expired followup cron completed", {
      total: requests.length,
      sent,
    });

    return NextResponse.json({
      success: true,
      message: "Demo expired followup emails sent",
      sent,
      total: requests.length,
    });
  } catch (err) {
    logger.error("Demo expired followup cron error", { error: err });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
