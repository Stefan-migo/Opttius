/**
 * GET /api/cron/cleanup-pending-payments
 * Triggered by Vercel Cron. Marks payments with status=pending and created_at > 24h ago.
 * Sends saas_payment_failed email to org owner when applicable.
 * Requires CRON_SECRET for authorization.
 */
import { NextRequest, NextResponse } from "next/server";

import { sendSaaSPaymentFailed } from "@/lib/email/templates/saas";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      request.headers.get("x-cron-secret") !== process.env.CRON_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    const cutoffIso = cutoff.toISOString();

    const { data: updated, error } = await supabase
      .from("payments")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "pending")
      .lt("created_at", cutoffIso)
      .select("id, organization_id, amount, currency, created_at");

    if (error) {
      logger.error("Cleanup pending payments failed", error);
      return NextResponse.json(
        { error: "Cleanup failed", details: error.message },
        { status: 500 },
      );
    }

    let emailsSent = 0;
    if (updated && updated.length > 0 && process.env.RESEND_API_KEY) {
      for (const payment of updated) {
        try {
          const { data: org } = await supabase
            .from("organizations")
            .select("id, name, owner_id")
            .eq("id", payment.organization_id)
            .single();

          if (!org?.owner_id) continue;

          const { data: owner } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", org.owner_id)
            .single();

          if (!owner?.email) continue;

          const dueDate = new Date(payment.created_at);
          dueDate.setDate(dueDate.getDate() + 1);

          const result = await sendSaaSPaymentFailed({
            organization_id: payment.organization_id,
            organization_name: org.name || "Tu organización",
            amount: payment.amount,
            currency: payment.currency || "CLP",
            invoice_number: `PAY-${String(payment.id).slice(0, 8)}`,
            invoice_date: payment.created_at.split("T")[0],
            due_date: dueDate.toLocaleDateString("es-CL"),
            status: "failed",
            payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/billing`,
            admin_email: owner.email,
          });

          if (result.success) emailsSent++;
        } catch (emailErr) {
          logger.warn("Failed to send payment failed email", {
            paymentId: payment.id,
            error: emailErr,
          });
        }
      }
    }

    const count = updated?.length ?? 0;
    if (count > 0) {
      logger.info("Cleanup pending payments", {
        count,
        cutoff: cutoffIso,
        emailsSent,
      });
    }

    return NextResponse.json({
      success: true,
      expiredCount: count,
      emailsSent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      "Cleanup pending payments error",
      err instanceof Error ? err : new Error(msg),
    );
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
