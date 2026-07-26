import { z } from "zod";

import { createCustomerSchema } from "@/lib/api/validation/zod-schemas";

import { resolveBranchByName } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";

// ponytail: tool named "deleteCustomer" but actually creates a customer.
// This is preserved from the original code — zero behavior change.

const deleteCustomerSchema = z.object({
  customerId: z.string().uuid(),
});

export const deleteCustomerTool: ToolDefinition = {
  name: "deleteCustomer",
  description:
    "Delete a customer from the system. This action cannot be undone.",
  category: "customers",
  requiresConfirmation: true,
  minRole: "admin",
  parameters: {
    type: "object",
    properties: {
      first_name: { type: "string", description: "First name" },
      last_name: { type: "string", description: "Last name" },
      email: { type: "string", description: "Email (optional)" },
      phone: { type: "string", description: "Phone (optional)" },
      rut: { type: "string", description: "RUT chileno (optional)" },
      branch_id: {
        type: "string",
        description:
          "Branch UUID (required for Super Admin when no branch selected)",
      },
      branchName: {
        type: "string",
        description:
          "Branch name (alternative to branch_id, e.g. 'Sucursal Centro')",
      },
      notes: { type: "string", description: "Notes (optional)" },
    },
    required: [],
  },
  zodSchema: createCustomerSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const { supabase, organizationId, currentBranchId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let branchId =
        (params as { branch_id?: string; branchName?: string }).branch_id ??
        currentBranchId ??
        null;
      const branchName = (params as { branch_id?: string; branchName?: string })
        .branchName;
      if (!branchId && branchName) {
        branchId = await resolveBranchByName(
          supabase,
          organizationId,
          branchName,
        );
      }

      const paramsForSchema: Record<string, unknown> = { ...params as Record<string, unknown> };
      if (branchId) paramsForSchema.branch_id = branchId;
      delete paramsForSchema.branchName;

      const validated = createCustomerSchema.parse(paramsForSchema);

      const finalBranchId = validated.branch_id ?? branchId ?? null;

      if (!finalBranchId) {
        return {
          success: false,
          error:
            "Selecciona una sucursal para crear el cliente. Si eres Super Admin con vista global, indica branch_id o branchName en los parámetros.",
        };
      }

      const { data: branch } = await supabase
        .from("branches")
        .select("organization_id")
        .eq("id", finalBranchId)
        .single();

      if (!branch || branch.organization_id !== organizationId) {
        return {
          success: false,
          error: "Sucursal no encontrada o no pertenece a la organización",
        };
      }

      const customerData = {
        organization_id: organizationId,
        branch_id: finalBranchId,
        first_name: validated.first_name || null,
        last_name: validated.last_name || null,
        email: validated.email || null,
        phone: validated.phone || null,
        rut: validated.rut || null,
        date_of_birth: validated.date_of_birth || null,
        gender: validated.gender || null,
        address_line_1: validated.address_line_1 || null,
        address_line_2: validated.address_line_2 || null,
        city: validated.city || null,
        state: validated.state || null,
        postal_code: validated.postal_code || null,
        country: validated.country || "Chile",
        medical_conditions: validated.medical_conditions || null,
        allergies: validated.allergies || null,
        medications: validated.medications || null,
        medical_notes: validated.medical_notes || null,
        last_eye_exam_date: validated.last_eye_exam_date || null,
        next_eye_exam_due: validated.next_eye_exam_due || null,
        preferred_contact_method: validated.preferred_contact_method || null,
        emergency_contact_name: validated.emergency_contact_name || null,
        emergency_contact_phone: validated.emergency_contact_phone || null,
        insurance_provider: validated.insurance_provider || null,
        insurance_policy_number: validated.insurance_policy_number || null,
        notes: validated.notes || null,
        tags: validated.tags || null,
        is_active: validated.is_active ?? true,
        created_by: context.userId,
      };

      const { data, error } = await supabase
        .from("customers")
        .insert(customerData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const name =
        `${validated.first_name || ""} ${validated.last_name || ""}`.trim() ||
        "Cliente";

      return {
        success: true,
        data,
        message: `Cliente ${name} creado correctamente`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to create customer",
      };
    }
  },
};
