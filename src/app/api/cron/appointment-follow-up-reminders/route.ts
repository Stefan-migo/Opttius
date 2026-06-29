import { NextRequest, NextResponse } from "next/server";

import { sendAppointmentFollowUpReminder } from "@/lib/email/templates/optica";
import { appLogger as logger } from "@/lib/logger";
import { createCronClient } from "@/utils/supabase/cron";

/**
 * GET /api/cron/appointment-follow-up-reminders
 * Triggered by Vercel Cron. Sends follow-up reminder emails for appointments
 * with "Requiere Seguimiento" where follow_up_date is in 7 days.
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
    const supabase = createCronClient();

    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const targetDateStr = in7Days.toISOString().split("T")[0];

    const { data: appointments } = await supabase
      .from("appointments")
      .select(
        `
        id,
        follow_up_date,
        follow_up_required,
        customer_id,
        guest_email,
        guest_first_name,
        guest_last_name,
        branch_id,
        organization_id,
        branch:branches(id, name, organization_id),
        customer:customers(id, first_name, last_name, email)
      `,
      )
      .eq("follow_up_required", true)
      .eq("follow_up_date", targetDateStr);

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No follow-up reminders to send",
        sent: 0,
      });
    }

    let totalSent = 0;

    for (const apt of appointments) {
      const customerEmail =
        (apt.customer as { email?: string } | null)?.email ||
        (apt as { guest_email?: string }).guest_email;

      if (!customerEmail) continue;

      const customer = apt.customer as {
        first_name?: string;
        last_name?: string;
      } | null;
      const guestFirst = (apt as { guest_first_name?: string })
        .guest_first_name;
      const guestLast = (apt as { guest_last_name?: string }).guest_last_name;

      const customerName = customer
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
          "Cliente"
        : `${guestFirst || ""} ${guestLast || ""}`.trim() || "Cliente";

      const branch = apt.branch as {
        name?: string;
        phone?: string;
        email?: string;
      } | null;
      const followUpDate =
        typeof apt.follow_up_date === "string"
          ? apt.follow_up_date
          : apt.follow_up_date?.toISOString?.()?.split("T")[0] || "";

      const appointmentData = {
        id: apt.id,
        customer_name: customerName,
        customer_first_name: customer?.first_name || guestFirst || "Cliente",
        customer_email: customerEmail,
        follow_up_date: followUpDate,
        branch_name: branch?.name || "Nuestra Óptica",
        branch_phone: branch?.phone || "",
        branch_email: branch?.email || "",
      };

      const result = await sendAppointmentFollowUpReminder(
        appointmentData,
        apt.organization_id as string | undefined,
      );

      if (result.success) totalSent++;
    }

    logger.info("Appointment follow-up reminders cron completed", {
      total: appointments.length,
      sent: totalSent,
    });

    return NextResponse.json({
      success: true,
      message: "Follow-up reminders sent",
      sent: totalSent,
    });
  } catch (error) {
    logger.error("Appointment follow-up reminders cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
