import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getDashboardStatsSchema = z.object({});

export const getDashboardStatsTool: ToolDefinition = {
  name: "getDashboardStats",
  description:
    "Get comprehensive dashboard statistics including KPIs for products, orders, revenue, and customers.",
  category: "analytics",
  parameters: {
    type: "object",
    properties: {},
  },
  zodSchema: getDashboardStatsSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getDashboardStatsSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const [productsResult, ordersResult, customersResult] = await Promise.all(
        [
          supabase
            .from("products")
            .select("id, inventory_quantity, status, low_stock_threshold")
            .eq("organization_id", organizationId),
          supabase
            .from("orders")
            .select("status, payment_status, total_amount, created_at")
            .eq("organization_id", organizationId),
          supabase.from("profiles").select("id, created_at"),
        ],
      );

      const products = (productsResult.data || []) as Record<string, unknown>[];
      const orders = (ordersResult.data || []) as Record<string, unknown>[];
      const customers = (customersResult.data || []) as Record<string, unknown>[];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activeProducts = products.filter(
        (p: Record<string, unknown>) => p.status === "active",
      );
      const lowStockProducts = activeProducts.filter(
        (p: Record<string, unknown>) =>
          ((p.inventory_quantity as number) || 0) <= ((p.low_stock_threshold as number) || 5) &&
          ((p.inventory_quantity as number) || 0) > 0,
      ).length;
      const outOfStockProducts = activeProducts.filter(
        (p: Record<string, unknown>) => (p.inventory_quantity as number || 0) === 0,
      ).length;

      const pendingOrders = orders.filter(
        (o: Record<string, unknown>) => o.status === "pending",
      ).length;
      const processingOrders = orders.filter(
        (o: Record<string, unknown>) => o.status === "processing",
      ).length;
      const completedOrders = orders.filter(
        (o: Record<string, unknown>) => o.status === "completed",
      ).length;

      const currentMonthOrders = orders.filter((o: Record<string, unknown>) => {
        const orderDate = new Date(o.created_at as string);
        return (
          orderDate >= startOfMonth &&
          (o.status === "completed" || o.payment_status === "paid")
        );
      });
      const currentMonthRevenue = currentMonthOrders.reduce(
        (sum: number, o: Record<string, unknown>) => sum + ((o.total_amount as number) || 0),
        0,
      );

      const newCustomers = customers.filter(
        (c: Record<string, unknown>) => new Date(c.created_at as string) >= thirtyDaysAgo,
      ).length;

      const stats = {
        products: {
          total: activeProducts.length,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
        },
        orders: {
          total: orders.length,
          pending: pendingOrders,
          processing: processingOrders,
          completed: completedOrders,
        },
        revenue: {
          currentMonth: currentMonthRevenue,
          currency: context.currency || "USD",
        },
        customers: {
          total: customers.length,
          new: newCustomers,
        },
      };

      return {
        success: true,
        data: stats,
        message: "Dashboard statistics retrieved",
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get dashboard stats",
      };
    }
  },
};