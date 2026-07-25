import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getSalesReportSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  days: z.number().default(30),
});

export const getSalesReportTool: ToolDefinition = {
  name: "getSalesReport",
  description:
    "Generate a comprehensive sales report for a specified time period.",
  category: "analytics",
  parameters: {
    type: "object",
    properties: {
      startDate: { type: "string", description: "Start date (ISO format)" },
      endDate: { type: "string", description: "End date (ISO format)" },
      days: {
        type: "number",
        default: 30,
        description: "Number of days if dates not provided",
      },
    },
  },
  zodSchema: getSalesReportSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getSalesReportSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let startDate: Date;
      let endDate: Date = new Date();

      if (validated.startDate && validated.endDate) {
        startDate = new Date(validated.startDate);
        endDate = new Date(validated.endDate);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - validated.days);
      }

      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `
            id,
            order_number,
            total_amount,
            status,
            payment_status,
            created_at,
            order_items (
              quantity,
              total_price,
              product_name
            )
          `,
        )
        .eq("organization_id", organizationId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) {
        return { success: false, error: error.message };
      }

      const paidOrders =
        orders?.filter(
          // @ts-expect-error — SupabaseClient<unknown>, orders type is dynamic
          (o) => o.payment_status === "paid" || o.status === "completed",
        ) || [];
      const totalRevenue = paidOrders.reduce(
        // @ts-expect-error — SupabaseClient<unknown>, paidOrders type is dynamic
        (sum, o) => sum + (o.total_amount || 0),
        0,
      );
      const totalOrders = orders?.length || 0;
      const totalItems =
        orders?.reduce(
          // @ts-expect-error — SupabaseClient<unknown>, orders type is dynamic
          (sum, o) => sum + (o.order_items?.length || 0),
          0,
        ) || 0;

      const report = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        summary: {
          totalOrders,
          paidOrders: paidOrders.length,
          totalRevenue,
          averageOrderValue:
            paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
          totalItemsSold: totalItems,
        },
        orders: orders || [],
      };

      return {
        success: true,
        data: report,
        message: `Sales report generated for period`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate sales report",
      };
    }
  },
};
