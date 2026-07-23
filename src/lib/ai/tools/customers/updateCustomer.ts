import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const updateCustomerSchema = z.object({
  customerId: z.string().uuid(),
  updates: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address_line_1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateCustomerTool: ToolDefinition = {
  name: "updateCustomer",
  description: "Update customer information.",
  category: "customers",
  parameters: {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Customer UUID" },
      updates: {
        type: "object",
        description: "Fields to update",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          phone: { type: "string" },
          address_line_1: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          postal_code: { type: "string" },
          country: { type: "string" },
          notes: { type: "string" },
        },
      },
    },
    required: ["customerId", "updates"],
  },
  zodSchema: updateCustomerSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = updateCustomerSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const { data: existing } = await supabase
        .from("customers")
        .select("branch_id")
        .eq("id", validated.customerId)
        .single();

      if (!existing) {
        return { success: false, error: "Customer not found" };
      }

      const { data: branch }: unknown = await supabase
        .from("branches")
        .select("organization_id")
        .eq("id", existing.branch_id)
        .single();

      if (!branch || branch.organization_id !== organizationId) {
        return { success: false, error: "Customer not found" };
      }

      const { data, error }: unknown = await supabase
        .from("customers")
        .update({
          ...validated.updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.customerId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data,
        message: `Customer updated successfully`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to update customer",
      };
    }
  },
};
