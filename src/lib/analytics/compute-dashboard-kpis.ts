/**
 * Pure functions to compute dashboard KPIs from mv_daily_kpis rows.
 *
 * Extracted for testability — the route handler fetches data and calls
 * these to produce the response shape. Logic is pure: same input → same output.
 */

export interface MvKpiRow {
  day: string;
  revenue: number;
  orders_count: number;
  work_orders_by_status: Record<string, number>;
  appointments_by_status: Record<string, number>;
  products_sold: number;
  quotes_count: number;
}

export interface DashboardRevenueKpis {
  current: number;
  previous: number;
  change: number;
  currency: string;
}

export interface DashboardOrdersKpis {
  total: number;
}

export interface DashboardWorkOrdersKpis {
  total: number;
  inProgress: number;
  pending: number;
  completed: number;
}

export interface DashboardQuotesKpis {
  total: number;
}

export interface RevenueTrendEntry {
  date: string;
  revenue: number;
  orders: number;
}

export interface DashboardCharts {
  revenueTrend: RevenueTrendEntry[];
}

export interface DashboardKpisResult {
  revenue: DashboardRevenueKpis;
  orders: DashboardOrdersKpis;
  workOrders: DashboardWorkOrdersKpis;
  quotes: DashboardQuotesKpis;
  charts: DashboardCharts;
}

const IN_PROGRESS_STATUSES = new Set([
  "sent_to_lab",
  "in_progress_lab",
  "ready_at_lab",
  "received_from_lab",
  "mounted",
  "quality_check",
]);

const PENDING_WO_STATUSES = new Set(["ordered", "quote"]);

const COMPLETED_WO_STATUSES = new Set(["delivered"]);

/**
 * Compute dashboard KPIs from mv_daily_kpis rows.
 *
 * @param mvRows — MV rows already filtered by org/branch
 * @param now — current date for period calculation
 */
export function computeDashboardKpis(
  mvRows: MvKpiRow[],
  now: Date,
): DashboardKpisResult {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Split rows by period
  const currentMonthRows = mvRows.filter((r) => {
    const d = new Date(r.day + "T00:00:00");
    return d >= monthStart && d <= now;
  });

  const lastMonthRows = mvRows.filter((r) => {
    const d = new Date(r.day + "T00:00:00");
    return d >= lastMonthStart && d <= lastMonthEnd;
  });

  // Revenue
  const currentRevenue = sumProp(currentMonthRows, "revenue");
  const previousRevenue = sumProp(lastMonthRows, "revenue");
  const revenueChange =
    previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

  // Orders total
  const totalOrders = sumProp(mvRows, "orders_count");

  // Quotes total
  const totalQuotes = sumProp(mvRows, "quotes_count");

  // Work orders — merge JSONB status distributions across all rows
  const allStatuses: Record<string, number> = {};
  for (const row of mvRows) {
    for (const [status, count] of Object.entries(
      row.work_orders_by_status ?? {},
    )) {
      allStatuses[status] = (allStatuses[status] ?? 0) + count;
    }
  }

  const workOrdersTotal = Object.values(allStatuses).reduce(
    (s, c) => s + c,
    0,
  );
  const inProgress = sumStatuses(allStatuses, IN_PROGRESS_STATUSES);
  const pendingWO = sumStatuses(allStatuses, PENDING_WO_STATUSES);
  const completedWO = sumStatuses(allStatuses, COMPLETED_WO_STATUSES);

  // Revenue trend
  const sorted = [...mvRows].sort((a, b) => a.day.localeCompare(b.day));
  const revenueTrend: RevenueTrendEntry[] = sorted.map((r) => ({
    date: r.day,
    revenue: Number(r.revenue),
    orders: Number(r.orders_count),
  }));

  return {
    revenue: {
      current: currentRevenue,
      previous: previousRevenue,
      change: revenueChange,
      currency: "CLP",
    },
    orders: { total: totalOrders },
    workOrders: {
      total: workOrdersTotal,
      inProgress,
      pending: pendingWO,
      completed: completedWO,
    },
    quotes: { total: totalQuotes },
    charts: { revenueTrend },
  };
}

function sumProp(rows: MvKpiRow[], key: "revenue" | "orders_count" | "quotes_count"): number {
  return rows.reduce((s, r) => s + Number(r[key]), 0);
}

function sumStatuses(
  statusMap: Record<string, number>,
  filter: Set<string>,
): number {
  let total = 0;
  for (const status of filter) {
    total += statusMap[status] ?? 0;
  }
  return total;
}
