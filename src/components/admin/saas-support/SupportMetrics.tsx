"use client";

import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";

const EnhancedBarChart = dynamic(
  () =>
    import("@/components/admin/charts/EnhancedBarChart").then(
      (m) => m.EnhancedBarChart,
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  },
);
const EnhancedColumnChart = dynamic(
  () =>
    import("@/components/admin/charts/EnhancedColumnChart").then(
      (m) => m.EnhancedColumnChart,
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  },
);
const EnhancedPieChart = dynamic(
  () =>
    import("@/components/admin/charts/EnhancedPieChart").then(
      (m) => m.EnhancedPieChart,
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  },
);
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SupportMetrics {
  totalTickets: number;
  statusCounts: {
    open: number;
    assigned: number;
    in_progress: number;
    waiting_customer: number;
    resolved: number;
    closed: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  categoryCounts: Record<string, number>;
  averageResponseTimeMinutes: number | null;
  averageResolutionTimeMinutes: number | null;
  averageSatisfactionRating: number | null;
  ticketsPerDay: Record<string, number>;
  topOrganizations: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}

export function SupportMetrics() {
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        "/api/admin/saas-management/support/metrics",
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const openTickets =
    metrics.statusCounts.open +
    metrics.statusCounts.assigned +
    metrics.statusCounts.in_progress +
    metrics.statusCounts.waiting_customer;

  const resolvedTickets =
    metrics.statusCounts.resolved + metrics.statusCounts.closed;

  // Chart data: tickets per day (last 30 days)
  const ticketsPerDayChartData = useMemo(() => {
    const entries = Object.entries(metrics.ticketsPerDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30);
    return entries.map(([date, value]) => ({
      date,
      value,
      count: value,
    }));
  }, [metrics.ticketsPerDay]);

  // Pie chart: status distribution
  const statusPieData = useMemo(
    () =>
      Object.entries(metrics.statusCounts)
        .filter(([, v]) => v > 0)
        .map(([label, value]) => ({
          label: label.replace("_", " "),
          value,
        })),
    [metrics.statusCounts],
  );

  // Pie chart: priority distribution
  const priorityPieData = useMemo(
    () =>
      Object.entries(metrics.priorityCounts)
        .filter(([, v]) => v > 0)
        .map(([label, value]) => ({
          label: label.replace("_", " "),
          value,
        })),
    [metrics.priorityCounts],
  );

  // Bar chart: top organizations
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
    const url = `/api/admin/saas-management/support/export?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Exportar reporte (CSV)
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Tickets
                </p>
                <p className="text-2xl font-bold">{metrics.totalTickets}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Abiertos</p>
                <p className="text-2xl font-bold text-orange-600">
                  {openTickets}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resueltos</p>
                <p className="text-2xl font-bold text-green-600">
                  {resolvedTickets}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tiempo Respuesta
                </p>
                <p className="text-2xl font-bold">
                  {metrics.averageResponseTimeMinutes
                    ? `${Math.floor(metrics.averageResponseTimeMinutes / 60)}h ${metrics.averageResponseTimeMinutes % 60}m`
                    : "N/A"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tickets por día (últimos 30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketsPerDayChartData.length > 0 ? (
              <EnhancedColumnChart
                color="#3B82F6"
                data={ticketsPerDayChartData}
                formatValue={(v) => v.toString()}
                height={280}
                title="Tickets creados"
              />
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">
                No hay datos en el período
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <EnhancedPieChart
                showLegend
                showPercentage
                data={statusPieData}
                formatValue={(v) => v.toString()}
                height={280}
              />
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">
                No hay datos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Prioridad</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityPieData.length > 0 ? (
              <EnhancedPieChart
                showLegend
                showPercentage
                data={priorityPieData}
                formatValue={(v) => v.toString()}
                height={280}
              />
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">
                No hay datos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top organizaciones por tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topOrgsBarData.length > 0 ? (
              <EnhancedBarChart
                horizontal
                color="#1E40AF"
                data={topOrgsBarData}
                formatValue={(v) => v.toString()}
                height={280}
              />
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">
                No hay datos
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Breakdown (list) */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.statusCounts).map(([status, count]) => (
                <div className="flex items-center justify-between" key={status}>
                  <span className="text-sm font-medium capitalize">
                    {status.replace("_", " ")}
                  </span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Breakdown (list) */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Prioridad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.priorityCounts).map(
                ([priority, count]) => (
                  <div
                    className="flex items-center justify-between"
                    key={priority}
                  >
                    <span className="text-sm font-medium capitalize">
                      {priority}
                    </span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.categoryCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div
                    className="flex items-center justify-between"
                    key={category}
                  >
                    <span className="text-sm font-medium capitalize">
                      {category.replace("_", " ")}
                    </span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Organizations list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Organizaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topOrganizations.length === 0 ? (
              <p className="text-sm text-gray-500">No hay datos disponibles</p>
            ) : (
              <div className="space-y-3">
                {metrics.topOrganizations.map((org) => (
                  <div
                    className="flex items-center justify-between"
                    key={org.id}
                  >
                    <span className="text-sm font-medium truncate">
                      {org.name}
                    </span>
                    <Badge variant="outline">{org.count} tickets</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Tiempo Promedio de Respuesta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {metrics.averageResponseTimeMinutes
                ? `${Math.floor(metrics.averageResponseTimeMinutes / 60)}h ${metrics.averageResponseTimeMinutes % 60}m`
                : "N/A"}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Tiempo hasta primera respuesta del equipo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Tiempo Promedio de Resolución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {metrics.averageResolutionTimeMinutes
                ? `${Math.floor(metrics.averageResolutionTimeMinutes / 60)}h ${metrics.averageResolutionTimeMinutes % 60}m`
                : "N/A"}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Tiempo hasta resolución completa del ticket
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Satisfacción del Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {metrics.averageSatisfactionRating
                ? `${metrics.averageSatisfactionRating.toFixed(1)}/5`
                : "N/A"}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Calificación promedio de los tickets resueltos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
