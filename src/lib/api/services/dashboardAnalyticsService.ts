/**
 * Dashboard Analytics Service
 * Extracted analytics computation from dashboard API route
 */
import { unstable_cache } from "next/cache";

import {
  computeInventoryMetrics,
} from "@/lib/analytics/analytics-service";
import { computeAnalyticsMvData } from "@/lib/analytics/compute-analytics-kpis";
import type { MvKpiRow } from "@/lib/analytics/compute-dashboard-kpis";
import {
  addBranchFilter,
  addBranchFilterForBranchScopedTable,
} from "@/lib/api/branch-middleware";
import { createServiceRoleClient } from "@/utils/supabase/server";

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function scopeByBranchIds(query: unknown, branchId: string | null, orgBranchIds: string[]) {
  if (branchId) return query.eq("branch_id", branchId);
  if (orgBranchIds.length > 0) return query.in("branch_id", orgBranchIds);
  return query.limit(0);
}

export interface DashboardAnalyticsParams {
  orgId: string | null;
  branchId: string | null;
  isSuperAdmin: boolean;
  organizationId: string | null;
  orgBranchIds: string[];
  period: number;
  startDate: Date;
  endDate: Date;
  startStr: string;
  endStr: string;
  periodStartStr: string;
  periodEndStr: string;
  prevPeriodStartStr: string;
}

