import { NextRequest } from "next/server";

import { computeInventoryMetrics } from "@/lib/analytics/analytics-service";
import { computeDashboardKpis } from "@/lib/analytics/compute-dashboard-kpis";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import { createApiErrorResponse, createApiSuccessResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import type { Database, SupabaseClient } from "@/types/supabase";
import { createClientFromRequest } from "@/utils/supabase/server";

import { buildApplyBranchFilter, buildLegacyScope, buildOrgBranchIdsQuery, computeStatusDistribution, getLocalDateString, processTopProducts } from "./_helpers/dashboardHelpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, getUser } = await createClientFromRequest(request);
    const { data: userData, error: userError } = await getUser();
    if (userError || !userData?.user) return createApiErrorResponse(new AuthenticationError("Unauthorized"));

    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: userData.user.id });
    if (!isAdmin) return createApiErrorResponse(new AuthorizationError("Admin access required"));

    const branchContext = await getBranchContext(request, userData.user.id);
    const { searchParams } = new URL(request.url);
    const periodDays = Math.min(365, Math.max(7, parseInt(searchParams.get("period") || "7", 10) || 7));

    const now = new Date();
    const todayStr = getLocalDateString(now);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const trendStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const mvStartDate = startOfLastMonth < trendStart ? startOfLastMonth : trendStart;

    const applyBranchFilter = buildApplyBranchFilter(branchContext);
    const orgBranchIds = await buildOrgBranchIdsQuery(supabase, branchContext);
    const legacyScope = buildLegacyScope(supabase, branchContext, orgBranchIds, applyBranchFilter);

    const [productsResult, mvResult, customersResult, pbsResult, ordersAggResult, quotesAggResult, topProductsResult] = await Promise.all([
      supabase.from("products").select("*").eq("status", "active").then((r: unknown) => {
        let q = r; const bc = branchContext;
        if (bc.branchId) q = q.eq("organization_id", bc.organizationId || "00000000-0000-0000-0000-000000000000");
        else if (bc.isSuperAdmin && bc.organizationId) q = q.eq("organization_id", bc.organizationId);
        else q = applyBranchFilter(q);
        return q;
      }),
      (() => {
        let q = supabase.from("mv_daily_kpis").select("*").gte("day", getLocalDateString(mvStartDate)).lte("day", todayStr);
        if (branchContext.organizationId) q = q.eq("organization_id", branchContext.organizationId);
        if (branchContext.branchId) q = q.eq("branch_id", branchContext.branchId);
        return q;
      })(),
      applyBranchFilter(supabase.from("customers").select("*")),
      (() => {
        let q = supabase.from("product_branch_stock").select("product_id, branch_id, quantity, low_stock_threshold");
        if (branchContext.branchId) q = q.eq("branch_id", branchContext.branchId);
        else if (orgBranchIds.length > 0) q = q.in("branch_id", orgBranchIds);
        else q = q.limit(0);
        return q;
      })(),
      legacyScope(supabase.from("orders").select("status, created_at, total_amount, payment_status").gte("created_at", startOfLastMonth.toISOString())),
      legacyScope(supabase.from("quotes").select("id, status, converted_to_work_order_id")),
      legacyScope(supabase.from("orders").select("order_items (product_name, total_price, quantity)").or("status.eq.completed,payment_status.eq.paid").gte("created_at", startOfLastMonth.toISOString())),
    ]);

    const products = (productsResult as unknown)?.data || [];
    const mvRows = (mvResult as unknown)?.data || [];
    const customers = (customersResult as unknown)?.data || [];
    const productBranchStock = (pbsResult as unknown)?.data || [];
    const ordersLight = (ordersAggResult as unknown)?.data || [];
    const quotesLight = (quotesAggResult as unknown)?.data || [];
    const topProductsData = (topProductsResult as unknown)?.data || [];

    const activeProducts = products.filter((p: unknown) => p.status === "active");
    const productIds = new Set(activeProducts.map((p: unknown) => p.id));
    const inventoryMetrics = computeInventoryMetrics(productBranchStock, productIds, { products: activeProducts.map((p: unknown) => ({ id: p.id, name: p.name, slug: p.slug })), maxLowStockList: 5 });

    return createApiSuccessResponse({
      branch: { id: branchContext.branchId, is_global: branchContext.isGlobalView, is_super_admin: branchContext.isSuperAdmin },
      kpis: {
        products: { total: activeProducts.length, lowStock: inventoryMetrics.lowStock, outOfStock: inventoryMetrics.outOfStock },
        orders: { total: computeDashboardKpis(mvRows, now).orders.total, pending: ordersLight.filter((o: unknown) => o.status === "pending").length, processing: ordersLight.filter((o: unknown) => o.status === "processing").length, completed: ordersLight.filter((o: unknown) => o.status === "completed").length, failed: ordersLight.filter((o: unknown) => o.status === "failed").length },
        revenue: computeDashboardKpis(mvRows, now).revenue,
        customers: { total: customers.length, new: customers.filter((c: unknown) => new Date(c.created_at) >= thirtyDaysAgo).length, returning: Math.max(0, customers.length - customers.filter((c: unknown) => new Date(c.created_at) >= thirtyDaysAgo).length) },
        appointments: await computeAppointments(supabase, branchContext, orgBranchIds, todayStr, applyBranchFilter),
        workOrders: computeDashboardKpis(mvRows, now).workOrders,
        quotes: { total: computeDashboardKpis(mvRows, now).quotes.total, pending: quotesLight.filter((q: unknown) => ["draft", "sent"].includes(q.status) && !q.converted_to_work_order_id).length, converted: quotesLight.filter((q: unknown) => q.status === "accepted" || q.converted_to_work_order_id).length },
      },
      todayAppointments: await computeTodayAppointmentsList(supabase, branchContext, orgBranchIds, todayStr, applyBranchFilter),
      lowStockProducts: inventoryMetrics.lowStockProductsList ?? [],
      charts: { revenueTrend: computeDashboardKpis(mvRows, now).charts.revenueTrend, ordersStatus: computeStatusDistribution(ordersLight, thirtyDaysAgo), topProducts: processTopProducts(topProductsData) },
    });
  } catch (error) {
    logger.error("Dashboard API error", error as Error);
    return createApiErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

async function computeAppointments(supabase: SupabaseClient<Database>, bc: unknown, orgBranchIds: string[], todayStr: string, applyFilter: unknown) {
  const q = buildApptQuery(supabase, bc, orgBranchIds, todayStr, applyFilter);
  const { data: appointments } = await q;
  const a = appointments || [];
  return { today: a.length, scheduled: a.filter((x: unknown) => x.status === "scheduled").length, confirmed: a.filter((x: unknown) => x.status === "confirmed").length, pending: a.filter((x: unknown) => x.status === "scheduled" || x.status === "pending").length };
}

async function computeTodayAppointmentsList(supabase: SupabaseClient<Database>, bc: unknown, orgBranchIds: string[], todayStr: string, applyFilter: unknown) {
  const q = buildApptQuery(supabase, bc, orgBranchIds, todayStr, applyFilter).order("appointment_time", { ascending: true }).limit(10);
  const { data: todayData } = await q;
  const customerIds = [...new Set((todayData || []).map((a: unknown) => a.customer_id).filter(Boolean))];
  const { data: customersForAppts } = customerIds.length > 0 ? await supabase.from("customers").select("id, first_name, last_name, email, phone").in("id", customerIds) : { data: [] };
  return (todayData || []).map((apt: unknown) => {
    const c = customersForAppts?.find((x: unknown) => x.id === apt.customer_id);
    return { id: apt.id, customer_name: c ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || "Cliente" : "Cliente", customer_email: c?.email || null, appointment_time: apt.appointment_time, appointment_type: apt.appointment_type || "consultation", status: apt.status, duration_minutes: apt.duration_minutes || 30, notes: apt.notes };
  });
}

function buildApptQuery(supabase: SupabaseClient<Database>, bc: unknown, orgBranchIds: string[], todayStr: string, applyFilter: unknown) {
  if (bc.isSuperAdmin && !bc.branchId && bc.organizationId && orgBranchIds.length > 0) {
    return supabase.from("appointments").select("*").eq("appointment_date", todayStr).or(`organization_id.eq.${bc.organizationId},branch_id.in.(${orgBranchIds.join(",")})`);
  }
  if (bc.branchId) return supabase.from("appointments").select("*").eq("appointment_date", todayStr).or(`branch_id.eq.${bc.branchId},branch_id.is.null`);
  return applyFilter(supabase.from("appointments").select("*").eq("appointment_date", todayStr));
}
