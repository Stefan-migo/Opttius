import { unstable_cache } from "next/cache";
import { NextRequest } from "next/server";

import {
  computeInventoryMetrics,
  parseAnalyticsPeriod,
} from "@/lib/analytics/analytics-service";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/lib/supabase";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.debug("Analytics Dashboard API called", { requestId });

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("User authentication failed:", {
        error: userError,
        requestId,
      });
      throw new AuthenticationError("Unauthorized");
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      logger.warn("User is not admin:", { email: user.email, requestId });
      throw new AuthorizationError("Admin access required");
    }

    // Tier feature: advanced_analytics must be enabled for the organization
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    if (adminUser?.organization_id) {
      const { validateFeature } = await import("@/lib/saas/tier-validator");
      const hasAdvancedAnalytics = await validateFeature(
        adminUser.organization_id,
        "advanced_analytics",
      );
      if (!hasAdvancedAnalytics) {
        throw new AuthorizationError(
          "Analíticas avanzadas no están incluidas en tu plan. Actualiza a Pro o Premium.",
        );
      }
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    const supabaseServiceRole = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const period = parseAnalyticsPeriod(searchParams);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    // Org branch IDs for global view (Vision Global)
    let orgBranchIds: string[] = [];
    if (
      branchContext.isSuperAdmin &&
      !branchContext.branchId &&
      branchContext.organizationId
    ) {
      const { data: branches } = await supabaseServiceRole
        .from("branches")
        .select("id")
        .eq("organization_id", branchContext.organizationId);
      orgBranchIds = (branches || []).map((b: { id: string }) => b.id);
    }

    logger.debug("Fetching analytics for period:", {
      from: startDate.toISOString(),
      to: endDate.toISOString(),
      days: period,
      branchId: branchContext.branchId,
      requestId,
    });

    // Cache TTL: 3 min default, configurable via ANALYTICS_CACHE_TTL_SECONDS
    const cacheTtl = Number(process.env.ANALYTICS_CACHE_TTL_SECONDS) || 180;
    const cacheKey = [
      "analytics-dashboard",
      branchContext.organizationId ?? "none",
      branchContext.branchId ?? "global",
      String(period),
    ];

    const analytics = await unstable_cache(
      async () => {
        const supabaseServiceRole = createServiceRoleClient();

        // Cash register closures for POS revenue (demo has 12 months of closures)
        let closuresQuery = supabaseServiceRole
          .from("cash_register_closures")
          .select(
            "branch_id, closure_date, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales",
          )
          .in("status", ["confirmed", "closed"])
          .gte("closure_date", startDate.toISOString().split("T")[0])
          .lte("closure_date", endDate.toISOString().split("T")[0]);
        if (branchContext.branchId) {
          closuresQuery = closuresQuery.eq("branch_id", branchContext.branchId);
        } else if (orgBranchIds.length > 0) {
          closuresQuery = closuresQuery.in("branch_id", orgBranchIds);
        }

        // Build queries with branch filtering
        let productsQuery = supabaseServiceRole
          .from("products")
          .select("id, name, price, category_id, created_at")
          .eq("status", "active");

        // product_branch_stock for inventory metrics (replaces deprecated products.inventory_quantity)
        let productBranchStockQuery = supabaseServiceRole
          .from("product_branch_stock")
          .select("product_id, branch_id, quantity, low_stock_threshold");

        let ordersQuery = supabaseServiceRole
          .from("orders")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        let customersQuery = supabaseServiceRole
          .from("customers")
          .select("id, created_at");

        let quotesQuery = supabaseServiceRole
          .from("quotes")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        let workOrdersQuery = supabaseServiceRole
          .from("lab_work_orders")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        let appointmentsQuery = supabaseServiceRole
          .from("appointments")
          .select("*")
          .gte("appointment_date", startDate.toISOString().split("T")[0])
          .lte("appointment_date", endDate.toISOString().split("T")[0]);

        // Apply branch filters
        if (branchContext.branchId) {
          // Products: shared catalog - filter by org, not branch (stock is per-branch)
          let productsOrgId = branchContext.organizationId;
          if (!productsOrgId) {
            const { data: branchData } = await supabaseServiceRole
              .from("branches")
              .select("organization_id")
              .eq("id", branchContext.branchId)
              .single();
            productsOrgId = branchData?.organization_id ?? undefined;
          }
          productsQuery = productsOrgId
            ? productsQuery.eq("organization_id", productsOrgId)
            : productsQuery.eq("branch_id", branchContext.branchId);
          ordersQuery = ordersQuery.eq("branch_id", branchContext.branchId);
          customersQuery = customersQuery.eq(
            "branch_id",
            branchContext.branchId,
          );
          quotesQuery = quotesQuery.eq("branch_id", branchContext.branchId);
          workOrdersQuery = workOrdersQuery.eq(
            "branch_id",
            branchContext.branchId,
          );
          appointmentsQuery = appointmentsQuery.eq(
            "branch_id",
            branchContext.branchId,
          );
        } else if (
          branchContext.isSuperAdmin &&
          !branchContext.branchId &&
          orgBranchIds.length > 0
        ) {
          // Global view: filter by org branches
          ordersQuery = ordersQuery.in("branch_id", orgBranchIds);
          customersQuery = customersQuery.in("branch_id", orgBranchIds);
          quotesQuery = quotesQuery.in("branch_id", orgBranchIds);
          workOrdersQuery = workOrdersQuery.in("branch_id", orgBranchIds);
          appointmentsQuery = appointmentsQuery.in("branch_id", orgBranchIds);
          if (branchContext.organizationId) {
            productsQuery = productsQuery.eq(
              "organization_id",
              branchContext.organizationId,
            );
          }
        } else if (!branchContext.isSuperAdmin) {
          // Regular admin without branch - return empty data
          productsQuery = productsQuery.is("branch_id", null).limit(0);
          ordersQuery = ordersQuery.is("branch_id", null).limit(0);
          customersQuery = customersQuery.is("branch_id", null).limit(0);
          quotesQuery = quotesQuery.is("branch_id", null).limit(0);
          workOrdersQuery = workOrdersQuery.is("branch_id", null).limit(0);
          appointmentsQuery = appointmentsQuery.is("branch_id", null).limit(0);
          productBranchStockQuery = productBranchStockQuery.limit(0);
        }

        // Apply branch filter to product_branch_stock
        if (branchContext.branchId) {
          productBranchStockQuery = productBranchStockQuery.eq(
            "branch_id",
            branchContext.branchId,
          );
        } else if (orgBranchIds.length > 0) {
          productBranchStockQuery = productBranchStockQuery.in(
            "branch_id",
            orgBranchIds,
          );
        }

        // Optical internal support tickets (incidentes óptica)
        let supportOrgId = branchContext.organizationId;
        if (!supportOrgId && branchContext.branchId) {
          const { data: supportBranchData } = await supabaseServiceRole
            .from("branches")
            .select("organization_id")
            .eq("id", branchContext.branchId)
            .single();
          supportOrgId = supportBranchData?.organization_id ?? undefined;
        }

        let supportTicketsQuery = supabaseServiceRole
          .from("optical_internal_support_tickets")
          .select("id, status, category, resolution_time_minutes, created_at")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        if (supportOrgId) {
          supportTicketsQuery = supportTicketsQuery.eq(
            "organization_id",
            supportOrgId,
          );
          if (branchContext.branchId) {
            supportTicketsQuery = supportTicketsQuery.eq(
              "branch_id",
              branchContext.branchId,
            );
          } else if (orgBranchIds.length > 0) {
            supportTicketsQuery = supportTicketsQuery.or(
              `branch_id.is.null,branch_id.in.(${orgBranchIds.join(",")})`,
            );
          }
        } else {
          supportTicketsQuery = supportTicketsQuery.limit(0);
        }

        const [
          productsResult,
          categoriesResult,
          ordersResult,
          customersResult,
          quotesResult,
          workOrdersResult,
          appointmentsResult,
          orderItemsResult,
          closuresResult,
          productBranchStockResult,
          supportTicketsResult,
        ] = await Promise.all([
          productsQuery,
          supabaseServiceRole.from("categories").select("id, name, slug"),
          ordersQuery,
          customersQuery,
          quotesQuery,
          workOrdersQuery,
          appointmentsQuery,
          supabaseServiceRole
            .from("order_items")
            .select(
              "id, order_id, product_id, product_name, quantity, unit_price, total_price",
            ),
          closuresQuery,
          productBranchStockQuery,
          supportTicketsQuery,
        ]);

        const products = productsResult.data || [];
        const productBranchStock = productBranchStockResult.data || [];
        const supportTickets = supportTicketsResult.data || [];
        const categories = categoriesResult.data || [];
        const ordersInPeriod = ordersResult.data || [];
        const closuresInPeriod = closuresResult.data || [];
        const customers = customersResult.data || [];
        const quotes = quotesResult.data || [];
        const workOrders = workOrdersResult.data || [];
        const appointments = appointmentsResult.data || [];
        const orderItems = orderItemsResult.data || [];

        // Filter order items to only include items from orders in the filtered set
        const orderIds = new Set(ordersInPeriod.map((o: unknown) => o.id));
        const filteredOrderItems = orderItems.filter((item: unknown) =>
          orderIds.has(item.order_id),
        );

        // Calculate previous period for growth comparison
        const prevPeriodStart = new Date(startDate);
        prevPeriodStart.setDate(prevPeriodStart.getDate() - period);

        let prevOrdersQuery = supabaseServiceRole
          .from("orders")
          .select("total_amount, payment_status")
          .gte("created_at", prevPeriodStart.toISOString())
          .lt("created_at", startDate.toISOString());

        let prevWorkOrdersQuery = supabaseServiceRole
          .from("lab_work_orders")
          .select("total_amount, payment_status")
          .gte("created_at", prevPeriodStart.toISOString())
          .lt("created_at", startDate.toISOString());

        if (branchContext.branchId) {
          prevOrdersQuery = prevOrdersQuery.eq(
            "branch_id",
            branchContext.branchId,
          );
          prevWorkOrdersQuery = prevWorkOrdersQuery.eq(
            "branch_id",
            branchContext.branchId,
          );
        } else if (orgBranchIds.length > 0) {
          prevOrdersQuery = prevOrdersQuery.in("branch_id", orgBranchIds);
          prevWorkOrdersQuery = prevWorkOrdersQuery.in(
            "branch_id",
            orgBranchIds,
          );
        }

        const [prevOrdersResult, prevWorkOrdersResult] = await Promise.all([
          prevOrdersQuery,
          prevWorkOrdersQuery,
        ]);

        const prevOrders = prevOrdersResult.data || [];
        const prevWorkOrders = prevWorkOrdersResult.data || [];

        // ====================================
        // REVENUE CALCULATIONS
        // ====================================
        // POS Sales Revenue: prefer cash_register_closures when available (demo has 12 months)
        let posRevenue: number;
        let posTransactionCount: number;
        if (closuresInPeriod.length > 0) {
          posRevenue = closuresInPeriod.reduce(
            (sum: number, c: { total_sales?: number | null }) =>
              sum + (Number(c.total_sales) || 0),
            0,
          );
          posTransactionCount = closuresInPeriod.reduce(
            (sum: number, c: { total_transactions?: number | null }) =>
              sum + (Number(c.total_transactions) || 0),
            0,
          );
        } else {
          const posOrders = ordersInPeriod.filter(
            (o) =>
              o.is_pos_sale &&
              (o.payment_status === "paid" || o.status === "delivered"),
          );
          posRevenue = posOrders.reduce(
            (sum, order) => sum + Number(order.total_amount || 0),
            0,
          );
          posTransactionCount = posOrders.length;
        }

        // Work Orders Revenue
        const workOrdersRevenue = workOrders
          .filter((wo) => wo.payment_status === "paid")
          .reduce((sum, wo) => sum + Number(wo.total_amount || 0), 0);

        const totalRevenue = posRevenue + workOrdersRevenue;

        // Previous period revenue (fetch prev closures when we used closures)
        let prevPosRevenue: number;
        if (closuresInPeriod.length > 0) {
          let prevClosuresQuery = supabaseServiceRole
            .from("cash_register_closures")
            .select("total_sales")
            .in("status", ["confirmed", "closed"])
            .gte("closure_date", prevPeriodStart.toISOString().split("T")[0])
            .lt("closure_date", startDate.toISOString().split("T")[0]);
          if (branchContext.branchId) {
            prevClosuresQuery = prevClosuresQuery.eq(
              "branch_id",
              branchContext.branchId,
            );
          } else if (orgBranchIds.length > 0) {
            prevClosuresQuery = prevClosuresQuery.in("branch_id", orgBranchIds);
          }
          const { data: prevClosures } = await prevClosuresQuery;
          prevPosRevenue = (prevClosures || []).reduce(
            (sum: number, c: { total_sales?: number | null }) =>
              sum + (Number(c.total_sales) || 0),
            0,
          );
        } else {
          prevPosRevenue = prevOrders
            .filter(
              (o: unknown) => o.is_pos_sale && o.payment_status === "paid",
            )
            .reduce(
              (sum: number, order: unknown) =>
                sum + Number(order.total_amount || 0),
              0,
            );
        }

        const prevWorkOrdersRevenue = prevWorkOrders
          .filter((wo: unknown) => wo.payment_status === "paid")
          .reduce(
            (sum: number, wo: unknown) => sum + Number(wo.total_amount || 0),
            0,
          );

        const prevTotalRevenue = prevPosRevenue + prevWorkOrdersRevenue;
        const revenueGrowth =
          prevTotalRevenue > 0
            ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
            : 0;

        // ====================================
        // WORK ORDERS METRICS
        // ====================================
        const workOrdersByStatus: Record<string, number> = {};
        workOrders.forEach((wo: unknown) => {
          const status = wo.status || "quote";
          workOrdersByStatus[status] = (workOrdersByStatus[status] || 0) + 1;
        });

        const pendingWorkOrders = workOrders.filter((wo: unknown) =>
          [
            "quote",
            "ordered",
            "sent_to_lab",
            "received_from_lab",
            "mounted",
            "quality_check",
          ].includes(wo.status),
        ).length;

        const completedWorkOrders = workOrders.filter(
          (wo: unknown) => wo.status === "delivered",
        ).length;
        const cancelledWorkOrders = workOrders.filter(
          (wo: unknown) => wo.status === "cancelled",
        ).length;

        // Calculate average delivery time (from ordered to delivered)
        const deliveredWorkOrders = workOrders.filter(
          (wo: unknown) =>
            wo.status === "delivered" && wo.ordered_at && wo.delivered_at,
        );

        let avgDeliveryDays = 0;
        if (deliveredWorkOrders.length > 0) {
          const totalDays = deliveredWorkOrders.reduce(
            (sum: number, wo: unknown) => {
              const ordered = new Date(wo.ordered_at);
              const delivered = new Date(wo.delivered_at);
              const days = Math.ceil(
                (delivered.getTime() - ordered.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return sum + days;
            },
            0,
          );
          avgDeliveryDays = Math.round(totalDays / deliveredWorkOrders.length);
        }

        // ====================================
        // QUOTES METRICS
        // ====================================
        const quotesByStatus: Record<string, number> = {};
        quotes.forEach((q: unknown) => {
          const status = q.status || "draft";
          quotesByStatus[status] = (quotesByStatus[status] || 0) + 1;
        });

        const totalQuotes = quotes.length;
        const acceptedQuotes = quotes.filter(
          (q: unknown) => q.status === "accepted",
        ).length;
        const rejectedQuotes = quotes.filter(
          (q: unknown) => q.status === "rejected",
        ).length;
        const expiredQuotes = quotes.filter(
          (q: unknown) => q.status === "expired",
        ).length;
        const convertedQuotes = quotes.filter(
          (q: unknown) => q.status === "converted_to_work",
        ).length;

        const quoteConversionRate =
          totalQuotes > 0
            ? ((acceptedQuotes + convertedQuotes) / totalQuotes) * 100
            : 0;

        const avgQuoteValue =
          totalQuotes > 0
            ? quotes.reduce(
                (sum: number, q: unknown) => sum + Number(q.total_amount || 0),
                0,
              ) / totalQuotes
            : 0;

        // ====================================
        // APPOINTMENTS METRICS
        // ====================================
        const appointmentsByStatus: Record<string, number> = {};
        appointments.forEach((apt: unknown) => {
          const status = apt.status || "scheduled";
          appointmentsByStatus[status] =
            (appointmentsByStatus[status] || 0) + 1;
        });

        const totalAppointments = appointments.length;
        const completedAppointments = appointments.filter(
          (apt: unknown) => apt.status === "completed",
        ).length;
        const cancelledAppointments = appointments.filter(
          (apt: unknown) => apt.status === "cancelled",
        ).length;
        const noShowAppointments = appointments.filter(
          (apt: unknown) => apt.status === "no_show",
        ).length;

        const appointmentCompletionRate =
          totalAppointments > 0
            ? (completedAppointments / totalAppointments) * 100
            : 0;

        // ====================================
        // CUSTOMERS METRICS
        // ====================================
        const customersInPeriod = customers.filter(
          (c) =>
            new Date(c.created_at) >= startDate &&
            new Date(c.created_at) <= endDate,
        );
        const totalCustomers = customers.length;
        const newCustomers = customersInPeriod.length;

        // Customers with multiple orders/work orders (recurring)
        const customerOrderCounts: Record<string, number> = {};
        ordersInPeriod.forEach((o: unknown) => {
          if (o.customer_email) {
            customerOrderCounts[o.customer_email] =
              (customerOrderCounts[o.customer_email] || 0) + 1;
          }
        });
        workOrders.forEach((wo: unknown) => {
          // Work orders have customer_id, we'd need to join to get email
          // For now, count unique customer_ids
          if (wo.customer_id) {
            customerOrderCounts[wo.customer_id] =
              (customerOrderCounts[wo.customer_id] || 0) + 1;
          }
        });
        const recurringCustomers = Object.values(customerOrderCounts).filter(
          (count: number) => count > 1,
        ).length;

        // ====================================
        // PRODUCTS METRICS (from product_branch_stock via analytics-service)
        // ====================================
        const productIdsInCatalog = new Set(products.map((p: unknown) => p.id));
        const inventoryMetrics = computeInventoryMetrics(
          productBranchStock as Array<{
            product_id: string;
            branch_id: string;
            quantity: number;
            low_stock_threshold?: number | null;
          }>,
          productIdsInCatalog,
        );
        const lowStockProducts = inventoryMetrics.lowStock;
        const outOfStockProducts = inventoryMetrics.outOfStock;

        // Top products by revenue
        const productStats: Record<string, unknown> = {};
        filteredOrderItems.forEach((item: unknown) => {
          const productId = item.product_id;
          if (!productStats[productId]) {
            productStats[productId] = {
              id: productId,
              name: item.product_name || "Producto Sin Nombre",
              revenue: 0,
              quantity: 0,
              orders: new Set(),
            };
          }
          productStats[productId].revenue += Number(item.total_price || 0);
          productStats[productId].quantity += Number(item.quantity || 0);
          productStats[productId].orders.add(item.order_id);
        });

        const topProducts = Object.values(productStats)
          .map((stat: unknown) => ({
            id: stat.id,
            name: stat.name,
            category: "General",
            revenue: stat.revenue,
            quantity: stat.quantity,
            orders: stat.orders.size,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Map product categories
        topProducts.forEach((product) => {
          const prod = products.find((p: unknown) => p.id === product.id);
          if (prod) {
            const category = categories.find(
              (c: unknown) => c.id === prod.category_id,
            );
            product.category = category?.name || "Sin Categoría";
          }
        });

        // Category revenue
        const categoryRevenue: Record<string, number> = {};
        filteredOrderItems.forEach((item: unknown) => {
          const product = products.find(
            (p: unknown) => p.id === item.product_id,
          );
          if (product && product.category_id) {
            const category = categories.find(
              (c: unknown) => c.id === product.category_id,
            );
            const categoryName = category?.name || "Sin Categoría";
            categoryRevenue[categoryName] =
              (categoryRevenue[categoryName] || 0) +
              Number(item.total_price || 0);
          }
        });

        const categoryRevenueArray = Object.entries(categoryRevenue)
          .map(([category, revenue]) => ({ category, revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8);

        // ====================================
        // PAYMENT METHODS BREAKDOWN
        // ====================================
        const paymentMethods: Record<
          string,
          { count: number; revenue: number }
        > = {};

        if (closuresInPeriod.length > 0) {
          // Use closures payment breakdown when available
          const totalClosureRevenue = closuresInPeriod.reduce(
            (s: number, c: unknown) => s + (Number(c.total_sales) || 0),
            0,
          );
          const totalClosureTxns = closuresInPeriod.reduce(
            (s: number, c: unknown) => s + (Number(c.total_transactions) || 0),
            0,
          );
          closuresInPeriod.forEach((c: unknown) => {
            const addPayment = (method: string, amount: number) => {
              if (amount > 0) {
                if (!paymentMethods[method]) {
                  paymentMethods[method] = { count: 0, revenue: 0 };
                }
                paymentMethods[method].revenue += Number(amount);
              }
            };
            addPayment("cash", Number(c.cash_sales) || 0);
            addPayment("debit_card", Number(c.debit_card_sales) || 0);
            addPayment("credit_card", Number(c.credit_card_sales) || 0);
            addPayment("installments", Number(c.installments_sales) || 0);
            addPayment("other", Number(c.other_payment_sales) || 0);
          });
          // Approximate count by revenue proportion
          if (totalClosureRevenue > 0 && totalClosureTxns > 0) {
            Object.keys(paymentMethods).forEach((method) => {
              const rev = paymentMethods[method].revenue;
              paymentMethods[method].count =
                Math.round((rev / totalClosureRevenue) * totalClosureTxns) || 1;
            });
          }
        } else {
          ordersInPeriod.forEach((o: unknown) => {
            if (o.is_pos_sale && o.payment_method_type) {
              const method = o.payment_method_type;
              if (!paymentMethods[method]) {
                paymentMethods[method] = { count: 0, revenue: 0 };
              }
              paymentMethods[method].count += 1;
              paymentMethods[method].revenue += Number(o.total_amount || 0);
            }
          });
        }

        // ====================================
        // DAILY TRENDS
        // ====================================
        const salesTrends = [];
        const customerTrends = [];
        const workOrderTrends = [];
        const quoteTrends = [];

        for (let i = 0; i < period; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + i);
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          const dateStr = currentDate.toISOString().split("T")[0];

          // Sales for this day: use closures when available, else orders
          let daySales: number;
          let dayOrderCount: number;
          if (closuresInPeriod.length > 0) {
            const dayClosures = closuresInPeriod.filter((c: unknown) => {
              const d = String(c.closure_date).split("T")[0];
              return d === dateStr;
            });
            daySales = dayClosures.reduce(
              (s: number, c: unknown) => s + (Number(c.total_sales) || 0),
              0,
            );
            dayOrderCount = dayClosures.reduce(
              (s: number, c: unknown) =>
                s + (Number(c.total_transactions) || 0),
              0,
            );
          } else {
            const dayOrders = ordersInPeriod.filter((order: unknown) => {
              const orderDate = new Date(order.created_at);
              return orderDate >= currentDate && orderDate < nextDate;
            });
            daySales = dayOrders
              .filter(
                (o: unknown) =>
                  o.payment_status === "paid" || o.status === "delivered",
              )
              .reduce(
                (sum: number, order: unknown) =>
                  sum + Number(order.total_amount || 0),
                0,
              );
            dayOrderCount = dayOrders.length;
          }

          // Work orders revenue for this day
          const dayWorkOrders = workOrders.filter((wo: unknown) => {
            const woDate = new Date(wo.created_at);
            return woDate >= currentDate && woDate < nextDate;
          });
          const dayWorkOrdersRevenue = dayWorkOrders
            .filter((wo: unknown) => wo.payment_status === "paid")
            .reduce(
              (sum: number, wo: unknown) => sum + Number(wo.total_amount || 0),
              0,
            );

          salesTrends.push({
            date: dateStr,
            value: daySales + dayWorkOrdersRevenue,
            count: dayOrderCount + dayWorkOrders.length,
          });

          // New customers for this day
          const dayCustomers = customers.filter((customer: unknown) => {
            const customerDate = new Date(customer.created_at);
            return customerDate >= currentDate && customerDate < nextDate;
          });

          customerTrends.push({
            date: currentDate.toISOString().split("T")[0],
            value: dayCustomers.length,
            count: dayCustomers.length,
          });

          // Work orders for this day
          workOrderTrends.push({
            date: currentDate.toISOString().split("T")[0],
            value: dayWorkOrders.length,
            count: dayWorkOrders.length,
          });

          // Quotes for this day
          const dayQuotes = quotes.filter((q: unknown) => {
            const quoteDate = new Date(q.created_at);
            return quoteDate >= currentDate && quoteDate < nextDate;
          });

          quoteTrends.push({
            date: currentDate.toISOString().split("T")[0],
            value: dayQuotes.length,
            count: dayQuotes.length,
          });
        }

        // ====================================
        // SUPPORT METRICS (optical_internal_support_tickets)
        // ====================================
        const supportByStatus: Record<string, number> = {};
        const supportByCategory: Record<string, number> = {};
        supportTickets.forEach((t: unknown) => {
          const status = t.status || "open";
          supportByStatus[status] = (supportByStatus[status] || 0) + 1;
          const category = t.category || "other";
          supportByCategory[category] = (supportByCategory[category] || 0) + 1;
        });

        const openSupportStatuses = [
          "open",
          "assigned",
          "in_progress",
          "waiting_customer",
        ];
        const openTickets = supportTickets.filter((t: unknown) =>
          openSupportStatuses.includes(t.status || ""),
        ).length;
        const resolvedTickets = supportTickets.filter(
          (t: unknown) => t.status === "resolved" || t.status === "closed",
        ).length;

        const ticketsWithResolutionTime = supportTickets.filter(
          (t: unknown) => t.resolution_time_minutes != null,
        );
        const avgResolutionMinutes =
          ticketsWithResolutionTime.length > 0
            ? Math.round(
                ticketsWithResolutionTime.reduce(
                  (sum: number, t: unknown) =>
                    sum + (t.resolution_time_minutes || 0),
                  0,
                ) / ticketsWithResolutionTime.length,
              )
            : null;

        const supportTrends = [];
        for (let i = 0; i < period; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + i);
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          const dayTickets = supportTickets.filter((t: unknown) => {
            const d = new Date(t.created_at);
            return d >= currentDate && d < nextDate;
          });
          supportTrends.push({
            date: currentDate.toISOString().split("T")[0],
            value: dayTickets.length,
            count: dayTickets.length,
          });
        }

        // ====================================
        // BUILD ANALYTICS RESPONSE
        // ====================================
        const analytics = {
          kpis: {
            totalRevenue,
            posRevenue,
            posTransactionCount,
            workOrdersRevenue,
            revenueGrowth,
            totalOrders: ordersInPeriod.length,
            totalWorkOrders: workOrders.length,
            totalQuotes,
            totalAppointments,
            totalCustomers,
            newCustomers,
            recurringCustomers,
            avgOrderValue:
              posTransactionCount > 0
                ? posRevenue / posTransactionCount
                : ordersInPeriod.length > 0
                  ? posRevenue / ordersInPeriod.length
                  : 0,
            avgWorkOrderValue:
              workOrders.length > 0 ? workOrdersRevenue / workOrders.length : 0,
            avgQuoteValue,
            quoteConversionRate,
            appointmentCompletionRate,
            avgDeliveryDays,
          },
          workOrders: {
            total: workOrders.length,
            pending: pendingWorkOrders,
            completed: completedWorkOrders,
            cancelled: cancelledWorkOrders,
            byStatus: workOrdersByStatus,
          },
          quotes: {
            total: totalQuotes,
            accepted: acceptedQuotes,
            rejected: rejectedQuotes,
            expired: expiredQuotes,
            converted: convertedQuotes,
            byStatus: quotesByStatus,
            conversionRate: quoteConversionRate,
          },
          appointments: {
            total: totalAppointments,
            completed: completedAppointments,
            cancelled: cancelledAppointments,
            noShow: noShowAppointments,
            byStatus: appointmentsByStatus,
            completionRate: appointmentCompletionRate,
          },
          products: {
            total: products.length,
            lowStock: lowStockProducts,
            outOfStock: outOfStockProducts,
            topProducts,
            categoryRevenue: categoryRevenueArray,
          },
          paymentMethods: Object.entries(paymentMethods).map(
            ([method, data]) => ({
              method,
              count: data.count,
              revenue: data.revenue,
            }),
          ),
          trends: {
            sales: salesTrends,
            customers: customerTrends,
            workOrders: workOrderTrends,
            quotes: quoteTrends,
            supportTickets: supportTrends,
          },
          support: {
            total: supportTickets.length,
            open: openTickets,
            resolved: resolvedTickets,
            avgResolutionMinutes,
            byStatus: supportByStatus,
            byCategory: supportByCategory,
            trends: supportTrends,
          },
          period: {
            from: startDate.toISOString().split("T")[0],
            to: endDate.toISOString().split("T")[0],
            days: period,
          },
        };

        logger.info("Analytics calculated successfully", {
          period,
          branchId: branchContext.branchId,
          kpis: analytics.kpis,
          requestId,
        });

        return analytics;
      },
      cacheKey,
      { revalidate: cacheTtl },
    )();

    // Use standardized success response
    return createApiSuccessResponse({ analytics }, { requestId });
  } catch (error) {
    logger.error("Analytics API error:", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error
        ? error
        : new Error("Failed to fetch analytics data"),
      { requestId },
    );
  }
}