export async function computeDashboardAnalytics(params: DashboardAnalyticsParams) {
  const {
    orgId,
    branchId,
    isSuperAdmin,
    organizationId: orgIdVal,
    orgBranchIds,
    period,
    startDate,
    endDate,
    startStr,
    endStr,
    periodStartStr,
    periodEndStr,
    prevPeriodStartStr,
  } = params;

  const cacheTtl = Number(process.env.ANALYTICS_CACHE_TTL_SECONDS) || 180;
  const cacheKey = [
    "analytics-dashboard",
    orgId ?? "none",
    branchId ?? "global",
    String(period),
  ];

  return unstable_cache(
    async () => {
      const svc = createServiceRoleClient();

      // MV query
      let mvQuery = svc
        .from("mv_daily_kpis")
        .select("*")
        .gte("day", prevPeriodStartStr)
        .lte("day", periodEndStr);
      if (orgId) mvQuery = mvQuery.eq("organization_id", orgId);
      if (branchId) mvQuery = mvQuery.eq("branch_id", branchId);

      // POS revenue
      let posQuery = svc
        .from("orders")
        .select("total_amount")
        .eq("is_pos_sale", true)
        .in("payment_status", ["paid", "completed"])
        .gte("created_at", startStr)
        .lte("created_at", endStr);
      posQuery = addBranchFilter(posQuery, branchId, isSuperAdmin, orgId);

      // Work orders revenue
      let woRevenueQuery = svc
        .from("lab_work_orders")
        .select("total_amount")
        .eq("payment_status", "paid")
        .gte("created_at", startStr)
        .lte("created_at", endStr);
      woRevenueQuery = addBranchFilter(woRevenueQuery, branchId, isSuperAdmin, orgId);

      // Quotes
      let quotesQuery = svc
        .from("quotes")
        .select("status, total_amount")
        .gte("created_at", startStr)
        .lte("created_at", endStr);
      quotesQuery = addBranchFilter(quotesQuery, branchId, isSuperAdmin, orgId);

      // Customers
      const customerScope = await addBranchFilterForBranchScopedTable(
        svc.from("customers").select("id, created_at"),
        { branchId, isSuperAdmin, organizationId: orgIdVal, isGlobalView: false, accessibleBranches: [] },
        svc as unknown,
      );

      // Products
      let productsQuery = svc
        .from("products")
        .select("id, name, slug, category_id, price")
        .eq("status", "active");
      productsQuery = addBranchFilter(productsQuery, branchId, isSuperAdmin, orgId);

      // Stock
      let stockQuery = svc
        .from("product_branch_stock")
        .select("product_id, branch_id, quantity, low_stock_threshold");
      stockQuery = scopeByBranchIds(stockQuery, branchId, orgBranchIds);

      // Categories
      let categoriesQuery = svc.from("categories").select("id, name, slug");
      if (orgId) categoriesQuery = categoriesQuery.eq("organization_id", orgId);

      // Closures
      let closuresQuery = svc
        .from("cash_register_closures")
        .select("total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales")
        .in("status", ["confirmed", "closed"])
        .gte("closure_date", periodStartStr)
        .lte("closure_date", periodEndStr);
      closuresQuery = scopeByBranchIds(closuresQuery, branchId, orgBranchIds);

      // Top products
      let topProductsQuery = svc
        .from("orders")
        .select(`total_amount, created_at, order_items ( product_id, product_name, quantity, total_price )`)
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

      // Delivery query
      let deliveryQuery = svc
        .from("lab_work_orders")
        .select("ordered_at, delivered_at")
        .eq("status", "delivered")
        .not("ordered_at", "is", null)
        .not("delivered_at", "is", null)
        .gte("created_at", startStr)
        .lte("created_at", endStr);
      deliveryQuery = addBranchFilter(deliveryQuery, branchId, isSuperAdmin, orgId);

      // Execute in parallel
      const [mvResult, posResult, woRevenueResult, quotesResult, customersResult,
        productsResult, stockResult, categoriesResult, closuresResult,
        topProductsResult, supportTicketResult, deliveryResult] = await Promise.all([
        mvQuery, posQuery, woRevenueQuery, quotesQuery, customerScope,
        productsQuery, stockQuery, categoriesQuery, closuresQuery,
        topProductsQuery, supportTicketQuery, deliveryQuery,
      ]);

      // Process MV data
      const mvRows = (mvResult.data || []) as unknown as MvKpiRow[];
      const mvData = computeAnalyticsMvData(mvRows, period, startDate, endDate);

      // Revenue
      const posOrders = posResult.data || [];
      const posRevenue = posOrders.reduce((s: number, o: unknown) => s + Number(o.total_amount || 0), 0);
      const posTransactionCount = posOrders.length;

      const paidWorkOrders = woRevenueResult.data || [];
      const workOrdersRevenue = paidWorkOrders.reduce((s: number, wo: unknown) => s + Number(wo.total_amount || 0), 0);

      const totalRevenue = posRevenue + workOrdersRevenue;
      const avgOrderValue = posTransactionCount > 0 ? posRevenue / posTransactionCount
        : posOrders.length > 0 ? posRevenue / posOrders.length : 0;
      const avgWorkOrderValue = mvData.totalWorkOrders > 0 ? workOrdersRevenue / mvData.totalWorkOrders : 0;

      // Quotes processing
      const quotes = quotesResult.data || [];
      const totalQuotes = quotes.length;
      const quotesByStatus: Record<string, number> = {};
      let acceptedQuotes = 0, rejectedQuotes = 0, expiredQuotes = 0, convertedQuotes = 0, totalQuoteAmount = 0;
      for (const q of quotes) {
        const status = (q as unknown).status || "draft";
        quotesByStatus[status] = (quotesByStatus[status] || 0) + 1;
        if (status === "accepted") acceptedQuotes++;
        if (status === "rejected") rejectedQuotes++;
        if (status === "expired") expiredQuotes++;
        if (status === "converted_to_work") convertedQuotes++;
        if ((q as unknown).total_amount) totalQuoteAmount += Number((q as unknown).total_amount);
      }
      const quoteConversionRate = totalQuotes > 0 ? ((acceptedQuotes + convertedQuotes) / totalQuotes) * 100 : 0;
      const avgQuoteValue = totalQuotes > 0 ? totalQuoteAmount / totalQuotes : 0;

      // Customers
      const customers = customersResult.data || [];
      const totalCustomers = customers.length;
      const customersInPeriod = (customers as unknown[]).filter((c: unknown) => {
        const d = new Date(c.created_at);
        return d >= startDate && d <= endDate;
      });
      const newCustomers = customersInPeriod.length;

      // Recurring customers
      let recurringQuery = svc.from("orders").select("customer_email").not("customer_email", "is", null).gte("created_at", startStr).lte("created_at", endStr);
      recurringQuery = addBranchFilter(recurringQuery, branchId, isSuperAdmin, orgId);
      const { data: orderEmails } = await recurringQuery;
      const emailCounts: Record<string, number> = {};
      ((orderEmails || []) as unknown[]).forEach((o: unknown) => {
        if (o.customer_email) emailCounts[o.customer_email] = (emailCounts[o.customer_email] || 0) + 1;
      });
      const recurringCustomers = Object.values(emailCounts).filter((c) => c > 1).length;

      // Products & inventory
      const products = productsResult.data || [];
      const productBranchStock = stockResult.data || [];
      const categories = categoriesResult.data || [];
      const productIdsInCatalog = new Set((products as unknown[]).map((p: unknown) => p.id));
      const inventoryMetrics = computeInventoryMetrics(
        (productBranchStock || []) as unknown,
        productIdsInCatalog,
      );

      // Top products
      const productStats: Record<string, unknown> = {};
      ((topProductsResult.data || []) as unknown[]).forEach((order: unknown) => {
        (order.order_items || []).forEach((item: unknown) => {
          const pid = item.product_id;
          if (!productStats[pid]) {
            productStats[pid] = { id: pid, name: item.product_name || "Producto Sin Nombre", revenue: 0, quantity: 0, orders: new Set() };
          }
          productStats[pid].revenue += Number(item.total_price || 0);
          productStats[pid].quantity += Number(item.quantity || 0);
        });
      });
      const topProducts = Object.values(productStats)
        .map((stat: unknown) => ({ id: stat.id, name: stat.name, category: "General", revenue: stat.revenue, quantity: stat.quantity, orders: stat.orders.size }))
        .sort((a: unknown, b: unknown) => b.revenue - a.revenue)
        .slice(0, 10);
      topProducts.forEach((product: unknown) => {
        const prod = (products as unknown[]).find((p: unknown) => p.id === product.id);
        if (prod) {
          const cat = (categories as unknown[]).find((c: unknown) => c.id === prod.category_id);
          product.category = cat?.name || "Sin Categoría";
        }
      });

      // Category revenue
      const categoryRevenue: Record<string, number> = {};
      ((topProductsResult.data || []) as unknown[]).forEach((order: unknown) => {
        (order.order_items || []).forEach((item: unknown) => {
          const prod = (products as unknown[]).find((p: unknown) => p.id === item.product_id);
          if (prod && prod.category_id) {
            const cat = (categories as unknown[]).find((c: unknown) => c.id === prod.category_id);
            const catName = cat?.name || "Sin Categoría";
            categoryRevenue[catName] = (categoryRevenue[catName] || 0) + Number(item.total_price || 0);
          }
        });
      });
      const categoryRevenueArray = Object.entries(categoryRevenue)
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      // Payment methods
      const paymentMethods: Record<string, { count: number; revenue: number }> = {};
      const closures = closuresResult.data || [];
      if (closures.length > 0) {
        const totalClosureRevenue = (closures as unknown[]).reduce((s: number, c: unknown) => s + (Number(c.total_sales) || 0), 0);
        const totalClosureTxns = (closures as unknown[]).reduce((s: number, c: unknown) => s + (Number(c.total_transactions) || 0), 0);
        (closures as unknown[]).forEach((c: unknown) => {
          const addPayment = (method: string, amount: number) => {
            if (amount > 0) {
              if (!paymentMethods[method]) paymentMethods[method] = { count: 0, revenue: 0 };
              paymentMethods[method].revenue += amount;
            }
          };
          addPayment("cash", Number(c.cash_sales) || 0);
          addPayment("debit_card", Number(c.debit_card_sales) || 0);
          addPayment("credit_card", Number(c.credit_card_sales) || 0);
          addPayment("installments", Number(c.installments_sales) || 0);
          addPayment("other", Number(c.other_payment_sales) || 0);
        });
        if (totalClosureRevenue > 0 && totalClosureTxns > 0) {
          Object.keys(paymentMethods).forEach((method) => {
            paymentMethods[method].count = Math.round((paymentMethods[method].revenue / totalClosureRevenue) * totalClosureTxns) || 1;
          });
        }
      }

      // Customer trends
      const customerTrends: Array<{ date: string; value: number; count: number }> = [];
      for (let i = 0; i < period; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = getLocalDateString(d);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        const dayCustomers = (customers as unknown[]).filter((c: unknown) => {
          const cd = new Date(c.created_at);
          return cd >= d && cd < nextDay;
        });
        customerTrends.push({ date: dateStr, value: dayCustomers.length, count: dayCustomers.length });
      }

      // Support tickets
      const supportTickets = supportTicketResult.data || [];
      const supportByStatus: Record<string, number> = {};
      const supportByCategory: Record<string, number> = {};
      (supportTickets as unknown[]).forEach((t: unknown) => {
        const status = t.status || "open";
        supportByStatus[status] = (supportByStatus[status] || 0) + 1;
        const cat = t.category || "other";
        supportByCategory[cat] = (supportByCategory[cat] || 0) + 1;
      });
      const openSupportStatuses = ["open", "assigned", "in_progress", "waiting_customer"];
      const openTickets = (supportTickets as unknown[]).filter((t: unknown) => openSupportStatuses.includes(t.status || "")).length;
      const resolvedTickets = (supportTickets as unknown[]).filter((t: unknown) => t.status === "resolved" || t.status === "closed").length;
      const ticketsWithResolution = (supportTickets as unknown[]).filter((t: unknown) => t.resolution_time_minutes != null);
      const avgResolutionMinutes = ticketsWithResolution.length > 0
        ? Math.round(ticketsWithResolution.reduce((s: number, t: unknown) => s + (t.resolution_time_minutes || 0), 0) / ticketsWithResolution.length)
        : null;

      // Support trends
      const supportTrends: Array<{ date: string; value: number; count: number }> = [];
      for (let i = 0; i < period; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = getLocalDateString(d);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        const dayTickets = (supportTickets as unknown[]).filter((t: unknown) => {
          const td = new Date(t.created_at);
          return td >= d && td < nextDay;
        });
        supportTrends.push({ date: dateStr, value: dayTickets.length, count: dayTickets.length });
      }

      // Avg delivery days
      const deliveredWorkOrders = deliveryResult.data || [];
      let avgDeliveryDays = 0;
      if (deliveredWorkOrders.length > 0) {
        const totalDays = (deliveredWorkOrders as unknown[]).reduce((sum: number, wo: unknown) => {
          const ordered = new Date(wo.ordered_at);
          const delivered = new Date(wo.delivered_at);
          return sum + Math.ceil((delivered.getTime() - ordered.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        avgDeliveryDays = Math.round(totalDays / deliveredWorkOrders.length);
      }

      return {
        kpis: {
          totalRevenue, posRevenue, posTransactionCount, workOrdersRevenue,
          revenueGrowth: mvData.revenueGrowth, totalOrders: mvData.totalOrders,
          totalWorkOrders: mvData.totalWorkOrders, totalQuotes, totalAppointments: mvData.totalAppointments,
          totalCustomers, newCustomers, recurringCustomers, avgOrderValue, avgWorkOrderValue, avgQuoteValue,
          quoteConversionRate, appointmentCompletionRate: mvData.appointments.completionRate, avgDeliveryDays,
        },
        workOrders: mvData.workOrders,
        quotes: { total: totalQuotes, accepted: acceptedQuotes, rejected: rejectedQuotes, expired: expiredQuotes, converted: convertedQuotes, byStatus: quotesByStatus, conversionRate: quoteConversionRate },
        appointments: mvData.appointments,
        products: {
          total: products.length,
          lowStock: inventoryMetrics.lowStock,
          outOfStock: inventoryMetrics.outOfStock,
          topProducts,
          categoryRevenue: categoryRevenueArray,
        },
        paymentMethods: Object.entries(paymentMethods).map(([method, data]) => ({ method, count: data.count, revenue: data.revenue })),
        trends: {
          sales: mvData.salesTrends,
          customers: customerTrends,
          workOrders: mvData.workOrderTrends,
          quotes: mvData.quoteTrends,
          supportTickets: supportTrends,
        },
        support: { total: supportTickets.length, open: openTickets, resolved: resolvedTickets, avgResolutionMinutes, byStatus: supportByStatus, byCategory: supportByCategory, trends: supportTrends },
        period: { from: periodStartStr, to: periodEndStr, days: period },
      };
    },
    cacheKey,
    { revalidate: cacheTtl },
  )();
}
