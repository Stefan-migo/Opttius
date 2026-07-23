import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getCustomerByIdSchema = z.object({
  customerId: z.string().uuid(),
});

export const getCustomerByIdTool: ToolDefinition = {
  name: "getCustomerById",
  description: "Get detailed information about a specific customer by ID.",
  category: "customers",
  parameters: {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Customer UUID" },
    },
    required: ["customerId"],
  },
  zodSchema: getCustomerByIdSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getCustomerByIdSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const { data, error }: unknown = await supabase
        .from("customers")
        .select("*")
        .eq("id", validated.customerId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: "Customer not found" };
      }

      const { data: branch }: unknown = await supabase
        .from("branches")
        .select("organization_id")
        .eq("id", data.branch_id)
        .single();

      if (!branch || branch.organization_id !== organizationId) {
        return { success: false, error: "Customer not found" };
      }

      return {
        success: true,
        data,
        message: `Retrieved customer: ${data.first_name} ${data.last_name || ""}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to get customer",
      };
    }
  },
};
