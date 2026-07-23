import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getOrderStatsSchema = z.object({
  days: z.number().default(30),
});

export const getOrderStatsTool: ToolDefinition = {
  name: "getOrderStats",
  description: "Get order statistics for a specified number of days.",
  category: "orders",
  parameters: {
    type: "object",
    properties: {
      days: {
        type: "number",
        default: 30,
        description: "Number of days to analyze",
      },
    },
  },
  zodSchema: getOrderStatsSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getOrderStatsSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - validated.days);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("status, payment_status, total_amount, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", startDate.toISOString());

      if (error) {
        return { success: false, error: error.message };
      }

      const stats = {
        total: orders?.length || 0,
        byStatus: {} as Record<string, number>,
        byPaymentStatus: {} as Record<string, number>,
        totalRevenue: 0,
        averageOrderValue: 0,
      };

      orders?.forEach((order) => {
        stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1;
        stats.byPaymentStatus[order.payment_status] =
          (stats.byPaymentStatus[order.payment_status] || 0) + 1;
        if (order.payment_status === "paid" || order.status === "completed") {
          stats.totalRevenue += order.total_amount || 0;
        }
      });

      stats.averageOrderValue =
        stats.total > 0 ? stats.totalRevenue / stats.total : 0;

      return {
        success: true,
        data: {
          ...stats,
          currency: context.currency || "USD",
        },
        message: `Order statistics for last ${validated.days} days`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.message || "Failed to get order stats",
      };
    }
  },
};
