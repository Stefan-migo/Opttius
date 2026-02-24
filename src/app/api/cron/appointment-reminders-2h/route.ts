import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { sendAppointmentReminder2h } from "@/lib/email/templates/optica";
import { sendAppointmentReminderWhatsApp } from "@/lib/whatsapp/notifications-b2b";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/cron/appointment-reminders-2h
 * Triggered by Vercel Cron. Sends 2h reminder emails for appointments in ~2 hours.
 * Runs every hour. Finds appointments where date+time is approximately 2h from now.
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
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const targetDateStr = in2h.toISOString().split("T")[0];
    const targetHour = in2h.getHours();
    const timeStart = `${String(targetHour).padStart(2, "0")}:00:00`;
    const timeEnd = `${String(targetHour).padStart(2, "0")}:59:59`;

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
        guest_phone,
        guest_first_name,
        guest_last_name,
        branch_id,
        organization_id,
        branch:branches(id, name, organization_id),
        customer:customers(id, first_name, last_name, email, phone, preferred_contact_method)
      `,
      )
      .eq("appointment_date", targetDateStr)
      .gte("appointment_time", timeStart)
      .lte("appointment_time", timeEnd)
      .in("status", ["scheduled", "confirmed"]);

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No appointments to remind (2h)",
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
        phone?: string;
        preferred_contact_method?: string;
      } | null;
      const guestFirst = (apt as { guest_first_name?: string }).guest_first_name;
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

      const result = await sendAppointmentReminder2h(
        appointmentData,
        apt.organization_id as string | undefined,
      );

      if (result.success) totalSent++;

      const guestPhone = (apt as { guest_phone?: string }).guest_phone;
      const phone = customer?.phone || guestPhone;
      const preferWhatsApp =
        customer?.preferred_contact_method === "whatsapp" ||
        (!customerEmail && !!phone);
      if (phone && preferWhatsApp) {
        const msg = `Recordatorio: Tu cita en ${appointmentData.branch_name} es hoy a las ${appointmentData.time}. Te esperamos.`;
        const waSent = await sendAppointmentReminderWhatsApp(phone, msg);
        if (waSent) totalSent++;
      }
    }

    logger.info("Appointment reminders 2h cron completed", {
      total: appointments.length,
      sent: totalSent,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment reminders (2h) sent",
      sent: totalSent,
    });
  } catch (error) {
    logger.error("Appointment reminders 2h cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
