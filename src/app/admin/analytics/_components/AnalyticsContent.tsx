"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";

import { useAnalytics } from "../../hooks/useAnalytics";
import { AnalyticsHeader } from "./AnalyticsHeader";
import { AnalyticsKPICards } from "./AnalyticsKPICards";
import { AnalyticsOverviewTab } from "./AnalyticsOverviewTab";
import type { AnalyticsData } from "./analyticsUtils";



export default function AnalyticsContent() {
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    isLoading: branchLoading,
  } = useBranch();
  const [period, setPeriod] = useState("30");

  // Chart type selectors - Changed defaults from "area" to "column"
  const [salesChartType, setSalesChartType] = useState<"column" | "line">(
    "column",
  );
  const [workOrdersChartType, setWorkOrdersChartType] = useState<
    "column" | "line"
  >("column");
  const [quotesChartType, setQuotesChartType] = useState<"column" | "line">(
    "column",
  );

  const isGlobalView = !currentBranchId && isSuperAdmin;

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useAnalytics({ branchId: currentBranchId, period });
  const analytics = data as AnalyticsData;

  if (isLoading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-epoch-primary">
            Analíticas y Reportes
          </h1>
          <p className="text-sm text-admin-text-tertiary">
            Cargando datos analíticos...
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <Card className="animate-pulse" key={i} rounded="none">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-epoch-primary">
            Analíticas y Reportes
          </h1>
          <p className="text-sm text-admin-text-tertiary">
            Error al cargar los datos
          </p>
        </div>
        <Card rounded="none">
          <CardContent className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error al cargar analíticas
            </h3>
            <p className="text-admin-text-tertiary mb-4">
              {error?.message || "No se pudieron cargar los datos"}
            </p>
            <Button onClick={refetch}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        title="Analíticas y Reportes"
        description={
          isGlobalView
            ? `Métricas y análisis - Todas las sucursales - Últimos ${analytics.period.days} días`
            : `Métricas y análisis - Últimos ${analytics.period.days} días`
        }
        period={period}
        refreshing={isRefetching}
        onPeriodChange={setPeriod}
        onRefresh={refetch}
      />

      <AnalyticsKPICards
        kpis={analytics.kpis}
        workOrders={analytics.workOrders}
        quotes={analytics.quotes}
        appointments={analytics.appointments}
        products={analytics.products}
      />

      {/* Analytics Tabs */}
      <Tabs className="space-y-6" defaultValue="overview">
        <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 min-w-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-admin-border-primary/40">
          <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-full flex-nowrap gap-1 sm:gap-2 p-1 h-auto rounded-md bg-muted">
            <TabsTrigger
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
              value="overview"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
              value="work-orders"
            >
              Trabajos
            </TabsTrigger>
            <TabsTrigger
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
              value="quotes"
            >
              Presupuestos
            </TabsTrigger>
            <TabsTrigger
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
              value="sales"
            >
              Ventas
            </TabsTrigger>
            <TabsTrigger
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
              value="products"
            >
              Productos
            </TabsTrigger>
            {analytics.support && (
              <TabsTrigger
                className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
                value="support"
              >
                Incidentes
              </TabsTrigger>
            )}
          </TabsList>
        </div>

                <TabsContent className="space-y-4 sm:space-y-6" value="overview">
          <AnalyticsOverviewTab
            trends={analytics.trends}
            workOrders={analytics.workOrders}
            quotes={analytics.quotes}
            salesChartType={salesChartType}
            workOrdersChartType={workOrdersChartType}
            onSalesChartTypeChange={setSalesChartType}
            onWorkOrdersChartTypeChange={setWorkOrdersChartType}
          />
        </TabsContent>

                <TabsContent className="space-y-4 sm:space-y-6" value="work-orders">
          <AnalyticsWorkOrdersTab
            workOrders={analytics.workOrders}
            avgDeliveryDays={analytics.kpis.avgDeliveryDays}
            workOrdersTrend={analytics.trends.workOrders}
          />
        </TabsContent>

                <TabsContent className="space-y-4 sm:space-y-6" value="quotes">
          <AnalyticsQuotesTab
            quotes={analytics.quotes}
            avgQuoteValue={analytics.kpis.avgQuoteValue}
            quoteConversionRate={analytics.kpis.quoteConversionRate}
            quotesTrend={analytics.trends.quotes}
            quotesChartType={quotesChartType}
            onQuotesChartTypeChange={setQuotesChartType}
          />
        </TabsContent>

        <TabsContent className="space-y-4 sm:space-y-6" value="sales">
          <AnalyticsSalesTab
            categoryRevenue={analytics.products.categoryRevenue}
            paymentMethods={analytics.paymentMethods}
            kpis={{
              totalRevenue: analytics.kpis.totalRevenue,
              avgOrderValue: analytics.kpis.avgOrderValue,
              totalOrders: analytics.kpis.totalOrders,
              revenueGrowth: analytics.kpis.revenueGrowth,
            }}
          />
        </TabsContent>

        <TabsContent className="space-y-4 sm:space-y-6" value="products">
          <AnalyticsProductsTab products={analytics.products} />
        </TabsContent>

        {analytics.support && (
          <TabsContent className="space-y-4 sm:space-y-6" value="support">
            <AnalyticsSupportTab support={analytics.support} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
