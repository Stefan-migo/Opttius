import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { NotificationService } from "@/lib/notifications/notification-service";
import { formatRUT } from "@/lib/utils/rut";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { EmailNotificationService } from "@/lib/email/notifications";
import type {
  IsAdminParams,
  IsAdminResult,
  CheckAppointmentAvailabilityParams,
  CheckAppointmentAvailabilityResult,
} from "@/types/supabase-rpc";
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/api/errors";
import {
  createPaginatedResponse,
  createApiSuccessResponse,
  createApiErrorResponse,
  extractPaginationParams,
} from "@/lib/api/response";
import { createAppointmentSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  validateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Appointments API GET called", { requestId });

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("User authentication failed", {
        error: userError,
        requestId,
      });
      throw new AuthenticationError("Unauthorized");
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      logger.warn("User is not admin", { email: user.email, requestId });
      throw new AuthorizationError("Admin access required");
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    const searchParams = request.nextUrl.searchParams;
    const startDate =
      searchParams.get("start_date") ?? searchParams.get("date_from");
    const endDate = searchParams.get("end_date") ?? searchParams.get("date_to");
    const status = searchParams.get("status");
    const customerId = searchParams.get("customer_id");
    const staffId = searchParams.get("staff_id");
    const requestedBranchId = searchParams.get("branch_id"); // Allow explicit branch_id override

    // Determine which branch to filter by
    // If branch_id is explicitly requested (for global view), use it
    // Otherwise use the branch context
    const branchIdToFilter = requestedBranchId || branchContext.branchId;

    // Fetch appointment data
    let query = supabase
      .from("appointments")
      .select(
        "*, guest_first_name, guest_last_name, guest_rut, guest_email, guest_phone",
      )
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    // Apply branch filter
    // If branch_id is explicitly requested, use it even if in global view
    if (requestedBranchId) {
      query = query.eq("branch_id", requestedBranchId);
    } else {
      query = addBranchFilter(
        query,
        branchContext.branchId,
        branchContext.isSuperAdmin,
        branchContext.organizationId,
      );
    }

    if (startDate) {
      query = query.gte("appointment_date", startDate);
    }

    if (endDate) {
      query = query.lte("appointment_date", endDate);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    if (staffId) {
      query = query.eq("assigned_to", staffId);
    }

    const { data: appointments, error } = await query;

    if (error) {
      logger.error("Error fetching appointments", error, {
        errorDetails: JSON.stringify(error, null, 2),
        errorCode: error.code,
        errorMessage: error.message,
        errorHint: error.hint,
      });
      return createApiErrorResponse(
        new Error(error.message || "Failed to fetch appointments"),
        {
          requestId,
          details: { code: error.code, hint: error.hint } as Record<
            string,
            unknown
          >,
        },
      );
    }

    if (!appointments || appointments.length === 0) {
      return createApiSuccessResponse([], { requestId });
    }

    // Fetch related data using batch queries to avoid N+1
    const customerIds = [
      ...new Set(appointments.map((a) => a.customer_id).filter(Boolean)),
    ];
    const staffIds = [
      ...new Set(appointments.map((a) => a.assigned_to).filter(Boolean)),
    ];
    const prescriptionIds = [
      ...new Set(appointments.map((a) => a.prescription_id).filter(Boolean)),
    ];
    const orderIds = [
      ...new Set(appointments.map((a) => a.order_id).filter(Boolean)),
    ];

    // Fetch customers
    const { data: customers } =
      customerIds.length > 0
        ? await supabase
            .from("customers")
            .select("id, first_name, last_name, email, phone")
            .in("id", customerIds)
        : { data: [] };

    // Fetch staff
    const { data: staff } =
      staffIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", staffIds)
        : { data: [] };

    // Fetch prescriptions
    const { data: prescriptions } =
      prescriptionIds.length > 0
        ? await supabase
            .from("prescriptions")
            .select("id, prescription_date, prescription_type")
            .in("id", prescriptionIds)
        : { data: [] };

    // Fetch orders
    const { data: orders } =
      orderIds.length > 0
        ? await supabase
            .from("orders")
            .select("id, order_number")
            .in("id", orderIds)
        : { data: [] };

    // Map appointments with related data
    const appointmentsWithRelations = appointments.map((appointment) => ({
      ...appointment,
      customer:
        customers?.find((c) => c.id === appointment.customer_id) || null,
      assigned_staff:
        staff?.find((s) => s.id === appointment.assigned_to) || null,
      prescription:
        prescriptions?.find((p) => p.id === appointment.prescription_id) ||
        null,
      order: orders?.find((o) => o.id === appointment.order_id) || null,
    }));

    logger.debug("Appointments fetched successfully", {
      count: appointmentsWithRelations.length,
      requestId,
    });

    // Use standardized success response (no pagination for now)
    return createApiSuccessResponse(appointmentsWithRelations, { requestId });
  } catch (error) {
    logger.error("Error in appointments API GET", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Get branch context to assign branch_id to appointment
    const branchContext = await getBranchContext(request, user.id);

    logger.debug("Branch context for appointment creation", {
      branchId: branchContext.branchId,
      isSuperAdmin: branchContext.isSuperAdmin,
      isGlobalView: branchContext.isGlobalView,
    });

    // For non-super admins with assigned branches: use default branch when none selected
    // (users who cannot select branch manually should still create appointments in their branch)
    const defaultBranchForNonSuperAdmin =
      !branchContext.isSuperAdmin && branchContext.accessibleBranches.length > 0
        ? branchContext.accessibleBranches.find((b) => b.isPrimary)?.id ||
          branchContext.accessibleBranches[0]?.id
        : null;
    const effectiveBranchId =
      branchContext.branchId || defaultBranchForNonSuperAdmin;

    if (!branchContext.isSuperAdmin && !effectiveBranchId) {
      logger.warn(
        "No branch selected and no default branch for non-super admin",
      );
      return NextResponse.json(
        {
          error: "Debe seleccionar una sucursal para crear citas",
        },
        { status: 400 },
      );
    }

    // Get body first for guest_customer (not in schema yet)
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    // Validate request body with Zod (body already parsed)
    let validatedBody;
    try {
      validatedBody = validateBody(body, createAppointmentSchema);
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error);
      }
      throw error;
    }

    // If branch_id is provided in validatedBody, use it (for super admins)
    const finalBranchId =
      validatedBody.branch_id ||
      branchContext.branchId ||
      defaultBranchForNonSuperAdmin;

    // Final validation: ensure we have a branch_id (required by database)
    if (!finalBranchId) {
      logger.warn("No branch_id available for appointment creation");
      return NextResponse.json(
        {
          error: "Debe especificar una sucursal para crear la cita",
        },
        { status: 400 },
      );
    }

    // Time format is already validated by Zod (HH:MM:SS)
    const normalizedTime = validatedBody.appointment_time;

    logger.info("Checking appointment availability", {
      date: validatedBody.appointment_date,
      time: normalizedTime,
      originalTime: validatedBody.appointment_time,
      duration: validatedBody.duration_minutes || 30,
      finalBranchId,
      bodyBranchId: body.branch_id,
      contextBranchId: branchContext.branchId,
      defaultBranchForNonSuperAdmin,
      effectiveBranchId,
      isSuperAdmin: branchContext.isSuperAdmin,
    });

    // Time format for RPC: ensure HH:MM:SS format
    const timeForRPC = normalizedTime.substring(0, 8);

    // Check availability using the function
    // Use the same approach as the frontend's availability endpoint for consistency
    // This ensures we get the same results as what's shown in the calendar
    let isAvailable = false;
    let availabilityError = null;

    // Allow forcing appointment creation for admin (skip availability check)
    // This is useful when availability check has issues
    const forceCreate = body.force_create === true;

    if (forceCreate) {
      logger.warn(
        "Forcing appointment creation - skipping availability check",
        {
          date: validatedBody.appointment_date,
          time: normalizedTime,
        },
      );
      isAvailable = true;
    } else {
      try {
        // Extract duration from body (already validated)
        const durationMinutes =
          body.duration_minutes || validatedBody.duration_minutes || 30;

        logger.info(
          "Checking availability using get_available_time_slots for consistency",
          {
            date: validatedBody.appointment_date,
            time: timeForRPC,
            duration: durationMinutes,
            branchId: finalBranchId,
          },
        );

        // Call get_available_time_slots to get all available slots
        const { data: slots, error: slotsError } =
          (await supabaseServiceRole.rpc("get_available_time_slots", {
            p_date: validatedBody.appointment_date,
            p_duration_minutes: durationMinutes,
            p_staff_id: (validatedBody as any).assigned_to || null,
            p_branch_id: finalBranchId,
          })) as { data: any[] | null; error: Error | null };

        if (slotsError) {
          logger.error("Error fetching available slots", { error: slotsError });
          availabilityError = slotsError;
        } else if (slots && slots.length > 0) {
          // Find the specific time slot in the results
          const normalizedTimeForCompare = timeForRPC.substring(0, 5); // HH:MM format

          const matchingSlot = slots.find((slot: any) => {
            let slotTime = slot.time_slot;
            // Handle different TIME formats from PostgreSQL
            if (typeof slotTime === "object" && slotTime !== null) {
              if ("hours" in slotTime && "minutes" in slotTime) {
                slotTime = `${String(slotTime.hours).padStart(2, "0")}:${String(slotTime.minutes).padStart(2, "0")}`;
              }
            }
            // Normalize to HH:MM
            if (slotTime && slotTime.includes(":")) {
              slotTime = slotTime.substring(0, 5);
            }
            return slotTime === normalizedTimeForCompare;
          });

          if (matchingSlot) {
            // Handle boolean availability
            const slotAvailable = matchingSlot.available;
            isAvailable =
              slotAvailable === true ||
              slotAvailable === "t" ||
              slotAvailable === "true";

            logger.info("Slot availability check result", {
              time: normalizedTimeForCompare,
              slotAvailable: matchingSlot.available,
              isAvailable,
              totalSlots: slots.length,
              availableSlots: slots.filter(
                (s: any) => s.available === true || s.available === "t",
              ).length,
            });
          } else {
            logger.warn("Time slot not found in available slots list", {
              requestedTime: normalizedTimeForCompare,
              availableTimes: slots.map((s: any) => s.time_slot).slice(0, 10),
            });
            // If we can't find the slot, assume it's not available
            isAvailable = false;
          }
        } else {
          logger.warn("No slots returned from get_available_time_slots", {
            date: validatedBody.appointment_date,
            duration: durationMinutes,
          });
          isAvailable = false;
        }
      } catch (err) {
        logger.error("Exception checking availability", { error: err });
        availabilityError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (availabilityError) {
      logger.error("Error checking availability", availabilityError);
      return NextResponse.json(
        {
          error: "Error checking availability",
          details: availabilityError.message || availabilityError.toString(),
        },
        { status: 500 },
      );
    }

    logger.debug("Availability check result", { isAvailable });
    logger.debug("Check parameters", {
      p_date: validatedBody.appointment_date,
      p_time: timeForRPC,
      p_duration_minutes: validatedBody.duration_minutes || 30,
      p_appointment_id: null,
      p_staff_id: (validatedBody as any).assigned_to || null,
    });

    // Handle boolean result - Supabase might return it as a string 't'/'f' or boolean
    let available = false;
    if (typeof isAvailable === "boolean") {
      available = isAvailable;
    } else if (typeof isAvailable === "string") {
      available =
        isAvailable === "t" || isAvailable === "true" || isAvailable === "1";
    } else if (isAvailable !== null && isAvailable !== undefined) {
      available = Boolean(isAvailable);
    }

    logger.debug("Final availability", {
      raw: isAvailable,
      processed: available,
      type: typeof isAvailable,
    });

    if (!available) {
      logger.warn("Slot not available", {
        date: validatedBody.appointment_date,
        time: normalizedTime,
        timeForRPC,
        duration: validatedBody.duration_minutes,
        rawResult: isAvailable,
      });

      return NextResponse.json(
        {
          error: "El horario seleccionado no está disponible",
          code: "SLOT_NOT_AVAILABLE",
          details: {
            date: validatedBody.appointment_date,
            time: normalizedTime,
            duration: validatedBody.duration_minutes,
            rawAvailabilityResult: isAvailable,
          },
        },
        { status: 400 },
      );
    }

    // Handle guest customer (non-registered) - store data directly in appointment
    const customerId = validatedBody.customer_id || null;
    let guestData = null;

    if (body?.guest_customer) {
      const guest = body.guest_customer;

      // Validate required fields
      if (!guest.first_name || !guest.last_name || !guest.rut) {
        return NextResponse.json(
          {
            error:
              "Nombre, apellido y RUT son obligatorios para clientes no registrados",
          },
          { status: 400 },
        );
      }

      // Format RUT to standard format
      const formattedRUT = formatRUT(guest.rut);

      // Store guest data directly in appointment (no customer creation)
      guestData = {
        guest_first_name: guest.first_name.trim(),
        guest_last_name: guest.last_name.trim(),
        guest_rut: formattedRUT,
        guest_email: guest.email?.trim() || null,
        guest_phone: guest.phone?.trim() || null,
      };

      logger.debug(
        "Creating appointment with guest customer (not registered)",
        guestData,
      );
    }

    // Create appointment
    const appointmentData: {
      customer_id: string | null;
      appointment_date: string;
      appointment_time: string;
      duration_minutes: number;
      appointment_type: string;
      status: string;
      assigned_to: string | null;
      notes: string | null;
      reason: string | null;
      prescription_id: string | null;
      order_id: string | null;
      follow_up_required: boolean;
      follow_up_date: string | null;
      created_by: string;
      branch_id: string;
      [key: string]: unknown;
    } = {
      customer_id: customerId, // NULL for guest customers
      appointment_date: validatedBody.appointment_date,
      appointment_time: normalizedTime,
      duration_minutes: validatedBody.duration_minutes || 30,
      appointment_type: validatedBody.appointment_type,
      status: (body as any)?.status || "scheduled",
      assigned_to: (body as any)?.assigned_to || null,
      notes: validatedBody.notes || null,
      reason: (body as any)?.reason || null,
      prescription_id: (body as any)?.prescription_id || null,
      order_id: (body as any)?.order_id || null,
      follow_up_required: (body as any)?.follow_up_required || false,
      follow_up_date: (body as any)?.follow_up_date || null,
      created_by: user.id,
      branch_id: finalBranchId, // Always include branch_id (required by database)
      organization_id: branchContext.organizationId, // Set organization_id for multi-tenancy
    };

    // Add guest customer data if present
    if (guestData) {
      Object.assign(appointmentData, guestData);
    }

    logger.debug("Inserting appointment with data", { appointmentData });

    // Insert appointment first without the customer relation (to avoid issues with NULL customer_id)
    const { data: appointment, error: appointmentError } =
      await supabaseServiceRole
        .from("appointments")
        .insert(appointmentData)
        .select("*")
        .single();

    if (appointmentError) {
      logger.error("Error creating appointment", appointmentError, {
        errorDetails: JSON.stringify(appointmentError, null, 2),
        appointmentData: JSON.stringify(appointmentData, null, 2),
      });
      return NextResponse.json(
        {
          error: "Failed to create appointment",
          details: appointmentError.message,
          code: appointmentError.code,
          hint: appointmentError.hint,
        },
        { status: 500 },
      );
    }

    logger.info("Appointment created successfully", {
      appointmentId: appointment.id,
    });

    // Fetch customer separately if customer_id exists
    let customer = null;
    if (appointment.customer_id) {
      const { data: customerData } = await supabaseServiceRole
        .from("customers")
        .select("id, first_name, last_name, email, phone")
        .eq("id", appointment.customer_id)
        .maybeSingle();
      customer = customerData;
    }

    // Add customer to appointment object
    const appointmentWithCustomer = {
      ...appointment,
      customer,
    };

    // Create notification for new appointment (non-blocking)
    if (appointmentWithCustomer) {
      // Get customer name from registered customer or guest data
      let customerName = "Cliente";
      if (appointmentWithCustomer.customer) {
        customerName =
          `${appointmentWithCustomer.customer.first_name || ""} ${appointmentWithCustomer.customer.last_name || ""}`.trim() ||
          appointmentWithCustomer.customer.email ||
          "Cliente";
      } else if (
        appointmentWithCustomer.guest_first_name &&
        appointmentWithCustomer.guest_last_name
      ) {
        customerName =
          `${appointmentWithCustomer.guest_first_name} ${appointmentWithCustomer.guest_last_name}`.trim();
      }

      NotificationService.notifyNewAppointment(
        appointmentWithCustomer.id,
        customerName,
        appointmentWithCustomer.appointment_date,
        appointmentWithCustomer.appointment_time,
        appointmentWithCustomer.branch_id ??
          branchContext.branchId ??
          undefined,
      ).catch((err) => logger.error("Error creating notification", err));

      // Send Customer Email Confirmation (non-blocking)
      const customerEmail =
        appointmentWithCustomer.customer?.email ||
        appointmentWithCustomer.guest_email;

      if (customerEmail) {
        (async () => {
          try {
            // Get branch info for email
            const { data: branch } = await supabaseServiceRole
              .from("branches")
              .select("name")
              .eq("id", appointmentWithCustomer.branch_id)
              .single();

            // Get professional name if assigned
            let professionalName = "Especialista";
            if (appointmentWithCustomer.assigned_to) {
              const { data: staff } = await supabaseServiceRole
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", appointmentWithCustomer.assigned_to)
                .single();
              if (staff)
                professionalName = `${staff.first_name} ${staff.last_name}`;
            }

            await EmailNotificationService.sendAppointmentConfirmation(
              {
                customer_name: customerName,
                customer_email: customerEmail,
                date: new Date(
                  appointmentWithCustomer.appointment_date,
                ).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
                time: appointmentWithCustomer.appointment_time.substring(0, 5),
                professional_name: professionalName,
                type: appointmentWithCustomer.appointment_type,
                branch_name: branch?.name || "",
              },
              branchContext.organizationId || undefined,
            );
          } catch (err) {
            logger.error("Error sending appointment email", err);
          }
        })();
      }
    }

    return NextResponse.json(
      {
        success: true,
        appointment: appointmentWithCustomer,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error in appointments POST API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
