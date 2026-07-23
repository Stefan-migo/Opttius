import { z } from "zod";

import { resolveBranchByName, resolveCustomerByNameOrRut } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";

const createPrescriptionSchema = z
  .object({
    customerNameOrRut: z.string(),
    od_sphere: z.number().optional(),
    os_sphere: z.number().optional(),
    od_cylinder: z.number().optional(),
    os_cylinder: z.number().optional(),
    od_add: z.number().optional(),
    os_add: z.number().optional(),
    prescription_type: z.string().optional(),
    prescription_number: z.string().optional(),
    branchName: z.string().optional(),
  })
  .refine(
    (data) => data.od_sphere !== undefined || data.os_sphere !== undefined,
    {
      message: "Provide at least od_sphere or os_sphere for the prescription",
      path: ["od_sphere"],
    },
  );

export const createPrescriptionTool: ToolDefinition = {
  name: "createPrescription",
  description:
    "Add a prescription to a customer. Use when the user asks to add a prescription (e.g. 'add prescription for Juan Perez', 'add receta for customer with RUT 18345698-9'). Requires at least od_sphere or os_sphere. If user says 'from photo' without data, ask them to provide sphere, cylinder, add values.",
  category: "prescriptions",
  parameters: {
    type: "object",
    properties: {
      customerNameOrRut: {
        type: "string",
        description: "Customer name or RUT (e.g. 'Juan Perez', '18345698-9')",
      },
      od_sphere: { type: "number", description: "OD sphere (e.g. -2.5)" },
      os_sphere: { type: "number", description: "OS sphere" },
      od_cylinder: { type: "number", description: "OD cylinder" },
      os_cylinder: { type: "number", description: "OS cylinder" },
      od_add: { type: "number", description: "OD addition (presbyopia)" },
      os_add: { type: "number", description: "OS addition (presbyopia)" },
      prescription_type: {
        type: "string",
        description: "progressive, bifocal, trifocal, single_vision",
      },
      prescription_number: {
        type: "string",
        description: "Prescription number if available",
      },
      branchName: {
        type: "string",
        description: "Branch name to scope customer search (optional)",
      },
    },
    required: ["customerNameOrRut"],
  },
  zodSchema: createPrescriptionSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = createPrescriptionSchema.parse(params);
      const { supabase, organizationId, userId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let branchId: string | null | undefined;
      if (validated.branchName) {
        branchId = await resolveBranchByName(
          supabase,
          organizationId,
          validated.branchName,
        );
      }

      const customerId = await resolveCustomerByNameOrRut(
        supabase,
        organizationId,
        validated.customerNameOrRut,
        branchId ?? undefined,
      );

      if (!customerId) {
        return {
          success: false,
          error: `Cliente no encontrado: ${validated.customerNameOrRut}`,
        };
      }

      const { data: customerData } = await supabase
        .from("customers")
        .select("organization_id, branch_id")
        .eq("id", customerId)
        .single();

      const { data: prescription, error } = await supabase
        .from("prescriptions")
        .insert({
          customer_id: customerId,
          organization_id: customerData?.organization_id ?? organizationId,
          branch_id: customerData?.branch_id ?? null,
          prescription_date: new Date().toISOString().split("T")[0],
          prescription_number: validated.prescription_number ?? null,
          od_sphere: validated.od_sphere ?? null,
          os_sphere: validated.os_sphere ?? null,
          od_cylinder: validated.od_cylinder ?? null,
          os_cylinder: validated.os_cylinder ?? null,
          od_add: validated.od_add ?? null,
          os_add: validated.os_add ?? null,
          prescription_type: validated.prescription_type ?? null,
          is_active: true,
          is_current: true,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message || "Error al crear la receta",
        };
      }

      return {
        success: true,
        data: prescription,
        message: `Receta agregada correctamente al cliente. Prescription ID: ${prescription?.id}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create prescription",
      };
    }
  },
};
