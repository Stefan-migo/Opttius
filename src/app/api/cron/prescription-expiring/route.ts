import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { sendPrescriptionExpiring } from "@/lib/email/templates/optica";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/cron/prescription-expiring
 * Triggered by Vercel Cron. Sends prescription expiring emails for prescriptions
 * where expiration_date is in 30 days. Uses each prescription's specific expiration_date.
 * Runs daily at 6:00 UTC.
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

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const targetDateStr = in30Days.toISOString().split("T")[0];

    const { data: prescriptions } = await supabase
      .from("prescriptions")
      .select(
        `
        id,
        prescription_number,
        prescription_date,
        expiration_date,
        customer_id,
        organization_id,
        branch_id,
        customer:customers(id, first_name, last_name, email),
        branch:branches(name, phone, email, address_line_1)
      `,
      )
      .eq("expiration_date", targetDateStr)
      .eq("is_active", true);

    if (!prescriptions || prescriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No prescriptions expiring soon",
        sent: 0,
      });
    }

    let totalSent = 0;

    for (const rx of prescriptions) {
      const customer = rx.customer as {
        first_name?: string;
        last_name?: string;
        email?: string;
      } | null;

      const customerEmail = customer?.email;
      if (!customerEmail) continue;

      const customerName =
        `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
        "Cliente";

      const branch = rx.branch as {
        name?: string;
        phone?: string;
        email?: string;
        address_line_1?: string;
      } | null;

      const expiryDateStr =
        typeof rx.expiration_date === "string"
          ? rx.expiration_date
          : rx.expiration_date?.toISOString?.()?.split("T")[0] || "";
      const prescriptionDateStr =
        typeof rx.prescription_date === "string"
          ? rx.prescription_date
          : rx.prescription_date?.toISOString?.()?.split("T")[0] || "";

      const prescriptionData = {
        id: rx.id,
        customer_name: customerName,
        customer_first_name: customer?.first_name || "Cliente",
        customer_email: customerEmail,
        prescription_number: rx.prescription_number || `REC-${String(rx.id).slice(0, 8)}`,
        date: prescriptionDateStr,
        expiry_date: expiryDateStr,
        branch_name: branch?.name || "Nuestra Óptica",
        branch_address: branch?.address_line_1 || "",
        branch_phone: branch?.phone || "",
        branch_email: branch?.email || "",
      };

      const result = await sendPrescriptionExpiring(
        prescriptionData,
        rx.organization_id as string | undefined,
      );

      if (result.success) totalSent++;
    }

    logger.info("Prescription expiring cron completed", {
      total: prescriptions.length,
      sent: totalSent,
    });

    return NextResponse.json({
      success: true,
      message: "Prescription expiring emails sent",
      sent: totalSent,
    });
  } catch (error) {
    logger.error("Prescription expiring cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
