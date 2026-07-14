"use client";

import { LineChart as LineChartIcon, Target } from "lucide-react";
import dynamic from "next/dynamic";

const EnhancedAreaChart = dynamic(
  () =>
    import("@/components/admin/charts/EnhancedAreaChart").then(
      (m) => m.EnhancedAreaChart,
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  },
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsWorkOrdersTabProps {
  workOrders: {
    total: number;
    pending: number;
    completed: number;
  };
  avgDeliveryDays: number;
  workOrdersTrend: Array<{ date: string; value: number; count: number }>;
}

export function AnalyticsWorkOrdersTab({
  workOrders,
  avgDeliveryDays,
  workOrdersTrend,
}: AnalyticsWorkOrdersTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Work Orders Metrics */}
      <Card
        className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Métricas de Trabajos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-epoch-primary/10 rounded-lg border border-epoch-primary/20">
              <p className="text-lg sm:text-2xl font-bold text-epoch-primary">
                {workOrders.total}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Total Trabajos
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-lg sm:text-2xl font-bold text-orange-600">
                {workOrders.pending}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Pendientes
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {workOrders.completed}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Completados
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {avgDeliveryDays}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Días Promedio
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Trend */}
      <Card
        className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <LineChartIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Tendencia de Trabajos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <EnhancedAreaChart
            color="#1A2B23"
            data={workOrdersTrend}
            formatValue={(val) => Math.round(val).toString()}
            height={250}
            showGrid={true}
            title="Trabajos Creados por Día"
          />
        </CardContent>
      </Card>
    </div>
  );
}
