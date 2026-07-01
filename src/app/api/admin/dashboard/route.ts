import { NextRequest } from "next/server";

import { computeInventoryMetrics } from "@/lib/analytics/analytics-service";
import { type MvKpiRow, computeDashboardKpis } from "@/lib/analytics/compute-dashboard-kpis";
import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  logger.info("Dashboard API endpoint called");

  try {
    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check admin authorization
    const { data: userData, error: userError } = await getUser();
    const user = userData?.user;

    if (userError || !user) {
      return createApiErrorResponse(new AuthenticationError("Unauthorized"));
    }

    // Check admin authorization using service role
    const { createServiceRoleClient } = await import("@/utils/supabase/server");
    const serviceSupabase = createServiceRoleClient();

    const { data: isAdmin } = await serviceSupabase.rpc("is_admin", {
      user_id: user.id,
    });

    if (!isAdmin) {
      logger.warn("Admin access denied for user", {
        userId: user.id,
        email: user.email,
      });
      return createApiErrorResponse(
        new AuthorizationError("Admin access required"),
      );
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "7";
    const periodDays = Math.min(
      365,
      Math.max(7, parseInt(periodParam, 10) || 7),
    );

    logger.info("Dashboard - Branch Context", {
      branchId: branchContext.branchId,
      isGlobalView: branchContext.isGlobalView,
      isSuperAdmin: branchContext.isSuperAdmin,
    });

    // Build branch filter function
    const applyBranchFilterFn = (
      query: Parameters<typeof addBranchFilter>[0],
    ) => {
      return addBranchFilter(
        query,
        branchContext.branchId,
        branchContext.isSuperAdmin,
        branchContext.organizationId,
      );
    };

    // Date ranges
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const trendStart = new Date(
      now.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );
    // MV range covers both current trend period and month-over-month comparison
    const mvStartDate =
      startOfLastMonth < trendStart ? startOfLastMonth : trendStart;
    const mvStartStr = getLocalDateString(mvStartDate);

    // In global view, fetch org branch IDs for legacy data queries
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

    // Build scoped filter for legacy tables (appointments, etc.)
    const buildLegacyScope = (query: unknown) => {
      if (
        branchContext.isSuperAdmin &&
        !branchContext.branchId &&
        branchContext.organizationId &&
        orgBranchIds.length > 0
      ) {
        return query.or(
          `organization_id.eq.${branchContext.organizationId},branch_id.in.(${orgBranchIds.join(",")})`,
        );
      }
      if (branchContext.branchId) {
        return query.eq("branch_id", branchContext.branchId);
      }
      return applyBranchFilterFn(query);
    };

    // Products query
    const productsBaseQuery = supabase
      .from("products")
      .select("*")
      .eq("status", "active");
    let productsQuery: unknown;

    if (branchContext.branchId) {
      let orgId = branchContext.organizationId;
      if (!orgId) {
        const { data: branchData } = await supabase
          .from("branches")
          .select("organization_id")
          .eq("id", branchContext.branchId)
          .single();
        orgId = branchData?.organization_id ?? undefined;
      }
      productsQuery = productsBaseQuery.eq(
        "organization_id",
        orgId || "00000000-0000-0000-0000-000000000000",
      );
    } else if (branchContext.isSuperAdmin && branchContext.organizationId) {
      productsQuery = productsBaseQuery.eq(
        "organization_id",
        branchContext.organizationId,
      );
    } else {
      productsQuery = applyBranchFilterFn(productsBaseQuery);
    }

    // Product branch stock for inventory metrics
    let productBranchStockQuery = supabase
      .from("product_branch_stock")
      .select("product_id, branch_id, quantity, low_stock_threshold");
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
    } else {
      productBranchStockQuery = productBranchStockQuery.limit(0);
    }

    // === MV Query — replaces full order/work_order/quotes/closure fetches ===
    let mvQuery = supabase
      .from("mv_daily_kpis")
      .select("*")
      .gte("day", mvStartStr)
      .lte("day", todayStr);

    if (branchContext.organizationId) {
      mvQuery = mvQuery.eq("organization_id", branchContext.organizationId);
    }
    if (branchContext.branchId) {
      mvQuery = mvQuery.eq("branch_id", branchContext.branchId);
    }

    // === Lightweight order status aggregation ===
    // Replaces in-memory filtering of full orders list
    const ordersAggQuery = supabase
      .from("orders")
      .select("status, created_at, total_amount, payment_status")
      .gte("created_at", startOfLastMonth.toISOString());

    const ordersAggScoped = buildLegacyScope(ordersAggQuery);

    // === Lightweight quotes query ===
    // Replaces in-memory filtering of full quotes list
    const quotesQuery = supabase
      .from("quotes")
      .select("id, status, converted_to_work_order_id");

    const quotesScoped = buildLegacyScope(quotesQuery);

    // === Run parallel queries ===
    const [
      productsResult,
      mvResult,
      customersResult,
      productBranchStockResult,
      ordersAggResult,
      quotesAggResult,
    ] = await Promise.all([
      productsQuery,
      mvQuery,
      applyBranchFilterFn(supabase.from("customers").select("*")),
      productBranchStockQuery,
      ordersAggScoped,
      quotesScoped,
    ]);

    if (productsResult.error) {
      logger.error("Error fetching products", productsResult.error);
    }
    if (mvResult.error) {
      logger.error("Error fetching MV KPIs", mvResult.error);
    }
    if (customersResult.error) {
      logger.error("Error fetching customers", customersResult.error);
    }

    const products = productsResult.data || [];
    const productBranchStock = productBranchStockResult?.data || [];
    const customers = customersResult.data || [];
    const ordersLight = ordersAggResult.data || [];
    const quotesLight = quotesAggResult.data || [];
    // ponytail: MV rows are typed as MvKpiRow — Supabase returns matching shape
    const mvRows = (mvResult.data || []) as unknown as MvKpiRow[];

    // === Compute KPIs from MV ===
    const mvKpis = computeDashboardKpis(mvRows, now);

    // === Products metrics (from product_branch_stock) ===
    const activeProducts = products.filter(
      (p: { status: string }) => p.status === "active",
    );
    const productIdsInCatalog = new Set<string>(
      activeProducts.map((p: { id: string }) => p.id),
    );
    const inventoryMetrics = computeInventoryMetrics(
      productBranchStock as Array<{
        product_id: string;
        branch_id: string;
        quantity: number;
        low_stock_threshold?: number | null;
      }>,
      productIdsInCatalog,
      {
        products: activeProducts.map((p: unknown) => ({
          id: (p as { id: string }).id,
          name: (p as { name: string }).name,
          slug: (p as { slug: string }).slug,
        })),
        maxLowStockList: 5,
      },
    );
    const lowStockProducts = inventoryMetrics.lowStockProductsList ?? [];
    const outOfStockProducts = inventoryMetrics.outOfStock;

    // === Orders status breakdown (from lightweight aggregation) ===
    const pendingOrders = ordersLight.filter(
      (o: { status: string }) => o.status === "pending",
    ).length;
    const processingOrders = ordersLight.filter(
      (o: { status: string }) => o.status === "processing",
    ).length;
    const completedOrders = ordersLight.filter(
      (o: { status: string }) => o.status === "completed",
    ).length;
    const failedOrders = ordersLight.filter(
      (o: { status: string }) => o.status === "failed",
    ).length;
    const shippedOrders = ordersLight.filter(
      (o: { status: string }) => o.status === "shipped",
    ).length;

    // Orders status distribution chart (last 30 days)
    const last30DayOrders = ordersLight.filter(
      (o: { created_at: string }) => new Date(o.created_at) >= thirtyDaysAgo,
    );
    const statusDistribution = {
      pending: last30DayOrders.filter(
        (o: { status: string }) => o.status === "pending",
      ).length,
      processing: last30DayOrders.filter(
        (o: { status: string }) => o.status === "processing",
      ).length,
      completed: last30DayOrders.filter(
        (o: { status: string }) => o.status === "completed",
      ).length,
      failed: last30DayOrders.filter(
        (o: { status: string }) => o.status === "failed",
      ).length,
      shipped: last30DayOrders.filter(
        (o: { status: string }) => o.status === "shipped",
      ).length,
    };

    // === Customers metrics ===
    const newCustomers = customers.filter(
      (c: { created_at: string }) => new Date(c.created_at) >= thirtyDaysAgo,
    ).length;
    const returningCustomers = customers.length - newCustomers;

    // === Quotes breakdown ===
    const pendingQuotes = quotesLight.filter(
      (q: { status: string; converted_to_work_order_id?: string | null }) =>
        ["draft", "sent"].includes(q.status) && !q.converted_to_work_order_id,
    ).length;
    const convertedQuotes = quotesLight.filter(
      (q: { status: string; converted_to_work_order_id?: string | null }) =>
        q.status === "accepted" || q.converted_to_work_order_id,
    ).length;

    // === Today's appointments count ===
    let appointmentsQuery;

    if (
      branchContext.isSuperAdmin &&
      !branchContext.branchId &&
      branchContext.organizationId &&
      orgBranchIds.length > 0
    ) {
      appointmentsQuery = supabase
        .from("appointments")
        .select("*")
        .eq("appointment_date", todayStr)
        .or(
          `organization_id.eq.${branchContext.organizationId},branch_id.in.(${orgBranchIds.join(",")})`,
        );
    } else if (branchContext.branchId) {
      appointmentsQuery = supabase
        .from("appointments")
        .select("*")
        .eq("appointment_date", todayStr)
        .or(`branch_id.eq.${branchContext.branchId},branch_id.is.null`);
    } else {
      appointmentsQuery = applyBranchFilterFn(
        supabase
          .from("appointments")
          .select("*")
          .eq("appointment_date", todayStr),
      );
    }

    const { data: appointmentsData, error: appointmentsError } =
      await appointmentsQuery;

    if (appointmentsError) {
      logger.error("Error fetching appointments", appointmentsError);
    }

    const appointments = appointmentsData || [];

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

    // === Today's appointments list ===
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
      todayAppointmentsListQuery = applyBranchFilterFn(
        supabase
          .from("appointments")
          .select("*")
          .eq("appointment_date", todayStr),
      );
    }

    const { data: todayAppointmentsData } = await todayAppointmentsListQuery
      .order("appointment_time", { ascending: true })
      .limit(10);

    // Fetch customer names for the appointment list
    const customerIds = [
      ...new Set(
        (todayAppointmentsData || [])
          .map((a: { customer_id: string | null }) => a.customer_id)
          .filter(Boolean),
      ),
    ];
    const { data: customersForAppts } =
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
        const customer = customersForAppts?.find(
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

    // === Top products (by revenue) ===
    // ponytail: period-scoped orders query for top products replaces full fetch
    const topProductsQuery = supabase
      .from("orders")
      .select(
        `
        order_items (
          product_name,
          total_price,
          quantity
        )
      `,
      )
      .or("status.eq.completed,payment_status.eq.paid")
      .gte("created_at", startOfLastMonth.toISOString());

    const topProductsScoped = buildLegacyScope(topProductsQuery);

    const { data: topProductsData } = await topProductsScoped;

    const productRevenue = new Map();
    (topProductsData || []).forEach(
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

    return createApiSuccessResponse({
      branch: {
        id: branchContext.branchId,
        is_global: branchContext.isGlobalView,
        is_super_admin: branchContext.isSuperAdmin,
      },
      kpis: {
        products: {
          total: activeProducts.length,
          lowStock: inventoryMetrics.lowStock,
          outOfStock: outOfStockProducts,
        },
        orders: {
          total: mvKpis.orders.total,
          pending: pendingOrders,
          processing: processingOrders,
          completed: completedOrders,
          failed: failedOrders,
        },
        revenue: mvKpis.revenue,
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
        workOrders: mvKpis.workOrders,
        quotes: {
          total: mvKpis.quotes.total,
          pending: pendingQuotes,
          converted: convertedQuotes,
        },
      },
      todayAppointments: todayAppointmentsList,
      lowStockProducts,
      charts: {
        revenueTrend: mvKpis.charts.revenueTrend,
        ordersStatus: statusDistribution,
        topProducts,
      },
    });
  } catch (error) {
    logger.error("Dashboard API error", error as Error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
