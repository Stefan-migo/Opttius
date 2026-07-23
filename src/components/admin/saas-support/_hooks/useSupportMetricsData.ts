"use client";

import { useMemo } from "react";

interface SupportMetrics {
  totalTickets: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  averageResponseTimeMinutes: number | null;
  averageResolutionTimeMinutes: number | null;
  averageSatisfactionRating: number | null;
  ticketsPerDay: Record<string, number>;
  topOrganizations: Array<{ id: string; name: string; count: number }>;
}

export function useSupportMetricsData(metrics: SupportMetrics) {
  const openTickets =
    (metrics.statusCounts.open || 0) +
    (metrics.statusCounts.assigned || 0) +
    (metrics.statusCounts.in_progress || 0) +
    (metrics.statusCounts.waiting_customer || 0);

  const resolvedTickets =
    (metrics.statusCounts.resolved || 0) + (metrics.statusCounts.closed || 0);

  const ticketsPerDayChartData = useMemo(() => {
    const entries = Object.entries(metrics.ticketsPerDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30);
    return entries.map(([date, value]) => ({ date, value, count: value }));
  }, [metrics.ticketsPerDay]);

  const statusPieData = useMemo(
    () =>
      Object.entries(metrics.statusCounts)
        .filter(([, v]) => v > 0)
        .map(([label, value]) => ({ label: label.replace("_", " "), value })),
    [metrics.statusCounts],
  );

  const priorityPieData = useMemo(
    () =>
      Object.entries(metrics.priorityCounts)
        .filter(([, v]) => v > 0)
        .map(([label, value]) => ({ label: label.replace("_", " "), value })),
    [metrics.priorityCounts],
  );

  const topOrgsBarData = useMemo(
    () =>
      metrics.topOrganizations.slice(0, 8).map((org) => ({
        label: org.name.length > 25 ? org.name.slice(0, 22) + "…" : org.name,
        value: org.count,
      })),
    [metrics.topOrganizations],
  );

  const handleExportCsv = () => {
    const params = new URLSearchParams({ format: "csv", limit: "5000" });
    window.open(
      `/api/admin/saas-management/support/export?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return {
    openTickets,
    resolvedTickets,
    ticketsPerDayChartData,
    statusPieData,
    priorityPieData,
    topOrgsBarData,
    handleExportCsv,
  };
}
