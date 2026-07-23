/**
 * Admin Appointment Service
 * Server-side business logic for appointment operations
 */
import { NextRequest, NextResponse } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError, ValidationError } from "@/lib/api/errors";
import { createApiSuccessResponse } from "@/lib/api/response";
import { validateBody, validationErrorResponse } from "@/lib/api/validation/zod-helpers";
import { createAppointmentSchema } from "@/lib/api/validation/zod-schemas";
import { sendAppointmentConfirmation } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";
import { NotificationService } from "@/lib/notifications/notification-service";
import { formatRUT } from "@/lib/utils/rut";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

async function getAdminAuth(supabase: unknown) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new AuthenticationError("Unauthorized");
  const { data: isAdmin } = (await supabase.rpc("is_admin", {
    user_id: user.id,
  } as IsAdminParams)) as { data: IsAdminResult | null };
  if (!isAdmin) throw new AuthorizationError("Admin access required");
  return user;
}

export async function listAppointments(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info("Appointments API GET called", { requestId });

  const supabase = await createClient();
  const user = await getAdminAuth(supabase);
  const branchContext = await getBranchContext(request, user.id);

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date") ?? searchParams.get("date_from");
  const endDate = searchParams.get("end_date") ?? searchParams.get("date_to");
  const status = searchParams.get("status");
  const customerId = searchParams.get("customer_id");
  const staffId = searchParams.get("staff_id");
  const requestedBranchId = searchParams.get("branch_id");
  const branchIdToFilter = requestedBranchId || branchContext.branchId;

  let query = supabase
    .from("appointments")
    .select("*, guest_first_name, guest_last_name, guest_rut, guest_email, guest_phone")
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (requestedBranchId) {
    query = query.eq("branch_id", requestedBranchId);
  } else {
    query = addBranchFilter(query, branchContext.branchId, branchContext.isSuperAdmin, branchContext.organizationId);
  }

  if (startDate) query = query.gte("appointment_date", startDate);
  if (endDate) query = query.lte("appointment_date", endDate);
  if (status) query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);
  if (staffId) query = query.eq("assigned_to", staffId);

  const { data: appointments, error } = await query;
  if (error) {
    logger.error("Error fetching appointments", error);
    throw new Error(error.message || "Failed to fetch appointments");
  }

  if (!appointments || appointments.length === 0) {
    return createApiSuccessResponse([], { requestId });
  }

  // Batch fetch related data
  const customerIds = [...new Set(appointments.map((a: unknown) => a.customer_id).filter(Boolean))];
  const staffIds = [...new Set(appointments.map((a: unknown) => a.assigned_to).filter(Boolean))];
  const prescriptionIds = [...new Set(appointments.map((a: unknown) => a.prescription_id).filter(Boolean))];
  const orderIds = [...new Set(appointments.map((a: unknown) => a.order_id).filter(Boolean))];

  const [{ data: customers }, { data: staff }, { data: prescriptions }, { data: orders }] = await Promise.all([
    customerIds.length > 0 ? supabase.from("customers").select("id, first_name, last_name, email, phone").in("id", customerIds) : Promise.resolve({ data: [] }),
    staffIds.length > 0 ? supabase.from("profiles").select("id, first_name, last_name").in("id", staffIds) : Promise.resolve({ data: [] }),
    prescriptionIds.length > 0 ? supabase.from("prescriptions").select("id, prescription_date, prescription_type").in("id", prescriptionIds) : Promise.resolve({ data: [] }),
    orderIds.length > 0 ? supabase.from("orders").select("id, order_number").in("id", orderIds) : Promise.resolve({ data: [] }),
  ]);

  const appointmentsWithRelations = (appointments as unknown[]).map((appointment) => ({
    ...appointment,
    customer: (customers as unknown[])?.find((c) => c.id === appointment.customer_id) || null,
    assigned_staff: (staff as unknown[])?.find((s) => s.id === appointment.assigned_to) || null,
    prescription: (prescriptions as unknown[])?.find((p) => p.id === appointment.prescription_id) || null,
    order: (orders as unknown[])?.find((o) => o.id === appointment.order_id) || null,
  }));

  return createApiSuccessResponse(appointmentsWithRelations, { requestId });
}

