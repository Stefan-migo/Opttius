import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

/**
 * Helper to get YYYY-MM-DD date string in local timezone (not UTC)
 */
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  logger.info("Dashboard API endpoint called");

  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      // Silently return 401 - this is expected when user is not authenticated
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    logger.info("Dashboard - Branch Context", {
      branchId: branchContext.branchId,
      isGlobalView: branchContext.isGlobalView,
      isSuperAdmin: branchContext.isSuperAdmin,
    });

    // Build branch filter function (Vision Global scoped to user's organization)
    const applyBranchFilter = (
      query: Parameters<typeof addBranchFilter>[0],
    ) => {
      return addBranchFilter(
        query,
        branchContext.branchId,
        branchContext.isSuperAdmin,
        branchContext.organizationId,
      );
    };

    // In global view, orders may have organization_id null (legacy) but branch_id set.
    // Fetch org branch IDs so we include orders by org_id OR by branch_id in org.
    let orgBranchIds: string[] = [];
    if (
      branchContext.isSuperAdmin &&
      !branchContext.branchId &&
      branchContext.organizationId
    ) {
      const { data: branches } = await supabase
        .from("branches")
        .select("id")
        .eq("organization_id", branchContext.organizationId);
      orgBranchIds = (branches || []).map((b: { id: string }) => b.id);
    }

    // Orders query: in global view include orders by organization_id OR by branch in org
    const ordersBaseQuery = supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          product_id,
          quantity,
          unit_price,
          total_price,
          product_name
        )
      `,
      )
      .order("created_at", { ascending: false });

    let ordersQuery;
    if (
      branchContext.isSuperAdmin &&
      !branchContext.branchId &&
      branchContext.organizationId &&
      orgBranchIds.length > 0
    ) {
      ordersQuery = ordersBaseQuery.or(
        `organization_id.eq.${branchContext.organizationId},branch_id.in.(${orgBranchIds.join(",")})`,
      );
    } else {
      ordersQuery = applyBranchFilter(ordersBaseQuery);
    }

    // Products query: include products of the branch OR global products (branch_id IS NULL)
    // This ensures that when a branch is selected, we still see products that aren't tied to any specific branch
    const productsBaseQuery = supabase
      .from("products")
      .select("*")
      .eq("status", "active");
    let productsQuery;

    if (branchContext.isSuperAdmin && !branchContext.branchId) {
      // Global View: filtering by organization_id is enough
      if (branchContext.organizationId) {
        productsQuery = productsBaseQuery.eq(
          "organization_id",
          branchContext.organizationId,
        );
      } else {
        productsQuery = applyBranchFilter(productsBaseQuery);
      }
    } else if (branchContext.branchId) {
      // Branch View: branch_id = current OR branch_id IS NULL, scoped to org
      productsQuery = productsBaseQuery
        .eq("organization_id", branchContext.organizationId)
        .or(`branch_id.eq.${branchContext.branchId},branch_id.is.null`);
    } else {
      productsQuery = applyBranchFilter(productsBaseQuery);
    }

    const [productsResult, ordersResult, customersResult] = await Promise.all([
      productsQuery,
      ordersQuery,
      applyBranchFilter(supabase.from("customers").select("*")),
    ]);

    if (productsResult.error) {
      logger.error("Error fetching products", productsResult.error);
    }
    if (ordersResult.error) {
      logger.error("Error fetching orders", ordersResult.error);
    }
    if (customersResult.error) {
      logger.error("Error fetching customers", customersResult.error);
    }

    const products = productsResult.data || [];
    const orders = ordersResult.data || [];
    const customers = customersResult.data || []; // Now from customers table, not profiles

    // We no longer strictly filter products by branch_id in post-processing
    // because we want to include global products (branch_id IS NULL).
    // The query above already handles the correct filtering.
    const filteredProducts = products;

    logger.info("Dashboard - Products fetched", {
      total: products.length,
      filtered: filteredProducts.length,
      branchId: branchContext.branchId,
      isGlobalView: branchContext.isGlobalView,
      sampleProducts: filteredProducts
        .slice(0, 3)
        .map((p: { id: string; name: string; branch_id: string | null }) => ({
          id: p.id,
          name: p.name,
          branch_id: p.branch_id,
        })),
    });

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // === PRODUCTS METRICS ===
    // Use filteredProducts instead of products
    const activeProducts = filteredProducts.filter(
      (p: { status: string }) => p.status === "active",
    );
    const lowStockProducts = activeProducts
      .filter(
        (p: { inventory_quantity?: number | null }) =>
          (p.inventory_quantity || 0) <= 5 && (p.inventory_quantity || 0) > 0,
      )
      .map(
        (p: {
          id: string;
          name: string;
          inventory_quantity?: number | null;
          slug: string;
        }) => ({
          id: p.id,
          name: p.name,
          currentStock: p.inventory_quantity || 0,
          threshold: 5,
          slug: p.slug,
        }),
      )
      .sort(
        (a: { currentStock: number }, b: { currentStock: number }) =>
          a.currentStock - b.currentStock,
      )
      .slice(0, 5);

    const outOfStockProducts = activeProducts.filter(
      (p: { inventory_quantity?: number | null }) =>
        (p.inventory_quantity || 0) === 0,
    ).length;

    // === ORDERS METRICS ===
    const pendingOrders = orders.filter(
      (o: { status: string }) => o.status === "pending",
    ).length;
    const processingOrders = orders.filter(
      (o: { status: string }) => o.status === "processing",
    ).length;
    const completedOrders = orders.filter(
      (o: { status: string }) => o.status === "completed",
    ).length;
    const failedOrders = orders.filter(
      (o: { status: string }) => o.status === "failed",
    ).length;

    // === REVENUE METRICS ===
    // Current month revenue (from completed or paid orders)
    const currentMonthOrders = orders.filter(
      (o: { created_at: string; status: string; payment_status?: string }) => {
        const orderDate = new Date(o.created_at);
        return (
          orderDate >= startOfMonth &&
          (o.status === "completed" || o.payment_status === "paid")
        );
      },
    );
    const currentMonthRevenue = currentMonthOrders.reduce(
      (sum: number, o: { total_amount?: number | null }) =>
        sum + (o.total_amount || 0),
      0,
    );

    // Last month revenue for comparison
    const lastMonthOrders = orders.filter(
      (o: { created_at: string; status: string; payment_status?: string }) => {
        const orderDate = new Date(o.created_at);
        return (
          orderDate >= startOfLastMonth &&
          orderDate <= endOfLastMonth &&
          (o.status === "completed" || o.payment_status === "paid")
        );
      },
    );
    const lastMonthRevenue = lastMonthOrders.reduce(
      (sum: number, o: { total_amount?: number | null }) =>
        sum + (o.total_amount || 0),
      0,
    );

    // Calculate revenue change
    const revenueChange =
      lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // === CUSTOMERS METRICS ===
    const newCustomers = customers.filter(
      (c: { created_at: string }) => new Date(c.created_at) >= thirtyDaysAgo,
    ).length;
    const returningCustomers = customers.length - newCustomers;

    // === APPOINTMENTS METRICS (Optical Shop) ===
    const today = new Date();
    const todayStr = getLocalDateString(today);

    // Filter appointments by organization AND branch (if selected)
    // Use or for global view to support legacy data where organization_id might be null but branch_id is in org
    let appointmentsQuery;

    if (
      branchContext.isSuperAdmin &&
      !branchContext.branchId &&
      branchContext.organizationId &&
      orgBranchIds.length > 0
    ) {
      // Global View: include by organization_id OR by branch in org (legacy)
      appointmentsQuery = supabase
        .from("appointments")
        .select("*")
        .or(
          `organization_id.eq.${branchContext.organizationId},branch_id.in.(${orgBranchIds.join(",")})`,
        );
    } else if (branchContext.branchId) {
      // Branch View: branch_id = current OR branch_id IS NULL (global appointments)
      // We don't strictly filter by organization_id here to stay resilient to null-org legacy data
      // but the branch_id isolation is provided by the branchId filter
      appointmentsQuery = supabase
        .from("appointments")
        .select("*")
        .or(`branch_id.eq.${branchContext.branchId},branch_id.is.null`);
    } else {
      appointmentsQuery = applyBranchFilter(
        supabase.from("appointments").select("*"),
      );
    }

    const { data: appointmentsData, error: appointmentsError } =
      await appointmentsQuery.eq("appointment_date", todayStr);

    if (appointmentsError) {
      logger.error("Error fetching appointments", appointmentsError);
    }

    const appointments = appointmentsData || [];

    logger.info("Dashboard - Appointments fetched", {
      count: appointments.length,
      today: todayStr,
      orgId: branchContext.organizationId,
      branchId: branchContext.branchId,
      isSuperAdmin: branchContext.isSuperAdmin,
    });

    const todayAppointments = appointments.length;
    const scheduledAppointments = appointments.filter(
      (a: { status: string }) => a.status === "scheduled",
    ).length;
    const confirmedAppointments = appointments.filter(
      (a: { status: string }) => a.status === "confirmed",
    ).length;
    const pendingAppointments = appointments.filter(
      (a: { status: string }) =>
        a.status === "scheduled" || a.status === "pending",
    ).length;

    // === WORK ORDERS METRICS (Optical Shop) ===
    const { data: workOrdersData } = await applyBranchFilter(
      supabase.from("lab_work_orders").select("*"),
    );

    const workOrders = workOrdersData || [];
    // Trabajos en progreso: enviados al lab, en lab, listos en lab, recibidos, montados, control calidad
    const inProgressWorkOrders = workOrders.filter((wo: { status: string }) =>
      [
        "sent_to_lab",
        "in_progress_lab",
        "ready_at_lab",
        "received_from_lab",
        "mounted",
        "quality_check",
      ].includes(wo.status),
    ).length;
    // Trabajos nuevos/pendientes: ordenados (recién creados, no enviados aún)
    const pendingWorkOrders = workOrders.filter(
      (wo: { status: string }) =>
        wo.status === "ordered" || wo.status === "quote",
    ).length;
    // Trabajos completados: entregados
    const completedWorkOrders = workOrders.filter(
      (wo: { status: string }) => wo.status === "delivered",
    ).length;

    // === QUOTES METRICS (Optical Shop) ===
    const { data: quotesData } = await applyBranchFilter(
      supabase.from("quotes").select("*"),
    );

    const quotes = quotesData || [];
    // Presupuestos pendientes: borrador, enviado (esperando respuesta)
    const pendingQuotes = quotes.filter(
      (q: { status: string; converted_to_work_order_id?: string | null }) =>
        ["draft", "sent"].includes(q.status) && !q.converted_to_work_order_id,
    ).length;
    // Presupuestos convertidos: aceptados o convertidos a trabajo
    const convertedQuotes = quotes.filter(
      (q: { status: string; converted_to_work_order_id?: string | null }) =>
        q.status === "accepted" || q.converted_to_work_order_id,
    ).length;

    // === TODAY'S APPOINTMENTS LIST ===
    let todayAppointmentsListQuery;
    if (
      branchContext.isSuperAdmin &&
      !branchContext.branchId &&
      branchContext.organizationId &&
      orgBranchIds.length > 0
    ) {
      todayAppointmentsListQuery = supabase
        .from("appointments")
        .select("*")
        .eq("appointment_date", todayStr)
        .or(
          `organization_id.eq.${branchContext.organizationId},branch_id.in.(${orgBranchIds.join(",")})`,
        );
    } else if (branchContext.branchId) {
      todayAppointmentsListQuery = supabase
        .from("appointments")
        .select("*")
        .eq("appointment_date", todayStr)
        .or(`branch_id.eq.${branchContext.branchId},branch_id.is.null`);
    } else {
      todayAppointmentsListQuery = applyBranchFilter(
        supabase
          .from("appointments")
          .select("*")
          .eq("appointment_date", todayStr),
      );
    }

    const { data: todayAppointmentsData } = await todayAppointmentsListQuery
      .order("appointment_time", { ascending: true })
      .limit(10);

    // Fetch customer data manually
    const customerIds = [
      ...new Set(
        (todayAppointmentsData || [])
          .map((a: { customer_id: string | null }) => a.customer_id)
          .filter(Boolean),
      ),
    ];
    const { data: customersData } =
      customerIds.length > 0
        ? await supabase
            .from("customers")
            .select("id, first_name, last_name, email, phone")
            .in("id", customerIds)
        : { data: [] };

    const todayAppointmentsList = (todayAppointmentsData || []).map(
      (apt: {
        id: string;
        customer_id: string | null;
        appointment_time: string;
        appointment_type: string | null;
        status: string;
        duration_minutes: number | null;
        notes?: string | null;
      }) => {
        const customer = customersData?.find(
          (c: { id: string }) => c.id === apt.customer_id,
        );
        return {
          id: apt.id,
          customer_name: customer
            ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
              customer.email ||
              "Cliente"
            : "Cliente",
          customer_email: customer?.email || null,
          appointment_time: apt.appointment_time,
          appointment_type: apt.appointment_type || "consultation",
          status: apt.status,
          duration_minutes: apt.duration_minutes || 30,
          notes: apt.notes,
        };
      },
    );

    // === REVENUE TREND (Last 7 days) ===
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOrders = orders.filter(
        (o: {
          created_at: string;
          status: string;
          payment_status?: string;
        }) => {
          const orderDate = new Date(o.created_at);
          return (
            orderDate >= date &&
            orderDate < nextDate &&
            (o.status === "completed" || o.payment_status === "paid")
          );
        },
      );

      const dayRevenue = dayOrders.reduce(
        (sum: number, o: { total_amount?: number | null }) =>
          sum + (o.total_amount || 0),
        0,
      );

      last7Days.push({
        date: getLocalDateString(date),
        revenue: dayRevenue,
        orders: dayOrders.length,
      });
    }

    // === ORDERS STATUS DISTRIBUTION (Last 30 days) ===
    const last30DaysOrders = orders.filter(
      (o: { created_at: string }) => new Date(o.created_at) >= thirtyDaysAgo,
    );

    const statusDistribution = {
      pending: last30DaysOrders.filter(
        (o: { status: string }) => o.status === "pending",
      ).length,
      processing: last30DaysOrders.filter(
        (o: { status: string }) => o.status === "processing",
      ).length,
      completed: last30DaysOrders.filter(
        (o: { status: string }) => o.status === "completed",
      ).length,
      failed: last30DaysOrders.filter(
        (o: { status: string }) => o.status === "failed",
      ).length,
      shipped: last30DaysOrders.filter(
        (o: { status: string }) => o.status === "shipped",
      ).length,
    };

    // === TOP PRODUCTS (by revenue) ===
    const productRevenue = new Map();

    orders
      .filter(
        (o: { status: string; payment_status?: string }) =>
          o.status === "completed" || o.payment_status === "paid",
      )
      .forEach(
        (order: {
          order_items?: Array<{
            product_name: string;
            total_price: number | null;
            quantity: number | null;
          }>;
        }) => {
          order.order_items?.forEach(
            (item: {
              product_name: string;
              total_price: number | null;
              quantity: number | null;
            }) => {
              const current = productRevenue.get(item.product_name) || {
                revenue: 0,
                quantity: 0,
              };
              productRevenue.set(item.product_name, {
                revenue: current.revenue + (item.total_price || 0),
                quantity: current.quantity + (item.quantity || 0),
              });
            },
          );
        },
      );

    const topProducts = Array.from(productRevenue.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    logger.info("Dashboard data fetched successfully");

    return NextResponse.json({
      branch: {
        id: branchContext.branchId,
        is_global: branchContext.isGlobalView,
        is_super_admin: branchContext.isSuperAdmin,
      },
      kpis: {
        products: {
          total: activeProducts.length,
          lowStock: lowStockProducts.length,
          outOfStock: outOfStockProducts,
        },
        orders: {
          total: orders.length,
          pending: pendingOrders,
          processing: processingOrders,
          completed: completedOrders,
          failed: failedOrders,
        },
        revenue: {
          current: currentMonthRevenue,
          previous: lastMonthRevenue,
          change: revenueChange,
          currency: "CLP",
        },
        customers: {
          total: customers.length,
          new: newCustomers,
          returning: returningCustomers,
        },
        appointments: {
          today: todayAppointments,
          scheduled: scheduledAppointments,
          confirmed: confirmedAppointments,
          pending: pendingAppointments,
        },
        workOrders: {
          total: workOrders.length,
          inProgress: inProgressWorkOrders,
          pending: pendingWorkOrders,
          completed: completedWorkOrders,
        },
        quotes: {
          total: quotes.length,
          pending: pendingQuotes,
          converted: convertedQuotes,
        },
      },
      todayAppointments: todayAppointmentsList,
      lowStockProducts,
      charts: {
        revenueTrend: last7Days,
        ordersStatus: statusDistribution,
        topProducts,
      },
    });
  } catch (error) {
    logger.error("Dashboard API error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
