import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getPendingOrdersSchema = z.object({
  limit: z.number().default(20),
});

export const getPendingOrdersTool: ToolDefinition = {
  name: "getPendingOrders",
  description: "Get all pending orders that need attention.",
  category: "orders",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "number", default: 20 },
    },
  },
  zodSchema: getPendingOrdersSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getPendingOrdersSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const { data, error, count } = await supabase
        .from("orders")
        .select("id, order_number, email, total_amount, created_at", {
          count: "exact",
        })
        .eq("status", "pending")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true })
        .limit(validated.limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          orders: data || [],
          count: count || 0,
        },
        message: `Found ${count || 0} pending orders`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.message || "Failed to get pending orders",
      };
    }
  },
};
