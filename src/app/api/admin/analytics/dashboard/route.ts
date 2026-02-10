import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { 
  AuthenticationError,
  AuthorizationError 
} from "@/lib/api/errors";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";

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
      logger.error("User authentication failed:", { error: userError, requestId });
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
          "Analíticas avanzadas no están incluidas en tu plan. Actualiza a Pro o Premium."
        );
      }
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    const supabaseServiceRole = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    logger.debug("Fetching analytics for period:", {
      from: startDate.toISOString(),
      to: endDate.toISOString(),
      days: period,
      branchId: branchContext.branchId,
      requestId,
    });

    // Build queries with branch filtering
    let productsQuery = supabaseServiceRole
      .from("products")
      .select("id, name, price, category_id, inventory_quantity, created_at")
      .eq("status", "active");

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
      productsQuery = productsQuery.eq("branch_id", branchContext.branchId);
      ordersQuery = ordersQuery.eq("branch_id", branchContext.branchId);
      customersQuery = customersQuery.eq("branch_id", branchContext.branchId);
      quotesQuery = quotesQuery.eq("branch_id", branchContext.branchId);
      workOrdersQuery = workOrdersQuery.eq("branch_id", branchContext.branchId);
      appointmentsQuery = appointmentsQuery.eq(
        "branch_id",
        branchContext.branchId,
      );
    } else if (!branchContext.isSuperAdmin) {
      // Regular admin without branch - return empty data
      productsQuery = productsQuery.is("branch_id", null).limit(0);
      ordersQuery = ordersQuery.is("branch_id", null).limit(0);
      customersQuery = customersQuery.is("branch_id", null).limit(0);
      quotesQuery = quotesQuery.is("branch_id", null).limit(0);
      workOrdersQuery = workOrdersQuery.is("branch_id", null).limit(0);
      appointmentsQuery = appointmentsQuery.is("branch_id", null).limit(0);
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
    ]);

    const products = productsResult.data || [];
    const categories = categoriesResult.data || [];
    const ordersInPeriod = ordersResult.data || [];
    const customers = customersResult.data || [];
    const quotes = quotesResult.data || [];
    const workOrders = workOrdersResult.data || [];
    const appointments = appointmentsResult.data || [];
    const orderItems = orderItemsResult.data || [];

    // Filter order items to only include items from orders in the filtered set
    const orderIds = new Set(ordersInPeriod.map((o: any) => o.id));
    const filteredOrderItems = orderItems.filter((item: any) =>
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
      prevOrdersQuery = prevOrdersQuery.eq("branch_id", branchContext.branchId);
      prevWorkOrdersQuery = prevWorkOrdersQuery.eq(
        "branch_id",
        branchContext.branchId,
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
    // POS Sales Revenue
    const posRevenue = ordersInPeriod
      .filter(
        (o) =>
          o.is_pos_sale &&
          (o.payment_status === "paid" || o.status === "delivered"),
      )
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    // Work Orders Revenue
    const workOrdersRevenue = workOrders
      .filter((wo) => wo.payment_status === "paid")
      .reduce((sum, wo) => sum + Number(wo.total_amount || 0), 0);

    const totalRevenue = posRevenue + workOrdersRevenue;

    // Previous period revenue
    const prevPosRevenue = prevOrders
      .filter((o: any) => o.is_pos_sale && o.payment_status === "paid")
      .reduce(
        (sum: number, order: any) => sum + Number(order.total_amount || 0),
        0,
      );

    const prevWorkOrdersRevenue = prevWorkOrders
      .filter((wo: any) => wo.payment_status === "paid")
      .reduce((sum: number, wo: any) => sum + Number(wo.total_amount || 0), 0);

    const prevTotalRevenue = prevPosRevenue + prevWorkOrdersRevenue;
    const revenueGrowth =
      prevTotalRevenue > 0
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
        : 0;

    // ====================================
    // WORK ORDERS METRICS
    // ====================================
    const workOrdersByStatus: Record<string, number> = {};
    workOrders.forEach((wo: any) => {
      const status = wo.status || "quote";
      workOrdersByStatus[status] = (workOrdersByStatus[status] || 0) + 1;
    });

    const pendingWorkOrders = workOrders.filter((wo: any) =>
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
      (wo: any) => wo.status === "delivered",
    ).length;
    const cancelledWorkOrders = workOrders.filter(
      (wo: any) => wo.status === "cancelled",
    ).length;

    // Calculate average delivery time (from ordered to delivered)
    const deliveredWorkOrders = workOrders.filter(
      (wo: any) =>
        wo.status === "delivered" && wo.ordered_at && wo.delivered_at,
    );

    let avgDeliveryDays = 0;
    if (deliveredWorkOrders.length > 0) {
      const totalDays = deliveredWorkOrders.reduce((sum: number, wo: any) => {
        const ordered = new Date(wo.ordered_at);
        const delivered = new Date(wo.delivered_at);
        const days = Math.ceil(
          (delivered.getTime() - ordered.getTime()) / (1000 * 60 * 60 * 24),
        );
        return sum + days;
      }, 0);
      avgDeliveryDays = Math.round(totalDays / deliveredWorkOrders.length);
    }

    // ====================================
    // QUOTES METRICS
    // ====================================
    const quotesByStatus: Record<string, number> = {};
    quotes.forEach((q: any) => {
      const status = q.status || "draft";
      quotesByStatus[status] = (quotesByStatus[status] || 0) + 1;
    });

    const totalQuotes = quotes.length;
    const acceptedQuotes = quotes.filter(
      (q: any) => q.status === "accepted",
    ).length;
    const rejectedQuotes = quotes.filter(
      (q: any) => q.status === "rejected",
    ).length;
    const expiredQuotes = quotes.filter(
      (q: any) => q.status === "expired",
    ).length;
    const convertedQuotes = quotes.filter(
      (q: any) => q.status === "converted_to_work",
    ).length;

    const quoteConversionRate =
      totalQuotes > 0
        ? ((acceptedQuotes + convertedQuotes) / totalQuotes) * 100
        : 0;

    const avgQuoteValue =
      totalQuotes > 0
        ? quotes.reduce(
            (sum: number, q: any) => sum + Number(q.total_amount || 0),
            0,
          ) / totalQuotes
        : 0;

    // ====================================
    // APPOINTMENTS METRICS
    // ====================================
    const appointmentsByStatus: Record<string, number> = {};
    appointments.forEach((apt: any) => {
      const status = apt.status || "scheduled";
      appointmentsByStatus[status] = (appointmentsByStatus[status] || 0) + 1;
    });

    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(
      (apt: any) => apt.status === "completed",
    ).length;
    const cancelledAppointments = appointments.filter(
      (apt: any) => apt.status === "cancelled",
    ).length;
    const noShowAppointments = appointments.filter(
      (apt: any) => apt.status === "no_show",
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
    ordersInPeriod.forEach((o: any) => {
      if (o.customer_email) {
        customerOrderCounts[o.customer_email] =
          (customerOrderCounts[o.customer_email] || 0) + 1;
      }
    });
    workOrders.forEach((wo: any) => {
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
    // PRODUCTS METRICS
    // ====================================
    const lowStockProducts = products.filter(
      (p: any) =>
        (p.inventory_quantity || 0) > 0 &&
        (p.inventory_quantity || 0) <= (p.low_stock_threshold || 5),
    ).length;

    const outOfStockProducts = products.filter(
      (p: any) => (p.inventory_quantity || 0) === 0,
    ).length;

    // Top products by revenue
    const productStats: Record<string, any> = {};
    filteredOrderItems.forEach((item: any) => {
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
      .map((stat: any) => ({
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
      const prod = products.find((p: any) => p.id === product.id);
      if (prod) {
        const category = categories.find((c: any) => c.id === prod.category_id);
        product.category = category?.name || "Sin Categoría";
      }
    });

    // Category revenue
    const categoryRevenue: Record<string, number> = {};
    filteredOrderItems.forEach((item: any) => {
      const product = products.find((p: any) => p.id === item.product_id);
      if (product && product.category_id) {
        const category = categories.find(
          (c: any) => c.id === product.category_id,
        );
        const categoryName = category?.name || "Sin Categoría";
        categoryRevenue[categoryName] =
          (categoryRevenue[categoryName] || 0) + Number(item.total_price || 0);
      }
    });

    const categoryRevenueArray = Object.entries(categoryRevenue)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // ====================================
    // PAYMENT METHODS BREAKDOWN
    // ====================================
    const paymentMethods: Record<string, { count: number; revenue: number }> =
      {};

    ordersInPeriod.forEach((o: any) => {
      if (o.is_pos_sale && o.payment_method_type) {
        const method = o.payment_method_type;
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, revenue: 0 };
        }
        paymentMethods[method].count += 1;
        paymentMethods[method].revenue += Number(o.total_amount || 0);
      }
    });

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

      // Sales for this day
      const dayOrders = ordersInPeriod.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= currentDate && orderDate < nextDate;
      });

      const daySales = dayOrders
        .filter(
          (o: any) => o.payment_status === "paid" || o.status === "delivered",
        )
        .reduce(
          (sum: number, order: any) => sum + Number(order.total_amount || 0),
          0,
        );

      // Work orders revenue for this day
      const dayWorkOrders = workOrders.filter((wo: any) => {
        const woDate = new Date(wo.created_at);
        return woDate >= currentDate && woDate < nextDate;
      });
      const dayWorkOrdersRevenue = dayWorkOrders
        .filter((wo: any) => wo.payment_status === "paid")
        .reduce(
          (sum: number, wo: any) => sum + Number(wo.total_amount || 0),
          0,
        );

      salesTrends.push({
        date: currentDate.toISOString().split("T")[0],
        value: daySales + dayWorkOrdersRevenue,
        count: dayOrders.length + dayWorkOrders.length,
      });

      // New customers for this day
      const dayCustomers = customers.filter((customer: any) => {
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
      const dayQuotes = quotes.filter((q: any) => {
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
    // BUILD ANALYTICS RESPONSE
    // ====================================
    const analytics = {
      kpis: {
        totalRevenue,
        posRevenue,
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
          ordersInPeriod.length > 0 ? posRevenue / ordersInPeriod.length : 0,
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
      paymentMethods: Object.entries(paymentMethods).map(([method, data]) => ({
        method,
        count: data.count,
        revenue: data.revenue,
      })),
      trends: {
        sales: salesTrends,
        customers: customerTrends,
        workOrders: workOrderTrends,
        quotes: quoteTrends,
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

    // Use standardized success response
    return createApiSuccessResponse(
      { analytics },
      { requestId }
    );
  } catch (error) {
    logger.error("Analytics API error:", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Failed to fetch analytics data"),
      { requestId }
    );
  }
}
