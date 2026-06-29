import { NextRequest, NextResponse } from "next/server";

import { sendDemoExpiringEmail } from "@/lib/email/templates/saas";
import { appLogger as logger } from "@/lib/logger";
import { createCronClient } from "@/utils/supabase/cron";

/**
 * GET /api/cron/demo-expiring
 * Triggered by Vercel Cron daily at 08:00 UTC.
 * Sends "demo expiring soon" emails to demo_requests with funnel_stage=approved
 * and demo_expires_at in the next 2 days.
 * Updates funnel_stage to demo_expiring and last_email_sent.
 * Requires CRON_SECRET for authorization.
 */
export const dynamic = "force-dynamic";

async function getDefaultMeetingUrl(
  supabase: ReturnType<typeof createCronClient>,
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
  const fallback = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/contacto`
    : "https://www.opttius.cl/contacto";
  return fallback;
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
    const supabase = createCronClient();
    const now = new Date();
    const expiringEnd = new Date(now);
    expiringEnd.setDate(expiringEnd.getDate() + 2);

    const { data: requests, error } = await supabase
      .from("demo_requests")
      .select("id, email, full_name, demo_expires_at, meeting_url")
      .eq("funnel_stage", "approved")
      .gte("demo_expires_at", now.toISOString())
      .lte("demo_expires_at", expiringEnd.toISOString());

    if (error) {
      logger.error("Demo expiring cron: fetch failed", { error });
      return NextResponse.json(
        { error: "Failed to fetch", details: error.message },
        { status: 500 },
      );
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No demos expiring soon",
        sent: 0,
      });
    }

    const defaultMeetingUrl = await getDefaultMeetingUrl(supabase);
    let sent = 0;

    for (const req of requests) {
      const expiresAt = req.demo_expires_at
        ? new Date(req.demo_expires_at)
        : null;
      const daysRemaining = expiresAt
        ? Math.max(
            1,
            Math.ceil(
              (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
        : 1;

      const meetingUrl = (req.meeting_url as string) || defaultMeetingUrl;

      const result = await sendDemoExpiringEmail({
        email: req.email as string,
        fullName: (req.full_name as string) || null,
        daysRemaining,
        meetingUrl,
      });

      if (result.success) {
        sent++;
        await supabase
          .from("demo_requests")
          .update({
            funnel_stage: "demo_expiring",
            last_email_sent: "demo_expiring",
            last_email_sent_at: new Date().toISOString(),
            last_contact_at: new Date().toISOString(),
          })
          .eq("id", req.id);
      } else {
        logger.warn("Demo expiring email failed", {
          id: req.id,
          error: result.error,
        });
      }
    }

    logger.info("Demo expiring cron completed", {
      total: requests.length,
      sent,
    });

    return NextResponse.json({
      success: true,
      message: "Demo expiring emails sent",
      sent,
      total: requests.length,
    });
  } catch (err) {
    logger.error("Demo expiring cron error", { error: err });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
