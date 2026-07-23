import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getTopProductsSchema = z.object({
  limit: z.number().default(10),
  days: z.number().default(30),
});

export const getTopProductsTool: ToolDefinition = {
  name: "getTopProducts",
  description:
    "Get top selling products by quantity sold in a specified time period.",
  category: "analytics",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        default: 10,
        description: "Number of top products to return",
      },
      days: {
        type: "number",
        default: 30,
        description: "Number of days to analyze",
      },
    },
  },
  zodSchema: getTopProductsSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getTopProductsSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - validated.days);

      const { data: orderItems, error } = await supabase
        .from("order_items")
        .select(
          `
            product_name,
            quantity,
            total_price,
            order:order_id (
              created_at,
              payment_status
            )
          `,
        )
        .gte("order.created_at", startDate.toISOString())
        .eq("order.payment_status", "paid");

      if (error) {
        return { success: false, error: error.message };
      }

      const productStats: Record<
        string,
        { name: string; quantity: number; revenue: number }
      > = {};

      orderItems?.forEach((item: unknown) => {
        const name = item.product_name;
        if (!productStats[name]) {
          productStats[name] = { name, quantity: 0, revenue: 0 };
        }
        productStats[name].quantity += item.quantity || 0;
        productStats[name].revenue += item.total_price || 0;
      });

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, validated.limit);

      return {
        success: true,
        data: {
          products: topProducts,
          days: validated.days,
        },
        message: `Top ${validated.limit} products for last ${validated.days} days`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to get top products",
      };
    }
  },
};
