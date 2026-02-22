import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { EmailNotificationService } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/cron/appointment-reminders
 * Triggered by Vercel Cron. Sends 24h reminder emails for appointments tomorrow.
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

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: appointments } = await supabase
      .from("appointments")
      .select(
        `
        id,
        appointment_date,
        appointment_time,
        status,
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
      .eq("appointment_date", tomorrowStr)
      .in("status", ["scheduled", "confirmed"]);

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No appointments to remind",
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

      const branch = apt.branch as { name?: string } | null;
      const timeStr =
        typeof apt.appointment_time === "string"
          ? apt.appointment_time.substring(0, 5)
          : apt.appointment_time;

      const appointmentData = {
        id: apt.id,
        customer_name: customerName,
        customer_first_name: customer?.first_name || guestFirst || "Cliente",
        customer_email: customerEmail,
        date: apt.appointment_date,
        time: timeStr,
        branch_name: branch?.name || "Nuestra Óptica",
      };

      const result = await EmailNotificationService.sendAppointmentReminder(
        appointmentData,
        apt.organization_id as string | undefined,
      );

      if (result.success) totalSent++;
    }

    logger.info("Appointment reminders cron completed", {
      total: appointments.length,
      sent: totalSent,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment reminders sent",
      sent: totalSent,
    });
  } catch (error) {
    logger.error("Appointment reminders cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
