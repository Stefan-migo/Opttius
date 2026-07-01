import { describe, expect, it } from "vitest";

import {
  type MvKpiRow,
  computeDashboardKpis,
} from "@/lib/analytics/compute-dashboard-kpis";

describe("computeDashboardKpis", () => {
  const now = new Date("2026-07-15T12:00:00Z");

  it("should return zero revenue and empty trend for empty MV data", () => {
    const result = computeDashboardKpis([], now);

    expect(result.revenue.current).toBe(0);
    expect(result.revenue.previous).toBe(0);
    expect(result.revenue.change).toBe(0);
    expect(result.revenue.currency).toBe("CLP");
    expect(result.orders.total).toBe(0);
    expect(result.workOrders.total).toBe(0);
    expect(result.workOrders.inProgress).toBe(0);
    expect(result.workOrders.pending).toBe(0);
    expect(result.workOrders.completed).toBe(0);
    expect(result.quotes.total).toBe(0);
    expect(result.charts.revenueTrend).toEqual([]);
  });

  it("should compute current month revenue from MV rows and zero previous", () => {
    const mvRows: MvKpiRow[] = [
      {
        day: "2026-07-01",
        revenue: 50000,
        orders_count: 3,
        work_orders_by_status: { delivered: 2 },
        appointments_by_status: { confirmed: 5 },
        products_sold: 8,
        quotes_count: 2,
      },
      {
        day: "2026-07-02",
        revenue: 75000,
        orders_count: 5,
        work_orders_by_status: { ordered: 1, in_progress_lab: 2 },
        appointments_by_status: { scheduled: 3 },
        products_sold: 12,
        quotes_count: 1,
      },
    ];

    const result = computeDashboardKpis(mvRows, now);

    expect(result.revenue.current).toBe(125000);
    expect(result.revenue.previous).toBe(0);
    expect(result.revenue.change).toBe(0);
    expect(result.orders.total).toBe(8);
    expect(result.quotes.total).toBe(3);
  });

  it("should compute revenue change when previous month has data", () => {
    const mvRows: MvKpiRow[] = [
      // Current month (July)
      {
        day: "2026-07-01",
        revenue: 100000,
        orders_count: 0,
        work_orders_by_status: {},
        appointments_by_status: {},
        products_sold: 0,
        quotes_count: 0,
      },
      // Previous month (June)
      {
        day: "2026-06-01",
        revenue: 80000,
        orders_count: 0,
        work_orders_by_status: {},
        appointments_by_status: {},
        products_sold: 0,
        quotes_count: 0,
      },
    ];

    const result = computeDashboardKpis(mvRows, now);

    expect(result.revenue.current).toBe(100000);
    expect(result.revenue.previous).toBe(80000);
    // (100000 - 80000) / 80000 * 100 = 25
    expect(result.revenue.change).toBeCloseTo(25, 1);
  });

  it("should handle negative revenue change", () => {
    const mvRows: MvKpiRow[] = [
      { day: "2026-07-01", revenue: 30000, orders_count: 0, work_orders_by_status: {}, appointments_by_status: {}, products_sold: 0, quotes_count: 0 },
      { day: "2026-06-01", revenue: 60000, orders_count: 0, work_orders_by_status: {}, appointments_by_status: {}, products_sold: 0, quotes_count: 0 },
    ];

    const result = computeDashboardKpis(mvRows, now);

    expect(result.revenue.current).toBe(30000);
    expect(result.revenue.previous).toBe(60000);
    expect(result.revenue.change).toBeCloseTo(-50, 1);
  });

  it("should extract work order statuses from JSONB across all rows", () => {
    const mvRows: MvKpiRow[] = [
      {
        day: "2026-07-01",
        revenue: 0,
        orders_count: 0,
        work_orders_by_status: { ordered: 2, sent_to_lab: 1, delivered: 3 },
        appointments_by_status: {},
        products_sold: 0,
        quotes_count: 0,
      },
      {
        day: "2026-07-02",
        revenue: 0,
        orders_count: 0,
        work_orders_by_status: { in_progress_lab: 2, quality_check: 1 },
        appointments_by_status: {},
        products_sold: 0,
        quotes_count: 0,
      },
    ];

    const result = computeDashboardKpis(mvRows, now);

    expect(result.workOrders.total).toBe(9);
    // inProgress: sent_to_lab(1) + in_progress_lab(2) + quality_check(1) = 4
    expect(result.workOrders.inProgress).toBe(4);
    // pending: ordered(2)
    expect(result.workOrders.pending).toBe(2);
    // completed: delivered(3)
    expect(result.workOrders.completed).toBe(3);
  });

  it("should include order metadata in work order statuses", () => {
    // Test with a status that is not in the known lists — should still count toward total
    const mvRows: MvKpiRow[] = [
      {
        day: "2026-07-01",
        revenue: 0,
        orders_count: 0,
        work_orders_by_status: { unknown_status: 5 },
        appointments_by_status: {},
        products_sold: 0,
        quotes_count: 0,
      },
    ];

    const result = computeDashboardKpis(mvRows, now);

    expect(result.workOrders.total).toBe(5);
    expect(result.workOrders.inProgress).toBe(0);
    expect(result.workOrders.pending).toBe(0);
    expect(result.workOrders.completed).toBe(0);
  });

  it("should build revenue trend sorted by date ascending", () => {
    const mvRows: MvKpiRow[] = [
      { day: "2026-07-03", revenue: 30000, orders_count: 2, work_orders_by_status: {}, appointments_by_status: {}, products_sold: 0, quotes_count: 0 },
      { day: "2026-07-01", revenue: 10000, orders_count: 1, work_orders_by_status: {}, appointments_by_status: {}, products_sold: 0, quotes_count: 0 },
      { day: "2026-07-02", revenue: 20000, orders_count: 3, work_orders_by_status: {}, appointments_by_status: {}, products_sold: 0, quotes_count: 0 },
    ];

    const result = computeDashboardKpis(mvRows, now);

    expect(result.charts.revenueTrend).toHaveLength(3);
    expect(result.charts.revenueTrend[0]).toEqual({ date: "2026-07-01", revenue: 10000, orders: 1 });
    expect(result.charts.revenueTrend[1]).toEqual({ date: "2026-07-02", revenue: 20000, orders: 3 });
    expect(result.charts.revenueTrend[2]).toEqual({ date: "2026-07-03", revenue: 30000, orders: 2 });
  });

  it("should coerce string numeric values from Supabase JSON", () => {
    // Supabase returns JSONB numbers as regular JS numbers, but test the edge
    const mvRows: MvKpiRow[] = [
      {
        day: "2026-07-01",
        revenue: 0,
        orders_count: 0,
        work_orders_by_status: { delivered: 0 },
        appointments_by_status: {},
        products_sold: 0,
        quotes_count: 0,
      },
    ];

    const result = computeDashboardKpis(mvRows, now);

    expect(result.revenue.current).toBe(0);
    expect(result.workOrders.total).toBe(0);
    expect(result.workOrders.completed).toBe(0);
  });
});
