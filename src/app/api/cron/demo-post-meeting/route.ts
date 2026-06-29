import { NextRequest, NextResponse } from "next/server";

import { sendDemoPostMeetingFollowupEmail } from "@/lib/email/templates/saas";
import { appLogger as logger } from "@/lib/logger";
import { createCronClient } from "@/utils/supabase/cron";

/**
 * GET /api/cron/demo-post-meeting
 * Triggered by Vercel Cron daily at 09:00 UTC.
 * Sends followup emails to demo_requests with funnel_stage=post_meeting
 * and meeting_completed_at + 3 days <= NOW(), where last_email_sent != 'post_meeting_followup'.
 * Updates last_email_sent to post_meeting_followup.
 * Requires CRON_SECRET for authorization.
 */
export const dynamic = "force-dynamic";

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
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: requests, error } = await supabase
      .from("demo_requests")
      .select("id, email, full_name")
      .eq("funnel_stage", "post_meeting")
      .not("meeting_completed_at", "is", null)
      .lte("meeting_completed_at", threeDaysAgo.toISOString())
      .or("last_email_sent.is.null,last_email_sent.neq.post_meeting_followup");

    if (error) {
      logger.error("Demo post-meeting cron: fetch failed", { error });
      return NextResponse.json(
        { error: "Failed to fetch", details: error.message },
        { status: 500 },
      );
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No post-meeting followups to send",
        sent: 0,
      });
    }

    let sent = 0;

    for (const req of requests) {
      const result = await sendDemoPostMeetingFollowupEmail({
        email: req.email as string,
        fullName: (req.full_name as string) || null,
      });

      if (result.success) {
        sent++;
        await supabase
          .from("demo_requests")
          .update({
            last_email_sent: "post_meeting_followup",
            last_email_sent_at: new Date().toISOString(),
            last_contact_at: new Date().toISOString(),
          })
          .eq("id", req.id);
      } else {
        logger.warn("Demo post-meeting followup email failed", {
          id: req.id,
          error: result.error,
        });
      }
    }

    logger.info("Demo post-meeting cron completed", {
      total: requests.length,
      sent,
    });

    return NextResponse.json({
      success: true,
      message: "Post-meeting followup emails sent",
      sent,
      total: requests.length,
    });
  } catch (err) {
    logger.error("Demo post-meeting cron error", { error: err });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
