/**
 * Customer Detail UPDATE service — PUT handler for updating a customer.
 * Extracted from route.ts to reduce file size. No behavioral changes.
 */
import { NextRequest } from "next/server";

import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";

import {
  authenticateAndGetContext,
  buildBranchFilter,
} from "./customersDetailShared";

export async function handleUpdateCustomer(
  request: NextRequest,
  params: { id: string },
) {
  try {
    const { context, supabase } = await authenticateAndGetContext(
      request,
      "PUT",
    );
    const applyBranchFilter = buildBranchFilter(context);

    const body = await request.json();

    const updateData: Record<string, unknown> = {
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      email: body.email || null,
      phone: body.phone || null,
      rut: body.rut || null,
      date_of_birth: body.date_of_birth || null,
      gender: body.gender || null,
      address_line_1: body.address_line_1 || null,
      address_line_2: body.address_line_2 || null,
      city: body.city || null,
      state: body.state || null,
      postal_code: body.postal_code || null,
      country: body.country || "Chile",
      medical_conditions: body.medical_conditions || null,
      allergies: body.allergies || null,
      medications: body.medications || null,
      medical_notes: body.medical_notes || null,
      last_eye_exam_date: body.last_eye_exam_date || null,
      next_eye_exam_due: body.next_eye_exam_due || null,
      preferred_contact_method: body.preferred_contact_method || null,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      insurance_provider: body.insurance_provider || null,
      insurance_policy_number: body.insurance_policy_number || null,
      notes: body.notes || null,
      tags: body.tags || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      updated_at: new Date().toISOString(),
    };

    // Verify customer exists and user has access
    const { data: existingCustomer } = await applyBranchFilter(
      supabase.from("customers").select("id, branch_id").eq("id", params.id),
    ).single();
    if (!existingCustomer) {
      return createApiErrorResponse(
        new Error("Customer not found or access denied"),
      );
    }

    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update({ ...updateData, updated_by: context.userId } as unknown)
      .eq("id", params.id)
      .select()
      .single();

    if (updateError || !updatedCustomer) {
      logger.error("Error updating customer", updateError);
      return createApiErrorResponse(new Error("Failed to update customer"));
    }

    return createApiSuccessResponse(updatedCustomer);
  } catch (error) {
    logger.error("Error in customer update API PUT", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
