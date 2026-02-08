import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";

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

const getOrderByIdSchema = z.object({
  orderId: z.string().uuid(),
});

const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]),
});

const updatePaymentStatusSchema = z.object({
  orderId: z.string().uuid(),
  paymentStatus: z.enum([
    "pending",
    "paid",
    "failed",
    "refunded",
    "partially_refunded",
  ]),
});

const getPendingOrdersSchema = z.object({
  limit: z.number().default(20),
});

const getOrderStatsSchema = z.object({
  days: z.number().default(30),
});

export const orderTools: ToolDefinition[] = [
  {
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get orders",
        };
      }
    },
  },
  {
    name: "getOrderById",
    description: "Get detailed information about a specific order by ID.",
    category: "orders",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order UUID" },
      },
      required: ["orderId"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getOrderByIdSchema.parse(params);
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
            *,
            order_items (
              id,
              product_id,
              product_name,
              variant_title,
              quantity,
              unit_price,
              total_price
            )

          `,
          )
          .eq("id", validated.orderId)
          .eq("organization_id", organizationId)
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data) {
          return { success: false, error: "Order not found" };
        }

        return {
          success: true,
          data,
          message: `Retrieved order ${data.order_number}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get order",
        };
      }
    },
  },
  {
    name: "updateOrderStatus",
    description:
      "Update the status of an order (pending, processing, shipped, delivered, cancelled, refunded).",
    category: "orders",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order UUID" },
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
      },
      required: ["orderId", "status"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = updateOrderStatusSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const updateData: any = {
          status: validated.status,
          updated_at: new Date().toISOString(),
        };

        if (validated.status === "shipped") {
          updateData.shipped_at = new Date().toISOString();
        } else if (validated.status === "delivered") {
          updateData.delivered_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", validated.orderId)
          .eq("organization_id", organizationId)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          data,
          message: `Order status updated to ${validated.status}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to update order status",
        };
      }
    },
  },
  {
    name: "updatePaymentStatus",
    description: "Update the payment status of an order.",
    category: "orders",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order UUID" },
        paymentStatus: {
          type: "string",
          enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
        },
      },
      required: ["orderId", "paymentStatus"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = updatePaymentStatusSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data, error } = await supabase
          .from("orders")
          .update({
            payment_status: validated.paymentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", validated.orderId)
          .eq("organization_id", organizationId)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          data,
          message: `Payment status updated to ${validated.paymentStatus}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to update payment status",
        };
      }
    },
  },
  {
    name: "getPendingOrders",
    description: "Get all pending orders that need attention.",
    category: "orders",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 },
      },
    },
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get pending orders",
        };
      }
    },
  },
  {
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
          stats.byStatus[order.status] =
            (stats.byStatus[order.status] || 0) + 1;
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get order stats",
        };
      }
    },
  },
];
