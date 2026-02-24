import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { sendSaaSTrialEnding } from "@/lib/email/templates/saas";
import { appLogger as logger } from "@/lib/logger";

const DAYS_BEFORE = parseInt(
  process.env.SAAS_TRIAL_ENDING_DAYS_BEFORE || "3",
  10,
);

/**
 * GET /api/cron/saas-trial-ending
 * Triggered by Vercel Cron. Sends trial ending emails for subscriptions
 * expiring in the next N days (configurable via SAAS_TRIAL_ENDING_DAYS_BEFORE).
 * Runs daily at 6:30 UTC.
 *
 * Requires CRON_SECRET for authorization.
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    request.headers.get("x-cron-secret") !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const futureEnd = new Date(todayStart);
    futureEnd.setDate(futureEnd.getDate() + DAYS_BEFORE);

    const todayStr = todayStart.toISOString().split("T")[0];
    const futureStr = futureEnd.toISOString().split("T")[0];

    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select(
        `
        id,
        organization_id,
        trial_ends_at,
        current_period_start,
        current_period_end
      `,
      )
      .eq("status", "trialing")
      .not("trial_ends_at", "is", null)
      .gte("trial_ends_at", todayStr)
      .lte("trial_ends_at", futureStr);

    if (subError) {
      logger.error("Error fetching trialing subscriptions", subError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 },
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No trials ending soon",
        sent: 0,
      });
    }

    let totalSent = 0;

    for (const sub of subscriptions) {
      const trialEndsAt = sub.trial_ends_at;
      if (!trialEndsAt) continue;

      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, owner_id")
        .eq("id", sub.organization_id)
        .single();

      if (!org?.owner_id) {
        logger.warn("Organization has no owner, skipping trial ending email", {
          organizationId: sub.organization_id,
        });
        continue;
      }

      const { data: owner } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("id", org.owner_id)
        .single();

      const adminEmail = owner?.email;
      if (!adminEmail) {
        logger.warn("Owner has no email, skipping trial ending email", {
          organizationId: sub.organization_id,
        });
        continue;
      }

      const trialEndDate = new Date(trialEndsAt);
      const daysRemaining = Math.ceil(
        (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const trialData = {
        organization_id: sub.organization_id,
        organization_name: org.name || "Tu organización",
        trial_start_date:
          sub.current_period_start?.split("T")[0] ||
          trialEndDate.toISOString().split("T")[0],
        trial_end_date: trialEndDate.toLocaleDateString("es-CL", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        days_remaining: Math.max(0, daysRemaining),
        plan_name: "Trial",
        admin_email: adminEmail,
      };

      const result = await sendSaaSTrialEnding(trialData);

      if (result.success) {
        totalSent++;
      } else {
        logger.warn("Failed to send trial ending email", {
          organizationId: sub.organization_id,
          error: result.error,
        });
      }
    }

    logger.info("SaaS trial ending cron completed", {
      total: subscriptions.length,
      sent: totalSent,
      daysBefore: DAYS_BEFORE,
    });

    return NextResponse.json({
      success: true,
      message: "Trial ending emails sent",
      sent: totalSent,
    });
  } catch (error) {
    logger.error("SaaS trial ending cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
