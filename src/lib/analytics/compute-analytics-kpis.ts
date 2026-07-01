/**
 * Pure functions to compute Analytics Dashboard KPIs from mv_daily_kpis rows.
 *
 * Extracted for testability — the route handler fetches data and calls
 * these to produce the response shape. Logic is pure: same input -> same output.
 *
 * Built for the Analytics API which has richer breakdowns than the Dashboard:
 * work orders by status JSONB, appointments by status JSONB, daily trends.
 */

import type { MvKpiRow } from "./compute-dashboard-kpis";

// ---------------------------------------------------------------------------
// Domain constants — optical shop status lifecycle
// ---------------------------------------------------------------------------

const PENDING_WO_STATUSES = new Set([
  "quote",
  "ordered",
  "sent_to_lab",
  "received_from_lab",
  "mounted",
  "quality_check",
]);

const COMPLETED_WO_STATUSES = new Set(["delivered"]);
const CANCELLED_WO_STATUSES = new Set(["cancelled"]);

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WorkOrdersSection {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  byStatus: Record<string, number>;
}

export interface AppointmentsSection {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  byStatus: Record<string, number>;
  completionRate: number;
}

export interface TrendEntry {
  date: string;
  value: number;
  count: number;
}

export interface AnalyticsMvResult {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  totalWorkOrders: number;
  totalQuotes: number;
  totalAppointments: number;
  workOrders: WorkOrdersSection;
  appointments: AppointmentsSection;
  salesTrends: TrendEntry[];
  workOrderTrends: TrendEntry[];
  quoteTrends: TrendEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumNumeric(rows: MvKpiRow[], key: "revenue" | "orders_count" | "quotes_count"): number {
  return rows.reduce((s, r) => s + Number(r[key]), 0);
}

function mergeJsonb(
  rows: MvKpiRow[],
  field: "work_orders_by_status" | "appointments_by_status",
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const row of rows) {
    for (const [status, count] of Object.entries(row[field] ?? {})) {
      acc[status] = (acc[status] ?? 0) + count;
    }
  }
  return acc;
}

function sumStatuses(
  map: Record<string, number>,
  filter: Set<string>,
): number {
  let total = 0;
  for (const status of filter) {
    total += map[status] ?? 0;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

export function computeAnalyticsMvData(
  mvRows: MvKpiRow[],
  periodDays: number,
  startDate: Date,
  endDate: Date,
): AnalyticsMvResult {
  // Split into current / previous periods for growth
  const prevPeriodStart = new Date(startDate);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);

  const currentRows = mvRows.filter((r) => {
    const d = new Date(r.day + "T00:00:00");
    return d >= startDate && d <= endDate;
  });

  const prevRows = mvRows.filter((r) => {
    const d = new Date(r.day + "T00:00:00");
    return d >= prevPeriodStart && d < startDate;
  });

  // --- Revenue & growth ---
  const currentRevenue = sumNumeric(currentRows, "revenue");
  const prevRevenue = sumNumeric(prevRows, "revenue");
  const revenueGrowth =
    prevRevenue > 0
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
      : 0;

  const totalOrders = sumNumeric(mvRows, "orders_count");
  const totalQuotes = sumNumeric(mvRows, "quotes_count");

  // --- Work orders (from JSONB) ---
  const allWoStatuses = mergeJsonb(mvRows, "work_orders_by_status");
  const totalWorkOrders = Object.values(allWoStatuses).reduce((s, c) => s + c, 0);
  const pendingWorkOrders = sumStatuses(allWoStatuses, PENDING_WO_STATUSES);
  const completedWorkOrders = sumStatuses(allWoStatuses, COMPLETED_WO_STATUSES);
  const cancelledWorkOrders = sumStatuses(allWoStatuses, CANCELLED_WO_STATUSES);

  // --- Appointments (from JSONB) ---
  const allAptStatuses = mergeJsonb(mvRows, "appointments_by_status");
  const totalAppointments = Object.values(allAptStatuses).reduce((s, c) => s + c, 0);
  const completedAppointments = allAptStatuses["completed"] ?? 0;
  const cancelledAppointments = allAptStatuses["cancelled"] ?? 0;
  const noShowAppointments = allAptStatuses["no_show"] ?? 0;
  const appointmentCompletionRate =
    totalAppointments > 0
      ? (completedAppointments / totalAppointments) * 100
      : 0;

  // --- Daily trends (sorted by date) ---
  const sorted = [...mvRows].sort((a, b) => a.day.localeCompare(b.day));

  const salesTrends: TrendEntry[] = sorted.map((r) => ({
    date: r.day,
    value: Number(r.revenue),
    count: Number(r.orders_count),
  }));

  const workOrderTrends: TrendEntry[] = sorted.map((r) => {
    const dayTotal = Object.values(r.work_orders_by_status ?? {}).reduce(
      (s, c) => s + c,
      0,
    );
    return { date: r.day, value: dayTotal, count: dayTotal };
  });

  const quoteTrends: TrendEntry[] = sorted.map((r) => ({
    date: r.day,
    value: Number(r.quotes_count),
    count: Number(r.quotes_count),
  }));

  return {
    totalRevenue: currentRevenue,
    revenueGrowth,
    totalOrders,
    totalWorkOrders,
    totalQuotes,
    totalAppointments,
    workOrders: {
      total: totalWorkOrders,
      pending: pendingWorkOrders,
      completed: completedWorkOrders,
      cancelled: cancelledWorkOrders,
      byStatus: allWoStatuses,
    },
    appointments: {
      total: totalAppointments,
      completed: completedAppointments,
      cancelled: cancelledAppointments,
      noShow: noShowAppointments,
      byStatus: allAptStatuses,
      completionRate: Math.round(appointmentCompletionRate * 100) / 100,
    },
    salesTrends,
    workOrderTrends,
    quoteTrends,
  };
}
