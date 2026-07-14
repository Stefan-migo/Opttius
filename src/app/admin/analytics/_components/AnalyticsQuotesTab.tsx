"use client";

import { BarChart3, LineChart as LineChartIcon, Receipt, Target } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { formatPrice } from "./analyticsUtils";

interface AnalyticsQuotesTabProps {
  quotes: {
    total: number;
    accepted: number;
    converted: number;
    rejected: number;
  };
  avgQuoteValue: number;
  quoteConversionRate: number;
  quotesTrend: Array<{ date: string; value: number; count: number }>;
  quotesChartType: "column" | "line";
  onQuotesChartTypeChange: (type: "column" | "line") => void;
}

export function AnalyticsQuotesTab({
  quotes,
  avgQuoteValue,
  quoteConversionRate,
  quotesTrend,
  quotesChartType,
  onQuotesChartTypeChange,
}: AnalyticsQuotesTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Quotes Metrics */}
      <Card
        className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Métricas de Presupuestos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-epoch-accent/10 rounded-lg border border-epoch-accent/20">
              <p className="text-lg sm:text-2xl font-bold text-epoch-accent">
                {quotes.total}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Total
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {quotes.accepted + quotes.converted}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Aceptados
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-lg sm:text-2xl font-bold text-red-600">
                {quotes.rejected}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Rechazados
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {quoteConversionRate.toFixed(1)}%
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Tasa Conversión
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-admin-text-tertiary mb-2">
              Valor Promedio
            </p>
            <p className="text-lg sm:text-xl font-bold text-epoch-primary">
              {formatPrice(avgQuoteValue)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Trend */}
      <Card
        className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <CardTitle className="text-base sm:text-lg truncate">
                Tendencia de Presupuestos
              </CardTitle>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
                size="sm"
                variant={
                  quotesChartType === "column" ? "default" : "outline"
                }
                onClick={() => onQuotesChartTypeChange("column")}
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Barras
              </Button>
              <Button
                className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
                size="sm"
                variant={
                  quotesChartType === "line" ? "default" : "outline"
                }
                onClick={() => onQuotesChartTypeChange("line")}
              >
                <LineChartIcon className="h-3 w-3 mr-1" />
                Líneas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {quotesChartType === "column" ? (
            <EnhancedColumnChart
              color="#C5A059"
              data={quotesTrend}
              formatValue={(val) => Math.round(val).toString()}
              height={250}
              title="Presupuestos por Período"
            />
          ) : (
            <EnhancedLineChart
              color="#C5A059"
              data={quotesTrend}
              formatValue={(val) => Math.round(val).toString()}
              height={250}
              showGrid={true}
              title="Presupuestos Creados por Día"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
