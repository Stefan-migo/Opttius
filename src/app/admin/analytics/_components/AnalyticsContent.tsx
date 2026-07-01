"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Headphones,
  LineChart as LineChartIcon,
  Package,
  PieChart as PieChartIcon,
  Receipt,
  RefreshCw,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { EnhancedAreaChart } from "@/components/admin/charts/EnhancedAreaChart";
import { EnhancedBarChart } from "@/components/admin/charts/EnhancedBarChart";
import { EnhancedColumnChart } from "@/components/admin/charts/EnhancedColumnChart";
import { EnhancedLineChart } from "@/components/admin/charts/EnhancedLineChart";
import { EnhancedPieChart } from "@/components/admin/charts/EnhancedPieChart";
import { MetricTooltip } from "@/components/admin/MetricTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";

import { useAnalytics } from "../../hooks/useAnalytics";
import { AnalyticsHeader } from "./AnalyticsHeader";
import { AnalyticsKPICards } from "./AnalyticsKPICards";

interface AnalyticsData {
  kpis: {
    totalRevenue: number;
    posRevenue: number;
    posTransactionCount?: number;
    workOrdersRevenue: number;
    revenueGrowth: number;
    totalOrders: number;
    totalWorkOrders: number;
    totalQuotes: number;
    totalAppointments: number;
    totalCustomers: number;
    newCustomers: number;
    recurringCustomers: number;
    avgOrderValue: number;
    avgWorkOrderValue: number;
    avgQuoteValue: number;
    quoteConversionRate: number;
    appointmentCompletionRate: number;
    avgDeliveryDays: number;
  };
  workOrders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    byStatus: Record<string, number>;
  };
  quotes: {
    total: number;
    accepted: number;
    rejected: number;
    expired: number;
    converted: number;
    byStatus: Record<string, number>;
    conversionRate: number;
  };
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    byStatus: Record<string, number>;
    completionRate: number;
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
    topProducts: Array<{
      id: string;
      name: string;
      category: string;
      revenue: number;
      quantity: number;
      orders: number;
    }>;
    categoryRevenue: Array<{ category: string; revenue: number }>;
  };
  paymentMethods: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
  trends: {
    sales: Array<{ date: string; value: number; count: number }>;
    customers: Array<{ date: string; value: number; count: number }>;
    workOrders: Array<{ date: string; value: number; count: number }>;
    quotes: Array<{ date: string; value: number; count: number }>;
    supportTickets?: Array<{ date: string; value: number; count: number }>;
  };
  support?: {
    total: number;
    open: number;
    resolved: number;
    avgResolutionMinutes: number | null;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    trends: Array<{ date: string; value: number; count: number }>;
  };
  period: {
    from: string;
    to: string;
    days: number;
  };
}

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

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatPercentage = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (growth < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      debit_card: "Tarjeta Débito",
      credit_card: "Tarjeta Crédito",
      installments: "Cuotas",
      transfer: "Transferencia",
      other: "Otro",
    };
    return labels[method] || method;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Borrador",
      sent: "Enviado",
      accepted: "Aceptado",
      rejected: "Rechazado",
      expired: "Expirado",
      converted_to_work: "Convertido",
      quote: "Presupuesto",
      ordered: "Ordenado",
      sent_to_lab: "Enviado al Lab",
      received_from_lab: "Recibido",
      mounted: "Montado",
      quality_check: "Control Calidad",
      ready_for_pickup: "Listo para Retiro",
      delivered: "Entregado",
      cancelled: "Cancelado",
      scheduled: "Agendada",
      completed: "Completada",
      no_show: "No Asistió",
    };
    return labels[status] || status;
  };

  const getSupportCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      lens_issue: "Problema con lente",
      frame_issue: "Problema con marco",
      prescription_issue: "Problema con receta",
      delivery_issue: "Problema con entrega",
      payment_issue: "Problema con pago",
      appointment_issue: "Problema con cita",
      customer_complaint: "Queja del cliente",
      quality_issue: "Problema de calidad",
      other: "Otros",
    };
    return labels[category] || category;
  };

  const getSupportStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Abierto",
      assigned: "Asignado",
      in_progress: "En progreso",
      waiting_customer: "Esperando cliente",
      resolved: "Resuelto",
      closed: "Cerrado",
    };
    return labels[status] || status;
  };

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
                      onClick={() => setSalesChartType("column")}
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
                      onClick={() => setSalesChartType("line")}
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
                    data={analytics.trends.sales}
                    formatValue={formatPrice}
                    height={250}
                    title="Ingresos por Período"
                  />
                ) : (
                  <EnhancedLineChart
                    color="#C5A059"
                    data={analytics.trends.sales}
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
                      onClick={() => setWorkOrdersChartType("column")}
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
                      onClick={() => setWorkOrdersChartType("line")}
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
                    data={analytics.trends.workOrders}
                    formatValue={(val) => Math.round(val).toString()}
                    height={250}
                    title="Trabajos por Período"
                  />
                ) : (
                  <EnhancedLineChart
                    color="#1A2B23"
                    data={analytics.trends.workOrders}
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
                {Object.keys(analytics.workOrders.byStatus).length > 0 ? (
                  <EnhancedPieChart
                    data={Object.entries(analytics.workOrders.byStatus).map(
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
                {Object.keys(analytics.quotes.byStatus).length > 0 ? (
                  <EnhancedPieChart
                    data={Object.entries(analytics.quotes.byStatus).map(
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
        </TabsContent>

        <TabsContent className="space-y-4 sm:space-y-6" value="work-orders">
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
                      {analytics.workOrders.total}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Total Trabajos
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-lg sm:text-2xl font-bold text-orange-600">
                      {analytics.workOrders.pending}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Pendientes
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-lg sm:text-2xl font-bold text-green-600">
                      {analytics.workOrders.completed}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Completados
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">
                      {analytics.kpis.avgDeliveryDays}
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
                  data={analytics.trends.workOrders}
                  formatValue={(val) => Math.round(val).toString()}
                  height={250}
                  showGrid={true}
                  title="Trabajos Creados por Día"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4 sm:space-y-6" value="quotes">
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
                      {analytics.quotes.total}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Total
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-lg sm:text-2xl font-bold text-green-600">
                      {analytics.quotes.accepted + analytics.quotes.converted}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Aceptados
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-lg sm:text-2xl font-bold text-red-600">
                      {analytics.quotes.rejected}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Rechazados
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">
                      {analytics.kpis.quoteConversionRate.toFixed(1)}%
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
                    {formatPrice(analytics.kpis.avgQuoteValue)}
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
                      onClick={() => setQuotesChartType("column")}
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
                      onClick={() => setQuotesChartType("line")}
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
                    data={analytics.trends.quotes}
                    formatValue={(val) => Math.round(val).toString()}
                    height={250}
                    title="Presupuestos por Período"
                  />
                ) : (
                  <EnhancedLineChart
                    color="#C5A059"
                    data={analytics.trends.quotes}
                    formatValue={(val) => Math.round(val).toString()}
                    height={250}
                    showGrid={true}
                    title="Presupuestos Creados por Día"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4 sm:space-y-6" value="sales">
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
                {analytics.products.categoryRevenue.length > 0 ? (
                  <EnhancedBarChart
                    color="#C5A059"
                    data={analytics.products.categoryRevenue.map((cat) => ({
                      label: cat.category,
                      value: cat.revenue,
                    }))}
                    formatValue={formatPrice}
                    height={Math.max(
                      220,
                      Math.min(
                        350,
                        analytics.products.categoryRevenue.length * 36,
                      ),
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
                {analytics.paymentMethods.length > 0 ? (
                  <EnhancedPieChart
                    data={analytics.paymentMethods.map((pm) => ({
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
                      {formatPrice(analytics.kpis.totalRevenue)}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Ingresos Totales
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-epoch-primary/10 rounded-lg border border-epoch-primary/20">
                    <p className="text-lg sm:text-2xl font-bold text-epoch-primary">
                      {formatPrice(analytics.kpis.avgOrderValue)}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Ticket Promedio POS
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-epoch-accent/10 rounded-lg border border-epoch-accent/20">
                    <p className="text-lg sm:text-2xl font-bold text-epoch-accent">
                      {analytics.kpis.totalOrders}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Ventas POS
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <p
                      className={`text-lg sm:text-2xl font-bold ${analytics.kpis.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatPercentage(analytics.kpis.revenueGrowth)}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Crecimiento
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4 sm:space-y-6" value="products">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Products */}
            <Card
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              rounded="none"
            >
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Productos Más Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {analytics.products.topProducts.length > 0 ? (
                  <EnhancedBarChart
                    color="#C5A059"
                    data={analytics.products.topProducts
                      .slice(0, 8)
                      .map((prod) => ({
                        label: prod.name,
                        value: prod.revenue,
                      }))}
                    formatValue={formatPrice}
                    height={Math.min(
                      320,
                      Math.max(
                        220,
                        analytics.products.topProducts.slice(0, 8).length * 40,
                      ),
                    )}
                    horizontal={true}
                    title="Por Ingresos"
                  />
                ) : (
                  <div className="text-center py-8 text-admin-text-tertiary">
                    No hay productos vendidos en este período
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Performance Table */}
            <Card
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              rounded="none"
            >
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                  Rendimiento Detallado
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {analytics.products.topProducts.length > 0 ? (
                  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 min-w-0 [scrollbar-width:thin]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Ingresos</TableHead>
                          <TableHead>Cantidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.products.topProducts
                          .slice(0, 8)
                          .map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div>
                                  <div
                                    className="font-medium truncate max-w-[150px]"
                                    title={product.name}
                                  >
                                    {product.name}
                                  </div>
                                  <div className="text-sm text-admin-text-tertiary">
                                    {product.category}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-admin-success">
                                {formatPrice(product.revenue)}
                              </TableCell>
                              <TableCell>{product.quantity} unidades</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-admin-text-tertiary">
                    No hay productos vendidos en este período
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Alerts */}
            <Card
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              rounded="none"
            >
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                  Alertas de Inventario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-lg sm:text-2xl font-bold text-orange-600">
                      {analytics.products.lowStock}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Bajo Stock
                    </p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-lg sm:text-2xl font-bold text-red-600">
                      {analytics.products.outOfStock}
                    </p>
                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                      Sin Stock
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {analytics.support && (
          <TabsContent className="space-y-4 sm:space-y-6" value="support">
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
                        {analytics.support.total}
                      </p>
                      <p className="text-xs sm:text-sm text-admin-text-tertiary">
                        Total Tickets
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-lg sm:text-2xl font-bold text-orange-600">
                        {analytics.support.open}
                      </p>
                      <p className="text-xs sm:text-sm text-admin-text-tertiary">
                        Abiertos
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-lg sm:text-2xl font-bold text-green-600">
                        {analytics.support.resolved}
                      </p>
                      <p className="text-xs sm:text-sm text-admin-text-tertiary">
                        Resueltos
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-lg sm:text-2xl font-bold text-blue-600">
                        {analytics.support.avgResolutionMinutes != null
                          ? `${analytics.support.avgResolutionMinutes} min`
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
                  {analytics.support.trends.some((t) => t.value > 0) ? (
                    <EnhancedColumnChart
                      color="#C5A059"
                      data={analytics.support.trends}
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
                  {Object.keys(analytics.support.byStatus).length > 0 ? (
                    <EnhancedPieChart
                      data={Object.entries(analytics.support.byStatus).map(
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
                  {Object.keys(analytics.support.byCategory).length > 0 ? (
                    <EnhancedPieChart
                      data={Object.entries(analytics.support.byCategory).map(
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
