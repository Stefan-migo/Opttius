import { unstable_cache } from "next/cache";
import { NextRequest } from "next/server";

import {
  computeInventoryMetrics,
  parseAnalyticsPeriod,
} from "@/lib/analytics/analytics-service";
import {
  addBranchFilter,
  addBranchFilterForBranchScopedTable,
  getBranchContext,
} from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest, createServiceRoleClient } from "@/utils/supabase/server";
import type { MvKpiRow } from "@/lib/analytics/compute-dashboard-kpis";
import { computeAnalyticsMvData } from "@/lib/analytics/compute-analytics-kpis";

export const dynamic = "force-dynamic";

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Build a branch-scoped filter for tables that have branch_id but NOT organization_id.
 * Works inside unstable_cache (no closure dependency on orgBranchIds).
 */
// ponytail: query is a Supabase query builder typed at call site
function scopeByBranchIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  branchId: string | null,
  orgBranchIds: string[],
): any {
  if (branchId) return query.eq("branch_id", branchId);
  if (orgBranchIds.length > 0) return query.in("branch_id", orgBranchIds);
  return query.limit(0);
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.debug("Analytics Dashboard API called", { requestId });

    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await getUser();
    if (userError || !user) {
      logger.error("User authentication failed:", { error: userError, requestId });
      return createApiErrorResponse(new AuthenticationError("Unauthorized"));
    }

    const { data: isAdmin } = await supabase.rpc("is_admin", {
      user_id: user.id,
    });
    if (!isAdmin) {
      logger.warn("User is not admin:", { email: user.email, requestId });
      return createApiErrorResponse(new AuthorizationError("Admin access required"));
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
        return createApiErrorResponse(
          new AuthorizationError(
            "Analíticas avanzadas no están incluidas en tu plan. Actualiza a Pro o Premium.",
          ),
        );
      }
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Parse period
    const { searchParams } = new URL(request.url);
    const period = parseAnalyticsPeriod(searchParams);

    // Date ranges
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();
    const periodStartStr = getLocalDateString(startDate);
    const periodEndStr = getLocalDateString(endDate);

    // Previous period for growth comparison
    const prevPeriodStart = new Date(startDate);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - period);
    const prevPeriodStartStr = getLocalDateString(prevPeriodStart);

    // Org branch IDs for global view (Vision Global)
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

    const {
      branchId,
      isSuperAdmin,
      organizationId: orgId,
    } = branchContext;

    // Cache TTL: 3 min default
    const cacheTtl = Number(process.env.ANALYTICS_CACHE_TTL_SECONDS) || 180;
    const cacheKey = [
      "analytics-dashboard",
      orgId ?? "none",
      branchId ?? "global",
      String(period),
    ];

    const analytics = await unstable_cache(
      async () => {
        const svc = createServiceRoleClient();

        // ================================================================
        // MV query — replaces full table fetches + in-memory aggregation
        // ================================================================
        let mvQuery = svc
          .from("mv_daily_kpis")
          .select("*")
          .gte("day", prevPeriodStartStr) // wider range for growth calculation
          .lte("day", periodEndStr);

        if (orgId) {
          mvQuery = mvQuery.eq("organization_id", orgId);
        }
        if (branchId) {
          mvQuery = mvQuery.eq("branch_id", branchId);
        }

        // ================================================================
        // Lightweight queries (aggregates, not full row fetches)
        // ================================================================

        // POS revenue + transaction count (from orders is_pos_sale)
        let posQuery = svc
          .from("orders")
          .select("total_amount")
          .eq("is_pos_sale", true)
          .in("payment_status", ["paid", "completed"])
          .gte("created_at", startStr)
          .lte("created_at", endStr);
        posQuery = addBranchFilter(posQuery, branchId, isSuperAdmin, orgId);

        // Work orders revenue (paid)
        let woRevenueQuery = svc
          .from("lab_work_orders")
          .select("total_amount")
          .eq("payment_status", "paid")
          .gte("created_at", startStr)
          .lte("created_at", endStr);
        woRevenueQuery = addBranchFilter(woRevenueQuery, branchId, isSuperAdmin, orgId);

        // Quotes status breakdown (lightweight: status + total_amount only)
        let quotesQuery = svc
          .from("quotes")
          .select("status, total_amount")
          .gte("created_at", startStr)
          .lte("created_at", endStr);
        quotesQuery = addBranchFilter(quotesQuery, branchId, isSuperAdmin, orgId);

        // Customers
        const customerScope = await addBranchFilterForBranchScopedTable(
          svc.from("customers").select("id, created_at"),
          branchContext,
          svc,
        );

        // Products (for inventory metrics + top products)
        let productsQuery = svc
          .from("products")
          .select("id, name, slug, category_id, price")
          .eq("status", "active");
        productsQuery = addBranchFilter(productsQuery, branchId, isSuperAdmin, orgId);

        // Product branch stock (branch-scoped only)
        let stockQuery = svc
          .from("product_branch_stock")
          .select("product_id, branch_id, quantity, low_stock_threshold");
        stockQuery = scopeByBranchIds(stockQuery, branchId, orgBranchIds);

        // Categories (for product category mapping)
        let categoriesQuery = svc.from("categories").select("id, name, slug");
        if (orgId) {
          categoriesQuery = categoriesQuery.eq("organization_id", orgId);
        }

        // Payment methods: use cash_register_closures (branch-scoped)
        let closuresQuery = svc
          .from("cash_register_closures")
          .select(
            "total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales",
          )
          .in("status", ["confirmed", "closed"])
          .gte("closure_date", periodStartStr)
          .lte("closure_date", periodEndStr);
        closuresQuery = scopeByBranchIds(closuresQuery, branchId, orgBranchIds);

        // Top products: order_items via orders (period-scoped)
        let topProductsQuery = svc
          .from("orders")
          .select(`
            total_amount, created_at,
            order_items (
              product_id, product_name, quantity, total_price
            )
          `)
          .or("status.eq.completed,payment_status.eq.paid")
          .gte("created_at", startStr)
          .lte("created_at", endStr);
        topProductsQuery = addBranchFilter(topProductsQuery, branchId, isSuperAdmin, orgId);

        // Support tickets
        let supportTicketQuery = svc
          .from("optical_internal_support_tickets")
          .select("id, status, category, resolution_time_minutes, created_at")
          .gte("created_at", startStr)
          .lte("created_at", endStr);
        if (orgId) {
          supportTicketQuery = supportTicketQuery.eq("organization_id", orgId);
          if (branchId) {
            supportTicketQuery = supportTicketQuery.eq("branch_id", branchId);
          } else if (orgBranchIds.length > 0) {
            supportTicketQuery = supportTicketQuery.or(
              `branch_id.is.null,branch_id.in.(${orgBranchIds.join(",")})`,
            );
          }
        } else {
          supportTicketQuery = supportTicketQuery.limit(0);
        }

        // Avg delivery days (work orders with ordered_at + delivered_at)
        let deliveryQuery = svc
          .from("lab_work_orders")
          .select("ordered_at, delivered_at")
          .eq("status", "delivered")
          .not("ordered_at", "is", null)
          .not("delivered_at", "is", null)
          .gte("created_at", startStr)
          .lte("created_at", endStr);
        deliveryQuery = addBranchFilter(deliveryQuery, branchId, isSuperAdmin, orgId);

        // ================================================================
        // Execute all queries in parallel
        // ================================================================

        const [
          mvResult,
          posResult,
          woRevenueResult,
          quotesResult,
          customersResult,
          productsResult,
          stockResult,
          categoriesResult,
          closuresResult,
          topProductsResult,
          supportTicketResult,
          deliveryResult,
        ] = await Promise.all([
          mvQuery,
          posQuery,
          woRevenueQuery,
          quotesQuery,
          customerScope,
          productsQuery,
          stockQuery,
          categoriesQuery,
          closuresQuery,
          topProductsQuery,
          supportTicketQuery,
          deliveryQuery,
        ]);

        // ================================================================
        // Process MV data
        // ================================================================

        const mvRows = (mvResult.data || []) as unknown as MvKpiRow[];
        const mvData = computeAnalyticsMvData(mvRows, period, startDate, endDate);

        // ================================================================
        // Process lightweight queries
        // ================================================================

        // --- Revenue ---
        const posOrders = posResult.data || [];
        const posRevenue = posOrders.reduce(
          (s: number, o: { total_amount?: number | null }) =>
            s + Number(o.total_amount || 0),
          0,
        );
        const posTransactionCount = posOrders.length;

        const paidWorkOrders = woRevenueResult.data || [];
        const workOrdersRevenue = paidWorkOrders.reduce(
          (s: number, wo: { total_amount?: number | null }) =>
            s + Number(wo.total_amount || 0),
          0,
        );

        const totalRevenue = posRevenue + workOrdersRevenue;
        const avgOrderValue =
          posTransactionCount > 0
            ? posRevenue / posTransactionCount
            : posOrders.length > 0
              ? posRevenue / posOrders.length
              : 0;
        const avgWorkOrderValue =
          mvData.totalWorkOrders > 0
            ? workOrdersRevenue / mvData.totalWorkOrders
            : 0;

        // --- Quotes ---
        const quotes = quotesResult.data || [];
        const totalQuotes = quotes.length;
        const quotesByStatus: Record<string, number> = {};
        let acceptedQuotes = 0;
        let rejectedQuotes = 0;
        let expiredQuotes = 0;
        let convertedQuotes = 0;
        let totalQuoteAmount = 0;
        quotes.forEach((q: { status?: string; total_amount?: number | null }) => {
          const status = q.status || "draft";
          quotesByStatus[status] = (quotesByStatus[status] || 0) + 1;
          if (status === "accepted") acceptedQuotes++;
          if (status === "rejected") rejectedQuotes++;
          if (status === "expired") expiredQuotes++;
          if (status === "converted_to_work") convertedQuotes++;
          if (q.total_amount) totalQuoteAmount += Number(q.total_amount);
        });
        const quoteConversionRate =
          totalQuotes > 0
            ? ((acceptedQuotes + convertedQuotes) / totalQuotes) * 100
            : 0;
        const avgQuoteValue = totalQuotes > 0 ? totalQuoteAmount / totalQuotes : 0;

        // --- Customers ---
        const customers = customersResult.data || [];
        const totalCustomers = customers.length;
        const customersInPeriod = customers.filter(
          (c: { created_at: string }) => {
            const d = new Date(c.created_at);
            return d >= startDate && d <= endDate;
          },
        );
        const newCustomers = customersInPeriod.length;

        // Recurring customers: unique customer emails with multiple orders
        // ponytail: simple heuristic from orders table, not cross-referenced with work orders
        let recurringQuery = svc
          .from("orders")
          .select("customer_email")
          .not("customer_email", "is", null)
          .gte("created_at", startStr)
          .lte("created_at", endStr);
        recurringQuery = addBranchFilter(recurringQuery, branchId, isSuperAdmin, orgId);
        const { data: orderEmails } = await recurringQuery;

        const emailCounts: Record<string, number> = {};
        (orderEmails || []).forEach(
          (o: { customer_email?: string | null }) => {
            if (o.customer_email) {
              emailCounts[o.customer_email] =
                (emailCounts[o.customer_email] || 0) + 1;
            }
          },
        );
        const recurringCustomers = Object.values(emailCounts).filter(
          (c) => c > 1,
        ).length;

        // --- Products & inventory ---
        const products = productsResult.data || [];
        const productBranchStock = stockResult.data || [];
        const categories = categoriesResult.data || [];
        const productIdsInCatalog = new Set(products.map((p: { id: string }) => p.id));
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
        const productStats: Record<string, {
          id: string;
          name: string;
          revenue: number;
          quantity: number;
          orders: Set<string>;
        }> = {};
        (topProductsResult.data || []).forEach(
          (order: {
            order_items?: Array<{
              product_id: string;
              product_name: string;
              total_price: number | null;
              quantity: number | null;
            }>;
          }) => {
            order.order_items?.forEach((item) => {
              const pid = item.product_id;
              if (!productStats[pid]) {
                productStats[pid] = {
                  id: pid,
                  name: item.product_name || "Producto Sin Nombre",
                  revenue: 0,
                  quantity: 0,
                  orders: new Set(),
                };
              }
              productStats[pid].revenue += Number(item.total_price || 0);
              productStats[pid].quantity += Number(item.quantity || 0);
            });
          },
        );

        const topProducts = Object.values(productStats)
          .map((stat) => ({
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
          const prod = products.find(
            (p: { id: string }) => p.id === product.id,
          );
          if (prod) {
            const cat = categories.find(
              (c: { id: string }) => c.id === prod.category_id,
            );
            product.category = cat?.name || "Sin Categoría";
          }
        });

        // Category revenue
        const categoryRevenue: Record<string, number> = {};
        (topProductsResult.data || []).forEach(
          (order: {
            order_items?: Array<{
              product_id: string;
              total_price: number | null;
            }>;
          }) => {
            order.order_items?.forEach((item) => {
              const prod = products.find(
                (p: { id: string }) => p.id === item.product_id,
              );
              if (prod && prod.category_id) {
                const cat = categories.find(
                  (c: { id: string }) => c.id === prod.category_id,
                );
                const catName = cat?.name || "Sin Categoría";
                categoryRevenue[catName] =
                  (categoryRevenue[catName] || 0) +
                  Number(item.total_price || 0);
              }
            });
          },
        );

        const categoryRevenueArray = Object.entries(categoryRevenue)
          .map(([category, revenue]) => ({ category, revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8);

        // --- Payment methods ---
        const paymentMethods: Record<
          string,
          { count: number; revenue: number }
        > = {};
        const closures = closuresResult.data || [];

        if (closures.length > 0) {
          const totalClosureRevenue = closures.reduce(
            (s: number, c: { total_sales?: number | null }) =>
              s + (Number(c.total_sales) || 0),
            0,
          );
          const totalClosureTxns = closures.reduce(
            (s: number, c: { total_transactions?: number | null }) =>
              s + (Number(c.total_transactions) || 0),
            0,
          );
          closures.forEach(
            (c: {
              cash_sales?: number | null;
              debit_card_sales?: number | null;
              credit_card_sales?: number | null;
              installments_sales?: number | null;
              other_payment_sales?: number | null;
            }) => {
              const addPayment = (method: string, amount: number) => {
                if (amount > 0) {
                  if (!paymentMethods[method]) {
                    paymentMethods[method] = { count: 0, revenue: 0 };
                  }
                  paymentMethods[method].revenue += amount;
                }
              };
              addPayment("cash", Number(c.cash_sales) || 0);
              addPayment("debit_card", Number(c.debit_card_sales) || 0);
              addPayment("credit_card", Number(c.credit_card_sales) || 0);
              addPayment("installments", Number(c.installments_sales) || 0);
              addPayment("other", Number(c.other_payment_sales) || 0);
            },
          );
          if (totalClosureRevenue > 0 && totalClosureTxns > 0) {
            Object.keys(paymentMethods).forEach((method) => {
              const rev = paymentMethods[method].revenue;
              paymentMethods[method].count =
                Math.round(
                  (rev / totalClosureRevenue) * totalClosureTxns,
                ) || 1;
            });
          }
        }

        // --- Customer trends (daily count) ---
        const customerTrends: Array<{ date: string; value: number; count: number }> = [];
        for (let i = 0; i < period; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const dateStr = getLocalDateString(d);
          const nextDay = new Date(d);
          nextDay.setDate(nextDay.getDate() + 1);
          const dayCustomers = customers.filter((c: { created_at: string }) => {
            const cd = new Date(c.created_at);
            return cd >= d && cd < nextDay;
          });
          customerTrends.push({
            date: dateStr,
            value: dayCustomers.length,
            count: dayCustomers.length,
          });
        }

        // --- Support tickets ---
        const supportTickets = supportTicketResult.data || [];
        const supportByStatus: Record<string, number> = {};
        const supportByCategory: Record<string, number> = {};
        supportTickets.forEach(
          (t: { status?: string; category?: string | null }) => {
            const status = t.status || "open";
            supportByStatus[status] = (supportByStatus[status] || 0) + 1;
            const cat = t.category || "other";
            supportByCategory[cat] = (supportByCategory[cat] || 0) + 1;
          },
        );

        const openSupportStatuses = [
          "open",
          "assigned",
          "in_progress",
          "waiting_customer",
        ];
        const openTickets = supportTickets.filter(
          (t: { status?: string }) =>
            openSupportStatuses.includes(t.status || ""),
        ).length;
        const resolvedTickets = supportTickets.filter(
          (t: { status?: string }) =>
            t.status === "resolved" || t.status === "closed",
        ).length;

        const ticketsWithResolution = supportTickets.filter(
          (t: { resolution_time_minutes?: number | null }) =>
            t.resolution_time_minutes != null,
        );
        const avgResolutionMinutes =
          ticketsWithResolution.length > 0
            ? Math.round(
                ticketsWithResolution.reduce(
                  (s: number, t: { resolution_time_minutes?: number | null }) =>
                    s + (t.resolution_time_minutes || 0),
                  0,
                ) / ticketsWithResolution.length,
              )
            : null;

        // Support trends (daily count)
        const supportTrends: Array<{
          date: string;
          value: number;
          count: number;
        }> = [];
        for (let i = 0; i < period; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const dateStr = getLocalDateString(d);
          const nextDay = new Date(d);
          nextDay.setDate(nextDay.getDate() + 1);
          const dayTickets = supportTickets.filter(
            (t: { created_at: string }) => {
              const td = new Date(t.created_at);
              return td >= d && td < nextDay;
            },
          );
          supportTrends.push({
            date: dateStr,
            value: dayTickets.length,
            count: dayTickets.length,
          });
        }

        // --- Average delivery days ---
        const deliveredWorkOrders = deliveryResult.data || [];
        let avgDeliveryDays = 0;
        if (deliveredWorkOrders.length > 0) {
          const totalDays = deliveredWorkOrders.reduce(
            (sum: number, wo: { ordered_at: string; delivered_at: string }) => {
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
          avgDeliveryDays = Math.round(
            totalDays / deliveredWorkOrders.length,
          );
        }

        // ================================================================
        // Build response (same shape as original)
        // ================================================================

        const result = {
          kpis: {
            totalRevenue,
            posRevenue,
            posTransactionCount,
            workOrdersRevenue,
            revenueGrowth: mvData.revenueGrowth,
            totalOrders: mvData.totalOrders,
            totalWorkOrders: mvData.totalWorkOrders,
            totalQuotes,
            totalAppointments: mvData.totalAppointments,
            totalCustomers,
            newCustomers,
            recurringCustomers,
            avgOrderValue,
            avgWorkOrderValue,
            avgQuoteValue,
            quoteConversionRate,
            appointmentCompletionRate: mvData.appointments.completionRate,
            avgDeliveryDays,
          },
          workOrders: mvData.workOrders,
          quotes: {
            total: totalQuotes,
            accepted: acceptedQuotes,
            rejected: rejectedQuotes,
            expired: expiredQuotes,
            converted: convertedQuotes,
            byStatus: quotesByStatus,
            conversionRate: quoteConversionRate,
          },
          appointments: mvData.appointments,
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
            sales: mvData.salesTrends,
            customers: customerTrends,
            workOrders: mvData.workOrderTrends,
            quotes: mvData.quoteTrends,
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
            from: periodStartStr,
            to: periodEndStr,
            days: period,
          },
        };

        logger.info("Analytics calculated successfully", {
          period,
          branchId,
          requestId,
        });

        return result;
      },
      cacheKey,
      { revalidate: cacheTtl },
    )();

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
