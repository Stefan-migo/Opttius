import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getOrdersSchema = z.object({
  status: z
    .enum([
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ])
    .optional(),
  paymentStatus: z
    .enum(["pending", "paid", "failed", "refunded", "partially_refunded"])
    .optional(),
  limit: z.number().max(100).default(50),
  offset: z.number().default(0),
});

export const getOrdersTool: ToolDefinition = {
  name: "getOrders",
  description:
    "Get list of orders with optional filters for status and payment status.",
  category: "orders",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: [
          "pending",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "refunded",
        ],
      },
      paymentStatus: {
        type: "string",
        enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      },
      limit: { type: "number", default: 50, maximum: 100 },
      offset: { type: "number", default: 0 },
    },
  },
  zodSchema: getOrdersSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getOrdersSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let query = supabase
        .from("orders")
        .select(
          `
            id,
            order_number,
            email,
            status,
            payment_status,
            total_amount,
            currency,
            created_at,
            order_items (
              id,
              product_name,
              quantity,
              unit_price,
              total_price
            )
          `,
          { count: "exact" },
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (validated.status) {
        query = query.eq("status", validated.status);
      }

      if (validated.paymentStatus) {
        query = query.eq("payment_status", validated.paymentStatus);
      }

      const { data, error, count } = await query.range(
        validated.offset,
        validated.offset + validated.limit - 1,
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          orders: data || [],
          total: count || 0,
        },
        message: `Found ${count || 0} orders`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.message || "Failed to get orders",
      };
    }
  },
};
