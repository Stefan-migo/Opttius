import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";

const getDashboardStatsSchema = z.object({});

const getRevenueTrendSchema = z.object({
  days: z.number().default(30),
});

const getTopProductsSchema = z.object({
  limit: z.number().default(10),
  days: z.number().default(30),
});

const getSalesReportSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  days: z.number().default(30),
});

export const analyticsTools: ToolDefinition[] = [
  {
    name: "getDashboardStats",
    description:
      "Get comprehensive dashboard statistics including KPIs for products, orders, revenue, and customers.",
    category: "analytics",
    parameters: {
      type: "object",
      properties: {},
    },
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

        const [productsResult, ordersResult, customersResult] =
          await Promise.all([
            supabase
              .from("products")
              .select("id, inventory_quantity, status, low_stock_threshold")
              .eq("organization_id", organizationId),
            supabase
              .from("orders")
              .select("status, payment_status, total_amount, created_at")
              .eq("organization_id", organizationId),
            supabase.from("profiles").select("id, created_at"),
          ]);

        const products = productsResult.data || [];
        const orders = ordersResult.data || [];
        const customers = customersResult.data || [];

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        );

        const activeProducts = products.filter((p) => p.status === "active");
        const lowStockProducts = activeProducts.filter(
          (p: any) =>
            (p.inventory_quantity || 0) <= (p.low_stock_threshold || 5) &&
            (p.inventory_quantity || 0) > 0,
        ).length;
        const outOfStockProducts = activeProducts.filter(
          (p) => (p.inventory_quantity || 0) === 0,
        ).length;

        const pendingOrders = orders.filter(
          (o) => o.status === "pending",
        ).length;
        const processingOrders = orders.filter(
          (o) => o.status === "processing",
        ).length;
        const completedOrders = orders.filter(
          (o) => o.status === "completed",
        ).length;

        const currentMonthOrders = orders.filter((o) => {
          const orderDate = new Date(o.created_at);
          return (
            orderDate >= startOfMonth &&
            (o.status === "completed" || o.payment_status === "paid")
          );
        });
        const currentMonthRevenue = currentMonthOrders.reduce(
          (sum, o) => sum + (o.total_amount || 0),
          0,
        );

        const newCustomers = customers.filter(
          (c) => new Date(c.created_at) >= thirtyDaysAgo,
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get dashboard stats",
        };
      }
    },
  },
  {
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
        orders?.forEach((order) => {
          const date = new Date(order.created_at).toISOString().split("T")[0];
          dailyRevenue[date] =
            (dailyRevenue[date] || 0) + (order.total_amount || 0);
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get revenue trend",
        };
      }
    },
  },
  {
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

        orderItems?.forEach((item) => {
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get top products",
        };
      }
    },
  },
  {
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
            (o) => o.payment_status === "paid" || o.status === "completed",
          ) || [];
        const totalRevenue = paidOrders.reduce(
          (sum, o) => sum + (o.total_amount || 0),
          0,
        );
        const totalOrders = orders?.length || 0;
        const totalItems =
          orders?.reduce((sum, o) => sum + (o.order_items?.length || 0), 0) ||
          0;

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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to generate sales report",
        };
      }
    },
  },
];
