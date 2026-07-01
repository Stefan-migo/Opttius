/**
 * Customers Create Service — POST customer creation logic.
 *
 * Extracted from route.ts to reduce file size. No behavioral changes.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBranchContext } from "@/lib/api/branch-middleware";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { createApiErrorResponse } from "@/lib/api/response";
import {
  validateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { createCustomerSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { NotificationService } from "@/lib/notifications/notification-service";
import { createClientFromRequest } from "@/utils/supabase/server";

export async function handleCreateCustomer(
  request: NextRequest,
  body: unknown,
) {
  logger.info("Customers API POST called (create new customer)");

  const { client: supabase, getUser } = await createClientFromRequest(request);

  const user = (await getUser()).data?.user as { id: string } | undefined;
  if (!user) {
    return createApiErrorResponse(new AuthorizationError("Unauthorized"));
  }

  const { createServiceRoleClient } = await import("@/utils/supabase/server");
  const serviceSupabase = createServiceRoleClient();

  const { data: isAdminResult } = await serviceSupabase.rpc("is_admin", {
    user_id: user.id,
  });
  if (!isAdminResult) {
    return createApiErrorResponse(
      new AuthorizationError("Admin access required"),
    );
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const userOrgId = (adminUser as { organization_id: string } | null)
    ?.organization_id;
  if (!userOrgId) {
    return NextResponse.json(
      { error: "User organization not found" },
      { status: 500 },
    );
  }

  let validatedBody: Record<string, unknown>;
  try {
    validatedBody = validateBody(body, createCustomerSchema) as Record<
      string,
      unknown
    >;
  } catch (error: unknown) {
    if (error instanceof ValidationError) return validationErrorResponse(error);
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err: z.ZodIssue) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 },
      );
    }
    throw error;
  }

  const branchContext = await getBranchContext(request, user.id, supabase);

  // Determine customer branch_id
  let customerBranchId: string | null = null;

  if (validatedBody.field_operation_id && validatedBody.branch_id) {
    const { data: fieldOp } = await serviceSupabase
      .from("field_operations")
      .select("id, branch_id, organization_id")
      .eq("id", validatedBody.field_operation_id as string)
      .single();
    const fieldOpRecord = fieldOp as {
      id: string;
      branch_id: string;
      organization_id: string;
    } | null;
    if (!fieldOpRecord)
      return createApiErrorResponse(new NotFoundError("Operativo"));
    if (
      fieldOpRecord.organization_id !== userOrgId &&
      !branchContext.isSuperAdmin
    ) {
      return createApiErrorResponse(
        new AuthorizationError("No tienes acceso a este operativo"),
      );
    }
    if (fieldOpRecord.branch_id !== validatedBody.branch_id) {
      return createApiErrorResponse(
        new ValidationError("La sucursal no coincide con el operativo"),
      );
    }
    customerBranchId = validatedBody.branch_id as string;
  } else if (branchContext.branchId) {
    customerBranchId = branchContext.branchId;
  } else if (validatedBody.branch_id) {
    const { data: branch } = await supabase
      .from("branches")
      .select("id, organization_id")
      .eq("id", validatedBody.branch_id as string)
      .single();
    const branchRecord = branch as {
      id: string;
      organization_id: string;
    } | null;
    if (!branchRecord)
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 },
      );
    if (
      branchRecord.organization_id !== userOrgId &&
      !branchContext.isSuperAdmin
    ) {
      return createApiErrorResponse(
        new AuthorizationError("No tienes acceso a esta sucursal"),
      );
    }
    customerBranchId = validatedBody.branch_id as string;
  } else if (branchContext.isGlobalView && branchContext.isSuperAdmin) {
    return NextResponse.json(
      {
        error:
          "Como super administrador en vista global, debe especificar la sucursal para el cliente",
      },
      { status: 400 },
    );
  } else {
    return NextResponse.json(
      { error: "Debe seleccionar una sucursal para crear un cliente" },
      { status: 400 },
    );
  }

  if (!customerBranchId) {
    return NextResponse.json(
      { error: "Debe especificar una sucursal para el cliente" },
      { status: 400 },
    );
  }

  const { validateTierLimit } = await import("@/lib/saas/tier-validator");
  const customerLimit = await validateTierLimit(userOrgId, "customers");
  if (!customerLimit.allowed) {
    return createApiErrorResponse(
      new AuthorizationError(
        customerLimit.reason ??
          "Límite de clientes alcanzado para tu plan. Considera actualizar tu suscripción.",
      ),
      {
        details: {
          code: "TIER_LIMIT",
          currentCount: customerLimit.currentCount,
          maxAllowed: customerLimit.maxAllowed,
        },
      },
    );
  }

  const existingCustomerQuery = supabase
    .from("customers")
    .select("id")
    .eq("branch_id", customerBranchId);

  if (validatedBody.email) {
    const { data: existingByEmail } = await existingCustomerQuery
      .eq("email", validatedBody.email as string)
      .maybeSingle();
    if (existingByEmail) {
      return NextResponse.json(
        { error: "Ya existe un cliente con este email en esta sucursal." },
        { status: 400 },
      );
    }
  }

  if (validatedBody.rut) {
    const { data: existingByRut } = await existingCustomerQuery
      .eq("rut", validatedBody.rut as string)
      .maybeSingle();
    if (existingByRut) {
      return NextResponse.json(
        { error: "Ya existe un cliente con este RUT en esta sucursal." },
        { status: 400 },
      );
    }
  }

  const customerData: Record<string, unknown> = {
    organization_id: userOrgId,
    branch_id: customerBranchId,
    field_operation_id: validatedBody.field_operation_id || null,
    first_name: validatedBody.first_name || null,
    last_name: validatedBody.last_name || null,
    email: validatedBody.email || null,
    phone: validatedBody.phone || null,
    rut: validatedBody.rut || null,
    date_of_birth: validatedBody.date_of_birth || null,
    gender: validatedBody.gender || null,
    address_line_1: validatedBody.address_line_1 || null,
    address_line_2: validatedBody.address_line_2 || null,
    city: validatedBody.city || null,
    state: validatedBody.state || null,
    postal_code: validatedBody.postal_code || null,
    country: validatedBody.country || "Chile",
    medical_conditions: validatedBody.medical_conditions || null,
    allergies: validatedBody.allergies || null,
    medications: validatedBody.medications || null,
    medical_notes: validatedBody.medical_notes || null,
    last_eye_exam_date: validatedBody.last_eye_exam_date || null,
    next_eye_exam_due: validatedBody.next_eye_exam_due || null,
    preferred_contact_method: validatedBody.preferred_contact_method || null,
    emergency_contact_name: validatedBody.emergency_contact_name || null,
    emergency_contact_phone: validatedBody.emergency_contact_phone || null,
    insurance_provider: validatedBody.insurance_provider || null,
    insurance_policy_number: validatedBody.insurance_policy_number || null,
    notes: validatedBody.notes || null,
    tags: validatedBody.tags || null,
    is_active:
      validatedBody.is_active !== undefined ? validatedBody.is_active : true,
    created_by: user.id,
  };

  const { data: newCustomer, error: customerError } = await supabase
    .from("customers")
    .insert(customerData)
    .select()
    .single();

  if (customerError) {
    return NextResponse.json(
      { error: `Error al crear cliente: ${customerError.message}` },
      { status: 500 },
    );
  }
  if (!newCustomer) {
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 },
    );
  }

  const newCustomerRecord = newCustomer as Record<string, unknown>;
  const customerName =
    `${validatedBody.first_name || ""} ${validatedBody.last_name || ""}`.trim() ||
    "Cliente";

  NotificationService.notifyNewCustomer(
    newCustomerRecord.id as string,
    customerName,
    (validatedBody.email as string) || undefined,
    (newCustomerRecord.branch_id as string) ??
      customerBranchId ??
      branchContext.branchId ??
      undefined,
  ).catch((err) => logger.error("Error creating notification", err));

  const customerEmail = validatedBody.email as string | undefined;
  if (customerEmail) {
    import("@/lib/email/notifications")
      .then(({ sendAccountWelcome }) =>
        sendAccountWelcome(customerName, customerEmail, userOrgId),
      )
      .catch((err) => logger.error("Error sending account welcome email", err));
  }

  return NextResponse.json({ data: newCustomer }, { status: 201 });
}
