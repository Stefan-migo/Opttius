import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getCustomerOrdersSchema = z.object({
  customerId: z.string().uuid(),
  limit: z.number().default(10),
});

export const getCustomerOrdersTool: ToolDefinition = {
  name: "getCustomerOrders",
  description: "Get order history for a specific customer.",
  category: "customers",
  parameters: {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Customer UUID" },
      limit: { type: "number", default: 10 },
    },
    required: ["customerId"],
  },
  zodSchema: getCustomerOrdersSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getCustomerOrdersSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
            id,
            order_number,
            status,
            payment_status,
            total_amount,
            created_at,
            order_items (
              product_name,
              quantity,
              unit_price
            )
          `,
        )
        .eq("customer_id", validated.customerId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(validated.limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          orders: data || [],
        },
        message: `Found ${data?.length || 0} orders for customer`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to get customer orders",
      };
    }
  },
};
