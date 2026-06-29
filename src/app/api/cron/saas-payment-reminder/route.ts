import { NextRequest, NextResponse } from "next/server";

import { sendSaaSPaymentReminder } from "@/lib/email/templates/saas";
import { appLogger as logger } from "@/lib/logger";
import { createCronClient } from "@/utils/supabase/cron";

/**
 * GET /api/cron/saas-payment-reminder
 * Triggered by Vercel Cron. Sends payment reminder emails for subscriptions
 * with status past_due. Runs daily at 7:00 UTC.
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

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      success: true,
      message: "Resend not configured",
      sent: 0,
    });
  }

  try {
    const supabase = createCronClient();

    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("id, organization_id, current_period_end, current_period_start")
      .eq("status", "past_due");

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No past_due subscriptions",
        sent: 0,
      });
    }

    let totalSent = 0;

    for (const sub of subscriptions) {
      try {
        const { data: org } = await supabase
          .from("organizations")
          .select("id, name, owner_id")
          .eq("id", sub.organization_id)
          .single();

        if (!org?.owner_id) continue;

        const { data: owner } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", org.owner_id)
          .single();

        if (!owner?.email) continue;

        const dueDate = sub.current_period_end
          ? new Date(sub.current_period_end)
          : new Date();

        const result = await sendSaaSPaymentReminder({
          organization_id: sub.organization_id,
          organization_name: org.name || "Tu organización",
          amount: 0,
          currency: "CLP",
          invoice_number: "",
          invoice_date: sub.current_period_start?.split("T")[0] || "",
          due_date: dueDate.toLocaleDateString("es-CL"),
          status: "pending",
          payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/billing`,
          admin_email: owner.email,
        });

        if (result.success) totalSent++;
      } catch (emailErr) {
        logger.warn("Failed to send payment reminder", {
          subscriptionId: sub.id,
          error: emailErr,
        });
      }
    }

    logger.info("SaaS payment reminder cron completed", {
      total: subscriptions.length,
      sent: totalSent,
    });

    return NextResponse.json({
      success: true,
      message: "Payment reminder emails sent",
      sent: totalSent,
    });
  } catch (error) {
    logger.error("SaaS payment reminder cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
