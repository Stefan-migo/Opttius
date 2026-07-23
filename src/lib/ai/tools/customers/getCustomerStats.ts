import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getCustomerStatsSchema = z.object({
  customerId: z.string().uuid(),
});

export const getCustomerStatsTool: ToolDefinition = {
  name: "getCustomerStats",
  description: "Get analytics and statistics for a specific customer.",
  category: "customers",
  parameters: {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Customer UUID" },
    },
    required: ["customerId"],
  },
  zodSchema: getCustomerStatsSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getCustomerStatsSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const { data: orders, error }: unknown = await supabase
        .from("orders")
        .select("total_amount, status, payment_status, created_at")
        .eq("customer_id", validated.customerId)
        .eq("organization_id", organizationId);

      if (error) {
        return { success: false, error: error.message };
      }

      const paidOrders =
        (orders as unknown[])?.filter(
          (o: unknown) =>
            o.payment_status === "paid" || o.status === "completed",
        ) || [];
      const totalSpent = paidOrders.reduce(
        (sum: number, o: unknown) => sum + (o.total_amount || 0),
        0,
      );
      const orderCount = orders?.length || 0;
      const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

      const stats = {
        totalOrders: orderCount,
        totalSpent,
        averageOrderValue: avgOrderValue,
        lastOrderDate:
          orders && orders.length > 0
            ? (orders as unknown[]).sort(
                (a: unknown, b: unknown) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )[0].created_at
            : null,
      };

      return {
        success: true,
        data: stats,
        message: `Customer statistics calculated`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to get customer stats",
      };
    }
  },
};
