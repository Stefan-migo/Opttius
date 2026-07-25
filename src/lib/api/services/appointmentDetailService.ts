/**
 * Appointment Detail Service
 * Server-side business logic for single appointment operations
 */
import { NextRequest, NextResponse } from "next/server";

import { sendAppointmentCancellation, sendAppointmentRescheduled } from "@/lib/email/templates/optica";
import { appLogger as logger } from "@/lib/logger";
import { NotificationService } from "@/lib/notifications/notification-service";
import type { Database, SupabaseClient } from "@/types/supabase";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

async function getAdminAuth(supabase: SupabaseClient<Database>) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  const { data: isAdmin } = (await supabase.rpc("is_admin", { user_id: user.id } as IsAdminParams)) as { data: IsAdminResult | null };
  if (!isAdmin) return null;
  return user;
}

async function fetchRelations(supabase: SupabaseClient<Database>, supabaseServiceRole: unknown, appointment: Record<string, unknown>) {
  const relations: Record<string, unknown> = { ...appointment };
  if (appointment.customer_id) {
    const { data: customer } = await supabase.from("customers").select("id, first_name, last_name, email, phone").eq("id", appointment.customer_id).single();
    relations.customer = customer || null;
  }
  if (appointment.assigned_to) {
    const { data: staff } = await supabase.from("profiles").select("id, first_name, last_name").eq("id", appointment.assigned_to).single();
    relations.assigned_staff = staff || null;
  }
  if (appointment.prescription_id) {
    const { data: prescription } = await supabase.from("prescriptions").select("*").eq("id", appointment.prescription_id).single();
    relations.prescription = prescription || null;
  }
  if (appointment.order_id) {
    const { data: order } = await supabase.from("orders").select("*").eq("id", appointment.order_id).single();
    relations.order = order || null;
  }
  return relations;
}