export async function createAppointment(request: NextRequest) {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();
  const user = await getAdminAuth(supabase);
  const branchContext = await getBranchContext(request, user.id);

  const defaultBranchForNonSuperAdmin =
    !branchContext.isSuperAdmin && branchContext.accessibleBranches.length > 0
      ? branchContext.accessibleBranches.find((b: unknown) => b.isPrimary)?.id || branchContext.accessibleBranches[0]?.id
      : null;
  const effectiveBranchId = branchContext.branchId || defaultBranchForNonSuperAdmin;

  if (!branchContext.isSuperAdmin && !effectiveBranchId) {
    return NextResponse.json({ error: "Debe seleccionar una sucursal para crear citas" }, { status: 400 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  let validatedBody: unknown;
  try { validatedBody = validateBody(body, createAppointmentSchema); } catch (error) {
    if (error instanceof ValidationError) return validationErrorResponse(error);
    throw error;
  }

  const finalBranchId = validatedBody.branch_id || branchContext.branchId || defaultBranchForNonSuperAdmin;
  if (!finalBranchId) {
    return NextResponse.json({ error: "Debe especificar una sucursal para crear la cita" }, { status: 400 });
  }

  const normalizedTime = validatedBody.appointment_time;
  const timeForRPC = normalizedTime.substring(0, 8);
  const forceCreate = body.force_create === true;

  // Check availability
  if (!forceCreate) {
    const durationMinutes = body.duration_minutes || validatedBody.duration_minutes || 30;
    const { data: slots, error: slotsError } = (await supabaseServiceRole.rpc("get_available_time_slots", {
      p_date: validatedBody.appointment_date,
      p_duration_minutes: durationMinutes,
      p_staff_id: body.assigned_to || null,
      p_branch_id: finalBranchId,
    })) as unknown;

    if (slotsError) {
      return NextResponse.json({ error: "Error checking availability", details: slotsError.message }, { status: 500 });
    }

    const normalizedTimeForCompare = timeForRPC.substring(0, 5);
    const matchingSlot = (slots || []).find((slot: unknown) => {
      let slotTime = slot.time_slot;
      if (typeof slotTime === "object" && slotTime !== null) {
        if ("hours" in slotTime && "minutes" in slotTime) {
          slotTime = `${String(slotTime.hours).padStart(2, "0")}:${String(slotTime.minutes).padStart(2, "0")}`;
        }
      }
      if (slotTime?.includes(":")) slotTime = slotTime.substring(0, 5);
      return slotTime === normalizedTimeForCompare;
    });

    const isAvailable = matchingSlot
      ? (matchingSlot.available === true || matchingSlot.available === "t" || matchingSlot.available === "true")
      : false;

    if (!isAvailable) {
      return NextResponse.json({
        error: "El horario seleccionado no está disponible",
        code: "SLOT_NOT_AVAILABLE",
        details: { date: validatedBody.appointment_date, time: normalizedTime, duration: validatedBody.duration_minutes, rawAvailabilityResult: matchingSlot?.available },
      }, { status: 400 });
    }
  }

  const customerId = validatedBody.customer_id || null;
  let guestData = null;

  // Validate customer belongs to branch
  if (customerId) {
    const { data: customer } = await supabaseServiceRole
      .from("customers").select("branch_id").eq("id", customerId).single();
    if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    if (customer.branch_id !== finalBranchId) {
      return NextResponse.json({ error: "El cliente no pertenece a esta sucursal. Seleccione un cliente de la sucursal actual." }, { status: 400 });
    }
  }

  // Guest customer data
  if (body?.guest_customer) {
    const guest = body.guest_customer;
    if (!guest.first_name || !guest.last_name || !guest.rut) {
      return NextResponse.json({ error: "Nombre, apellido y RUT son obligatorios para clientes no registrados" }, { status: 400 });
    }
    guestData = {
      guest_first_name: guest.first_name.trim(),
      guest_last_name: guest.last_name.trim(),
      guest_rut: formatRUT(guest.rut),
      guest_email: guest.email?.trim() || null,
      guest_phone: guest.phone?.trim() || null,
    };
  }

  // Field operation inheritance
  let fieldOperationId: string | null = null;
  if (customerId) {
    const { data: cust } = await supabaseServiceRole
      .from("customers").select("field_operation_id").eq("id", customerId).single();
    fieldOperationId = cust?.field_operation_id ?? null;
  }

  // Build appointment data
  const appointmentData: Record<string, unknown> = {
    customer_id: customerId,
    appointment_date: validatedBody.appointment_date,
    appointment_time: normalizedTime,
    duration_minutes: validatedBody.duration_minutes || 30,
    appointment_type: validatedBody.appointment_type,
    status: body?.status || "scheduled",
    assigned_to: body?.assigned_to || null,
    notes: validatedBody.notes || null,
    reason: body?.reason || null,
    prescription_id: body?.prescription_id || null,
    order_id: body?.order_id || null,
    follow_up_required: body?.follow_up_required || false,
    follow_up_date: body?.follow_up_date || null,
    created_by: user.id,
    branch_id: finalBranchId,
    organization_id: branchContext.organizationId,
    field_operation_id: fieldOperationId,
  };

  if (guestData) Object.assign(appointmentData, guestData);

  const { data: appointment, error: appointmentError } = await supabaseServiceRole
    .from("appointments").insert(appointmentData).select("*").single();

  if (appointmentError) {
    logger.error("Error creating appointment", appointmentError);
    return NextResponse.json({ error: "Failed to create appointment", details: appointmentError.message, code: appointmentError.code, hint: appointmentError.hint }, { status: 500 });
  }

  // Fetch customer separately
  let customer = null;
  if (appointment.customer_id) {
    const { data: customerData } = await supabaseServiceRole
      .from("customers").select("id, first_name, last_name, email, phone").eq("id", appointment.customer_id).maybeSingle();
    customer = customerData;
  }

  const appointmentWithCustomer = { ...appointment, customer };

  // Non-blocking notification
  let customerName = "Cliente";
  if (appointmentWithCustomer.customer) {
    customerName = `${appointmentWithCustomer.customer.first_name || ""} ${appointmentWithCustomer.customer.last_name || ""}`.trim() || appointmentWithCustomer.customer.email || "Cliente";
  } else if (appointmentWithCustomer.guest_first_name && appointmentWithCustomer.guest_last_name) {
    customerName = `${appointmentWithCustomer.guest_first_name} ${appointmentWithCustomer.guest_last_name}`.trim();
  }

  NotificationService.notifyNewAppointment(
    appointmentWithCustomer.id, customerName, appointmentWithCustomer.appointment_date,
    appointmentWithCustomer.appointment_time, appointmentWithCustomer.branch_id ?? branchContext.branchId ?? undefined,
  ).catch((err: Error) => logger.error("Error creating notification", err));

  // Non-blocking email
  const customerEmail = appointmentWithCustomer.customer?.email || appointmentWithCustomer.guest_email;
  if (customerEmail) {
    (async () => {
      try {
        const { data: branch } = await supabaseServiceRole.from("branches").select("name").eq("id", appointmentWithCustomer.branch_id).single();
        let professionalName = "Especialista";
        if (appointmentWithCustomer.assigned_to) {
          const { data: staff } = await supabaseServiceRole.from("profiles").select("first_name, last_name").eq("id", appointmentWithCustomer.assigned_to).single();
          if (staff) professionalName = `${staff.first_name} ${staff.last_name}`;
        }
        await sendAppointmentConfirmation({
          customer_name: customerName,
          customer_email: customerEmail,
          date: new Date(appointmentWithCustomer.appointment_date).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }),
          time: appointmentWithCustomer.appointment_time.substring(0, 5),
          professional_name: professionalName,
          type: appointmentWithCustomer.appointment_type,
          branch_name: branch?.name || "",
        }, branchContext.organizationId || undefined);
      } catch (err) {
        logger.error("Error sending appointment email", err);
      }
    })();
  }

  return NextResponse.json({ success: true, appointment: appointmentWithCustomer }, { status: 201 });
}
