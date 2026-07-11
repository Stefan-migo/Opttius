"use client";

import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Wrench,
} from "lucide-react";
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
const EnhancedLineChart = dynamic(
  () =>
    import("@/components/admin/charts/EnhancedLineChart").then(
      (m) => m.EnhancedLineChart,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { formatPrice, getStatusLabel } from "./analyticsUtils";

interface AnalyticsOverviewTabProps {
  trends: {
    sales: Array<{ date: string; value: number; count: number }>;
    workOrders: Array<{ date: string; value: number; count: number }>;
  };
  workOrders: {
    byStatus: Record<string, number>;
  };
  quotes: {
    byStatus: Record<string, number>;
  };
  salesChartType: "column" | "line";
  workOrdersChartType: "column" | "line";
  onSalesChartTypeChange: (type: "column" | "line") => void;
  onWorkOrdersChartTypeChange: (type: "column" | "line") => void;
}

export function AnalyticsOverviewTab({
  trends,
  workOrders,
  quotes,
  salesChartType,
  workOrdersChartType,
  onSalesChartTypeChange,
  onWorkOrdersChartTypeChange,
}: AnalyticsOverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Revenue Trend */}
      <Card
        className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <CardTitle className="text-base sm:text-lg truncate">
                Tendencia de Ingresos
              </CardTitle>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
                size="sm"
                variant={
                  salesChartType === "column" ? "default" : "outline"
                }
                onClick={() => onSalesChartTypeChange("column")}
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Barras
              </Button>
              <Button
                className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
                size="sm"
                variant={
                  salesChartType === "line" ? "default" : "outline"
                }
                onClick={() => onSalesChartTypeChange("line")}
              >
                <LineChartIcon className="h-3 w-3 mr-1" />
                Líneas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {salesChartType === "column" ? (
            <EnhancedColumnChart
              color="#C5A059"
              data={trends.sales}
              formatValue={formatPrice}
              height={250}
              title="Ingresos por Período"
            />
          ) : (
            <EnhancedLineChart
              color="#C5A059"
              data={trends.sales}
              formatValue={formatPrice}
              height={250}
              showGrid={true}
              title="Evolución de Ingresos"
            />
          )}
        </CardContent>
      </Card>

      {/* Work Orders Trend */}
      <Card
        className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Wrench className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <CardTitle className="text-base sm:text-lg truncate">
                Trabajos de Laboratorio
              </CardTitle>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
                size="sm"
                variant={
                  workOrdersChartType === "column" ? "default" : "outline"
                }
                onClick={() => onWorkOrdersChartTypeChange("column")}
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Barras
              </Button>
              <Button
                className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
                size="sm"
                variant={
                  workOrdersChartType === "line" ? "default" : "outline"
                }
                onClick={() => onWorkOrdersChartTypeChange("line")}
              >
                <LineChartIcon className="h-3 w-3 mr-1" />
                Líneas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {workOrdersChartType === "column" ? (
            <EnhancedColumnChart
              color="#1A2B23"
              data={trends.workOrders}
              formatValue={(val) => Math.round(val).toString()}
              height={250}
              title="Trabajos por Período"
            />
          ) : (
            <EnhancedLineChart
              color="#1A2B23"
              data={trends.workOrders}
              formatValue={(val) => Math.round(val).toString()}
              height={250}
              showGrid={true}
              title="Evolución de Trabajos"
            />
          )}
        </CardContent>
      </Card>

      {/* Work Orders Status Distribution */}
      <Card
        className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2 min-w-0">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <CardTitle className="text-base sm:text-lg truncate">
              Estados de Trabajos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {Object.keys(workOrders.byStatus).length > 0 ? (
            <EnhancedPieChart
              data={Object.entries(workOrders.byStatus).map(
                ([status, count]) => ({
                  label: getStatusLabel(status),
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
              No hay trabajos en este período
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotes Status Distribution */}
      <Card
        className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2 min-w-0">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <CardTitle className="text-base sm:text-lg truncate">
              Estados de Presupuestos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {Object.keys(quotes.byStatus).length > 0 ? (
            <EnhancedPieChart
              data={Object.entries(quotes.byStatus).map(
                ([status, count]) => ({
                  label: getStatusLabel(status),
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
              No hay presupuestos en este período
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
