"use client";

import { Headphones, LineChart as LineChartIcon, PieChart as PieChartIcon } from "lucide-react";
import dynamic from "next/dynamic";

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
import { MetricTooltip } from "@/components/admin/MetricTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getSupportCategoryLabel,
  getSupportStatusLabel,
} from "./analyticsUtils";

interface AnalyticsSupportTabProps {
  support: {
    total: number;
    open: number;
    resolved: number;
    avgResolutionMinutes: number | null;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    trends: Array<{ date: string; value: number; count: number }>;
  };
}

export function AnalyticsSupportTab({ support }: AnalyticsSupportTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Support KPIs */}
      <Card
        className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2 min-w-0">
            <Headphones className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <CardTitle className="flex items-center gap-1.5 text-base sm:text-lg truncate">
              Métricas de Incidentes
              <MetricTooltip metricKey="supportTicketsTotal" />
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-epoch-primary/10 rounded-lg border border-epoch-primary/20">
              <p className="text-lg sm:text-2xl font-bold text-epoch-primary">
                {support.total}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Total Tickets
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-lg sm:text-2xl font-bold text-orange-600">
                {support.open}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Abiertos
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {support.resolved}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Resueltos
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {support.avgResolutionMinutes != null
                  ? `${support.avgResolutionMinutes} min`
                  : "-"}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Tiempo Prom. Resolución
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Trend */}
      <Card
        className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <LineChartIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Tendencia de Incidentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {support.trends.some((t) => t.value > 0) ? (
            <EnhancedColumnChart
              color="#C5A059"
              data={support.trends}
              formatValue={(val) => Math.round(val).toString()}
              height={250}
              title="Tickets por Día"
            />
          ) : (
            <div className="text-center py-8 text-admin-text-tertiary">
              No hay incidentes en este período
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Status */}
      <Card
        className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Por Estado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {Object.keys(support.byStatus).length > 0 ? (
            <EnhancedPieChart
              data={Object.entries(support.byStatus).map(
                ([status, count]) => ({
                  label: getSupportStatusLabel(status),
                  value: count as number,
                }),
              )}
              formatValue={(val) => Math.round(val).toString()}
              height={250}
              showLegend={true}
              showPercentage={true}
              title="Distribución por Estado"
            />
          ) : (
            <div className="text-center py-8 text-admin-text-tertiary">
              No hay datos
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Category */}
      <Card
        className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {Object.keys(support.byCategory).length > 0 ? (
            <EnhancedPieChart
              data={Object.entries(support.byCategory).map(
                ([category, count]) => ({
                  label: getSupportCategoryLabel(category),
                  value: count as number,
                }),
              )}
              formatValue={(val) => Math.round(val).toString()}
              height={250}
              showLegend={true}
              showPercentage={true}
              title="Distribución por Categoría"
            />
          ) : (
            <div className="text-center py-8 text-admin-text-tertiary">
              No hay datos
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
