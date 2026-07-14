"use client";

import { BarChart3, PieChart as PieChartIcon, Target } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  formatPrice,
  formatPercentage,
  getPaymentMethodLabel,
} from "./analyticsUtils";

interface AnalyticsSalesTabProps {
  categoryRevenue: Array<{ category: string; revenue: number }>;
  paymentMethods: Array<{ method: string; count: number; revenue: number }>;
  kpis: {
    totalRevenue: number;
    avgOrderValue: number;
    totalOrders: number;
    revenueGrowth: number;
  };
}

export function AnalyticsSalesTab({
  categoryRevenue,
  paymentMethods,
  kpis,
}: AnalyticsSalesTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Revenue by Category */}
      <Card
        className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Ingresos por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {categoryRevenue.length > 0 ? (
            <EnhancedBarChart
              color="#C5A059"
              data={categoryRevenue.map((cat) => ({
                label: cat.category,
                value: cat.revenue,
              }))}
              formatValue={formatPrice}
              height={Math.max(
                220,
                Math.min(350, categoryRevenue.length * 36),
              )}
              horizontal={true}
              title="Categorías Más Rentables"
            />
          ) : (
            <div className="text-center py-8 text-admin-text-tertiary">
              No hay datos de categorías
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card
        className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {paymentMethods.length > 0 ? (
            <EnhancedPieChart
              data={paymentMethods.map((pm) => ({
                label: getPaymentMethodLabel(pm.method),
                value: pm.revenue,
              }))}
              formatValue={formatPrice}
              height={280}
              showLegend={true}
              showPercentage={true}
              title="Distribución de Pagos"
            />
          ) : (
            <div className="text-center py-8 text-admin-text-tertiary">
              No hay datos de métodos de pago
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Metrics */}
      <Card
        className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Métricas de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-admin-success/10 rounded-lg border border-admin-success/20">
              <p className="text-lg sm:text-2xl font-bold text-admin-success">
                {formatPrice(kpis.totalRevenue)}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Ingresos Totales
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-epoch-primary/10 rounded-lg border border-epoch-primary/20">
              <p className="text-lg sm:text-2xl font-bold text-epoch-primary">
                {formatPrice(kpis.avgOrderValue)}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Ticket Promedio POS
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-epoch-accent/10 rounded-lg border border-epoch-accent/20">
              <p className="text-lg sm:text-2xl font-bold text-epoch-accent">
                {kpis.totalOrders}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Ventas POS
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
              <p
                className={`text-lg sm:text-2xl font-bold ${kpis.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatPercentage(kpis.revenueGrowth)}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Crecimiento
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
