import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getRevenueTrendSchema = z.object({
  days: z.number().default(30),
});

export const getRevenueTrendTool: ToolDefinition = {
  name: "getRevenueTrend",
  description: "Get revenue trend data for a specified number of days.",
  category: "analytics",
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
  zodSchema: getRevenueTrendSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getRevenueTrendSchema.parse(params);
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
        .select("total_amount, created_at, payment_status, status")
        .eq("organization_id", organizationId)
        .gte("created_at", startDate.toISOString())
        .in("payment_status", ["paid"])
        .in("status", ["completed", "delivered"]);

      if (error) {
        return { success: false, error: error.message };
      }

      const dailyRevenue: Record<string, number> = {};
      orders?.forEach((order: Record<string, unknown>) => {
        const date = new Date(order.created_at as string).toISOString().split("T")[0];
        dailyRevenue[date] =
          (dailyRevenue[date] || 0) + ((order.total_amount as number) || 0);
      });

      const trend = Object.entries(dailyRevenue)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const totalRevenue = trend.reduce((sum, day) => sum + day.revenue, 0);

      return {
        success: true,
        data: {
          trend,
          totalRevenue,
          currency: context.currency || "USD",
          days: validated.days,
        },
        message: `Revenue trend for last ${validated.days} days`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get revenue trend",
      };
    }
  },
};
