import type { SupabaseClient } from "@supabase/supabase-js";

import { addBranchFilter, BranchContext } from "@/lib/api/branch-middleware";

export function getLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildApplyBranchFilter(branchContext: BranchContext) {
  return (query: any) => addBranchFilter(query, branchContext.branchId, branchContext.isSuperAdmin, branchContext.organizationId);
}

export function buildOrgBranchIdsQuery(supabase: SupabaseClient, branchContext: BranchContext) {
  if (branchContext.isSuperAdmin && !branchContext.branchId && branchContext.organizationId) {
    return supabase.from("branches").select("id").eq("organization_id", branchContext.organizationId).then((r: any) => (r.data || []).map((b: any) => b.id));
  }
  return Promise.resolve([] as string[]);
}

export function buildLegacyScope(supabase: SupabaseClient, branchContext: BranchContext, orgBranchIds: string[], applyBranchFilter: (q: any) => any) {
  return (query: any) => {
    if (branchContext.isSuperAdmin && !branchContext.branchId && branchContext.organizationId && orgBranchIds.length > 0) {
      return query.or(`organization_id.eq.${branchContext.organizationId},branch_id.in.(${orgBranchIds.join(",")})`);
    }
    if (branchContext.branchId) return query.eq("branch_id", branchContext.branchId);
    return applyBranchFilter(query);
  };
}

export function computeStatusDistribution(ordersLight: any[], thirtyDaysAgo: Date) {
  const last30DayOrders = ordersLight.filter((o: any) => new Date(o.created_at) >= thirtyDaysAgo);
  return {
    pending: last30DayOrders.filter((o: any) => o.status === "pending").length,
    processing: last30DayOrders.filter((o: any) => o.status === "processing").length,
    completed: last30DayOrders.filter((o: any) => o.status === "completed").length,
    failed: last30DayOrders.filter((o: any) => o.status === "failed").length,
    shipped: last30DayOrders.filter((o: any) => o.status === "shipped").length,
  };
}

export function processTopProducts(topProductsData: any[]) {
  const productRevenue = new Map();
  (topProductsData || []).forEach((order: any) => {
    order.order_items?.forEach((item: any) => {
      const current = productRevenue.get(item.product_name) || { revenue: 0, quantity: 0 };
      productRevenue.set(item.product_name, { revenue: current.revenue + (item.total_price || 0), quantity: current.quantity + (item.quantity || 0) });
    });
  });
  return Array.from(productRevenue.entries()).map(([name, data]) => ({ name, ...data })).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);
}