export async function getAppointment(request: NextRequest, id: string) {
  const supabase = await createClient();
  const user = await getAdminAuth(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: appointment, error } = await supabase.from("appointments").select("*").eq("id", id).single();
  if (error || !appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const appointmentWithRelations = await fetchRelations(supabase, null, appointment);
  return NextResponse.json({ appointment: appointmentWithRelations });
}

export async function updateAppointment(request: NextRequest, id: string) {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();
  const user = await getAdminAuth(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Fetch pre-update data for cancellation notification
  let appointmentBeforeCancel: unknown = null;
  if (body.status === "cancelled") {
    const { data: apt } = await supabaseServiceRole.from("appointments")
      .select("customer_id, guest_first_name, guest_last_name, guest_email, appointment_date, appointment_time, branch_id, organization_id")
      .eq("id", id).single();
    appointmentBeforeCancel = apt;
  }

  // Fetch pre-update data for reschedule notification
  let appointmentBeforeReschedule: unknown = null;
  const isReschedule = (body.appointment_date || body.appointment_time) && body.status !== "cancelled";
  if (isReschedule) {
    const { data: apt } = await supabaseServiceRole.from("appointments")
      .select("appointment_date, appointment_time, customer_id, guest_email, branch_id, organization_id")
      .eq("id", id).single();
    if (apt) {
      let customer: unknown = null;
      let branch: unknown = null;
      if (apt.customer_id) {
        const { data: c } = await supabaseServiceRole.from("customers").select("first_name, last_name, email").eq("id", apt.customer_id).single();
        customer = c;
      }
      if (apt.branch_id) {
        const { data: b } = await supabaseServiceRole.from("branches").select("name, phone, email").eq("id", apt.branch_id).single();
        branch = b;
      }
      appointmentBeforeReschedule = { ...apt, customer, branch };
    }
  }

  // Check availability for reschedule
  if (body.appointment_date || body.appointment_time || body.duration_minutes) {
    const { data: currentAppointment } = await supabaseServiceRole.from("appointments")
      .select("appointment_date, appointment_time, duration_minutes, assigned_to").eq("id", id).single();
    const { data: currentAppointmentForBranch } = await supabaseServiceRole.from("appointments")
      .select("branch_id").eq("id", id).single();

    const { data: isAvailable, error: availabilityError } = await supabaseServiceRole.rpc("check_appointment_availability", {
      p_date: body.appointment_date || currentAppointment?.appointment_date,
      p_time: body.appointment_time || currentAppointment?.appointment_time,
      p_duration_minutes: body.duration_minutes || currentAppointment?.duration_minutes || 30,
      p_appointment_id: id,
      p_staff_id: body.assigned_to || currentAppointment?.assigned_to || null,
      p_branch_id: currentAppointmentForBranch?.branch_id || null,
    });


    if (availabilityError) return NextResponse.json({ error: "Error checking availability", details: availabilityError.message }, { status: 500 });
    if (!isAvailable) return NextResponse.json({ error: "El horario seleccionado no está disponible", code: "SLOT_NOT_AVAILABLE" }, { status: 400 });
  }

  // Build update data
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const updateFields = ["appointment_date", "appointment_time", "duration_minutes", "appointment_type",
    "assigned_to", "notes", "reason", "outcome", "follow_up_required", "follow_up_date",
    "prescription_id", "order_id", "cancellation_reason"];
  for (const f of updateFields) {
    if (body[f] !== undefined) updateData[f] = body[f];
  }
  if (body.status !== undefined) {
    updateData.status = body.status;
    if (body.status === "completed") updateData.completed_at = new Date().toISOString();
    else if (body.status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
      if (body.cancellation_reason) updateData.cancellation_reason = body.cancellation_reason;
      updateData.guest_first_name = null;
      updateData.guest_last_name = null;
      updateData.guest_rut = null;
      updateData.guest_email = null;
      updateData.guest_phone = null;
    } else if (body.status === "no_show") {
      updateData.guest_first_name = null;
      updateData.guest_last_name = null;
      updateData.guest_rut = null;
      updateData.guest_email = null;
      updateData.guest_phone = null;
    }
  }

  const { data: updatedAppointment, error } = await supabaseServiceRole.from("appointments")
    .update(updateData).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: "Failed to update appointment", details: error.message }, { status: 500 });

  // Cancellation notification
  if (body.status === "cancelled" && appointmentBeforeCancel && updatedAppointment) {
    try {
      let customerName = "Cliente";
      let customerEmail: string | null = null;
      const apt = appointmentBeforeCancel;
      if (apt.customer_id) {
        const { data: customer } = await supabaseServiceRole.from("customers").select("first_name, last_name, email").eq("id", apt.customer_id).single();
        if (customer) {
          customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() || "Cliente";
          customerEmail = customer.email || null;
        }
      } else if (apt.guest_first_name || apt.guest_last_name) {
        customerName = [apt.guest_first_name, apt.guest_last_name].filter(Boolean).join(" ").trim() || "Cliente";
        customerEmail = apt.guest_email || null;
      }
      const aptDate = apt.appointment_date || updatedAppointment.appointment_date || "";
      const aptTime = apt.appointment_time || updatedAppointment.appointment_time || "";

      await NotificationService.notifyAppointmentCancelled(id, customerName, aptDate, aptTime, apt.branch_id ?? updatedAppointment.branch_id);

      if (customerEmail) {
        const { data: branch } = apt.branch_id ? await supabaseServiceRole.from("branches").select("name, phone, email").eq("id", apt.branch_id).single() : { data: null };
        sendAppointmentCancellation({
          id, customer_name: customerName, customer_first_name: customerName.split(" ")[0] || "Cliente",
          customer_email: customerEmail, date: aptDate, time: typeof aptTime === "string" ? aptTime.substring(0, 5) : aptTime,
          branch_name: branch?.name || "Nuestra Óptica", branch_phone: branch?.phone || "", branch_email: branch?.email || "",
        }, apt.organization_id ?? undefined).catch((err: Error) => logger.error("Error sending appointment cancellation email", err));
      }
    } catch (notifErr) {
      logger.error("Error sending appointment cancelled notification", notifErr);
    }
  }

  // Reschedule notification
  if (appointmentBeforeReschedule && updatedAppointment && body.status !== "cancelled") {
    const oldDate = appointmentBeforeReschedule.appointment_date;
    const oldTime = appointmentBeforeReschedule.appointment_time;
    const newDate = body.appointment_date ?? updatedAppointment.appointment_date;
    const newTime = body.appointment_time ?? updatedAppointment.appointment_time;
    const dateChanged = body.appointment_date && oldDate && newDate !== oldDate;
    const timeChanged = body.appointment_time && oldTime && newTime !== oldTime;
    if ((dateChanged || timeChanged) && (oldDate || oldTime)) {
      const cust = appointmentBeforeReschedule.customer;
      const customerEmail = cust?.email || appointmentBeforeReschedule.guest_email || null;
      const customerName = cust ? [cust.first_name, cust.last_name].filter(Boolean).join(" ").trim() || "Cliente" : "Cliente";
      if (customerEmail) {
        const branch = appointmentBeforeReschedule.branch;
        sendAppointmentRescheduled({
          id, customer_name: customerName, customer_first_name: customerName.split(" ")[0] || "Cliente",
          customer_email: customerEmail, date: newDate || "", time: typeof newTime === "string" ? newTime.substring(0, 5) : newTime,
          old_date: oldDate || "", old_time: typeof oldTime === "string" ? oldTime.substring(0, 5) : (oldTime ?? ""),
          branch_name: branch?.name || "Nuestra Óptica", branch_phone: branch?.phone || "", branch_email: branch?.email || "",
        }, appointmentBeforeReschedule.organization_id ?? undefined).catch((err: Error) => logger.error("Error sending appointment rescheduled email", err));
      }
    }
  }

  // Auto-registration: guest → customer on completion
  let finalAppointmentSnapshot = updatedAppointment;
  if (updatedAppointment.status === "completed" && !updatedAppointment.customer_id && updatedAppointment.guest_first_name) {
    try {
      let orgId = updatedAppointment.organization_id;
      if (!orgId) {
        const { data: adminUser } = await supabaseServiceRole.from("admin_users").select("organization_id").eq("id", user.id).maybeSingle();
        orgId = adminUser?.organization_id;
      }
      if (orgId) {
        const { data: existingCustomer } = await supabaseServiceRole.from("customers").select("id").eq("rut", updatedAppointment.guest_rut).eq("organization_id", orgId).maybeSingle();
        let targetCustomerId = existingCustomer?.id;
        if (!targetCustomerId) {
          const { data: newCustomer } = await supabaseServiceRole.from("customers").insert({
            first_name: updatedAppointment.guest_first_name, last_name: updatedAppointment.guest_last_name,
            rut: updatedAppointment.guest_rut, email: updatedAppointment.guest_email, phone: updatedAppointment.guest_phone,
            organization_id: orgId, branch_id: updatedAppointment.branch_id, is_active: true,
          }).select("id").single();
          if (newCustomer) targetCustomerId = newCustomer.id;
        }
        if (targetCustomerId) {
          const { data: finalUpdate } = await supabaseServiceRole.from("appointments").update({
            customer_id: targetCustomerId, guest_first_name: null, guest_last_name: null,
            guest_rut: null, guest_email: null, guest_phone: null,
          }).eq("id", id).select("*").single();
          if (finalUpdate) finalAppointmentSnapshot = finalUpdate;
        }
      }
    } catch (err) {
      logger.error("Error in guest auto-registration process", err);
    }
  }

  // Fetch relations for response
  const appointmentWithRelations = await fetchRelations(supabaseServiceRole, supabase, finalAppointmentSnapshot);
  return NextResponse.json({ success: true, appointment: appointmentWithRelations });
}

export async function deleteAppointment(request: NextRequest, id: string) {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();
  const user = await getAdminAuth(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseServiceRole.from("appointments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete appointment", details: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
