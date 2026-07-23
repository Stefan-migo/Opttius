/**
 * Unit tests for compute-analytics-kpis — pure KPI computation functions.
 *
 * These are pure functions — same input → same output. No mocking needed.
 */
import { describe, expect, it } from "vitest";

import { computeAnalyticsMvData } from "@/lib/analytics/compute-analytics-kpis";
import type { MvKpiRow } from "@/lib/analytics/compute-dashboard-kpis";

const makeRow = (
  day: string,
  overrides?: Partial<MvKpiRow>,
): MvKpiRow => ({
  day,
  revenue: 0,
  orders_count: 0,
  work_orders_by_status: {},
  appointments_by_status: {},
  products_sold: 0,
  quotes_count: 0,
  ...overrides,
});

describe("computeAnalyticsMvData", () => {
  const startDate = new Date("2026-07-01T00:00:00Z");
  const endDate = new Date("2026-07-15T00:00:00Z");

  it("should return zero KPIs for empty MV data", () => {
    const result = computeAnalyticsMvData([], 30, startDate, endDate);

    expect(result.totalRevenue).toBe(0);
    expect(result.revenueGrowth).toBe(0);
    expect(result.totalOrders).toBe(0);
    expect(result.totalWorkOrders).toBe(0);
    expect(result.totalQuotes).toBe(0);
    expect(result.totalAppointments).toBe(0);
    expect(result.workOrders.total).toBe(0);
    expect(result.workOrders.pending).toBe(0);
    expect(result.workOrders.completed).toBe(0);
    expect(result.workOrders.cancelled).toBe(0);
    expect(result.appointments.total).toBe(0);
    expect(result.appointments.completionRate).toBe(0);
    expect(result.salesTrends).toEqual([]);
    expect(result.workOrderTrends).toEqual([]);
    expect(result.quoteTrends).toEqual([]);
  });

  it("should compute revenue for current period and zero growth when no previous", () => {
    const rows = [
      makeRow("2026-07-01", { revenue: 100000, orders_count: 5 }),
      makeRow("2026-07-02", { revenue: 50000, orders_count: 3 }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.totalRevenue).toBe(150000);
    expect(result.totalOrders).toBe(8);
    expect(result.revenueGrowth).toBe(0); // no previous period data
  });

  it("should compute revenue growth between current and previous period", () => {
    const rows = [
      // Current period (July 1-15)
      makeRow("2026-07-01", { revenue: 200000, orders_count: 10 }),
      // Previous period (June 1-15, because periodDays=30)
      makeRow("2026-06-01", { revenue: 100000, orders_count: 5 }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.totalRevenue).toBe(200000);
    expect(result.revenueGrowth).toBeCloseTo(100, 1); // (200k - 100k) / 100k * 100
  });

  it("should compute negative revenue growth", () => {
    const rows = [
      makeRow("2026-07-01", { revenue: 50000 }),
      makeRow("2026-06-01", { revenue: 100000 }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.totalRevenue).toBe(50000);
    expect(result.revenueGrowth).toBeCloseTo(-50, 1);
  });

  it("should compute work orders by status from JSONB across all rows", () => {
    const rows = [
      makeRow("2026-07-01", {
        work_orders_by_status: {
          quote: 3,
          sent_to_lab: 2,
          delivered: 5,
        },
      }),
      makeRow("2026-07-02", {
        work_orders_by_status: {
          ordered: 1,
          mounted: 4,
          cancelled: 2,
        },
      }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.totalWorkOrders).toBe(17); // 3+2+5+1+4+2
    // pending: quote(3) + ordered(1) + sent_to_lab(2) + mounted(4) = 10
    expect(result.workOrders.pending).toBe(10);
    // completed: delivered(5)
    expect(result.workOrders.completed).toBe(5);
    // cancelled: 2
    expect(result.workOrders.cancelled).toBe(2);
    // byStatus should include all
    expect(result.workOrders.byStatus).toEqual({
      quote: 3,
      sent_to_lab: 2,
      delivered: 5,
      ordered: 1,
      mounted: 4,
      cancelled: 2,
    });
  });

  it("should handle PENDING_WO_STATUSES correctly", () => {
    // Verify all statuses considered "pending"
    const allPending = {
      quote: 1,
      ordered: 1,
      sent_to_lab: 1,
      received_from_lab: 1,
      mounted: 1,
      quality_check: 1,
    };
    const rows = [
      makeRow("2026-07-01", {
        work_orders_by_status: allPending,
      }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.workOrders.pending).toBe(6);
    expect(result.workOrders.completed).toBe(0);
    expect(result.workOrders.cancelled).toBe(0);
  });

  it("should compute appointments by status from JSONB", () => {
    const rows = [
      makeRow("2026-07-01", {
        appointments_by_status: {
          scheduled: 5,
          confirmed: 3,
          completed: 10,
          cancelled: 2,
          no_show: 1,
        },
      }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.totalAppointments).toBe(21);
    expect(result.appointments.completed).toBe(10);
    expect(result.appointments.cancelled).toBe(2);
    expect(result.appointments.noShow).toBe(1);
    // completionRate = 10 / 21 * 100 = 47.62
    expect(result.appointments.completionRate).toBeCloseTo(47.62, 1);
  });

  it("should compute 0% completion rate when no appointments", () => {
    const rows = [makeRow("2026-07-01")];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.appointments.completionRate).toBe(0);
  });

  it("should compute total quotes across all rows", () => {
    const rows = [
      makeRow("2026-07-01", { quotes_count: 5 }),
      makeRow("2026-07-02", { quotes_count: 3 }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.totalQuotes).toBe(8);
  });

  it("should build sales trends sorted by date ascending", () => {
    const rows = [
      makeRow("2026-07-03", { revenue: 30000, orders_count: 3 }),
      makeRow("2026-07-01", { revenue: 10000, orders_count: 1 }),
      makeRow("2026-07-02", { revenue: 20000, orders_count: 2 }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.salesTrends).toHaveLength(3);
    expect(result.salesTrends[0]).toEqual({
      date: "2026-07-01",
      value: 10000,
      count: 1,
    });
    expect(result.salesTrends[1]).toEqual({
      date: "2026-07-02",
      value: 20000,
      count: 2,
    });
    expect(result.salesTrends[2]).toEqual({
      date: "2026-07-03",
      value: 30000,
      count: 3,
    });
  });

  it("should build work order trends", () => {
    const rows = [
      makeRow("2026-07-01", {
        work_orders_by_status: { quote: 2, delivered: 3 },
      }),
      makeRow("2026-07-02", {
        work_orders_by_status: { ordered: 1 },
      }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.workOrderTrends).toHaveLength(2);
    // value = total work orders for that day
    expect(result.workOrderTrends[0].value).toBe(5);
    expect(result.workOrderTrends[1].value).toBe(1);
  });

  it("should build quote trends", () => {
    const rows = [
      makeRow("2026-07-01", { quotes_count: 5 }),
      makeRow("2026-07-02", { quotes_count: 3 }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    expect(result.quoteTrends).toHaveLength(2);
    expect(result.quoteTrends[0]).toEqual({
      date: "2026-07-01",
      value: 5,
      count: 5,
    });
    expect(result.quoteTrends[1]).toEqual({
      date: "2026-07-02",
      value: 3,
      count: 3,
    });
  });

  it("should only count current period rows for revenue", () => {
    const rows = [
      // Current period
      makeRow("2026-07-01", { revenue: 50000 }),
      // Previous period
      makeRow("2026-06-15", { revenue: 30000 }),
      // Outside both periods (should count in totals but not revenue)
      makeRow("2026-05-01", { revenue: 10000, orders_count: 2 }),
    ];

    const result = computeAnalyticsMvData(rows, 30, startDate, endDate);

    // totalRevenue = only current period
    expect(result.totalRevenue).toBe(50000);
    // totalOrders = all rows
    expect(result.totalOrders).toBe(2);
  });
});
