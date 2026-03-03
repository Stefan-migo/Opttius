"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  Calendar,
  DollarSign,
  Users,
  Package,
  Target,
  Download,
  RefreshCw,
  AlertTriangle,
  Activity,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  User,
  LineChart as LineChartIcon,
  Receipt,
  Wrench,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Headphones,
} from "lucide-react";
import { EnhancedPieChart } from "@/components/admin/charts/EnhancedPieChart";
import { EnhancedBarChart } from "@/components/admin/charts/EnhancedBarChart";
import { EnhancedAreaChart } from "@/components/admin/charts/EnhancedAreaChart";
import { EnhancedColumnChart } from "@/components/admin/charts/EnhancedColumnChart";
import { EnhancedLineChart } from "@/components/admin/charts/EnhancedLineChart";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { MetricTooltip } from "@/components/admin/MetricTooltip";

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

export default function AnalyticsPage() {
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    isLoading: branchLoading,
  } = useBranch();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30");
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    fetchAnalytics();
  }, [period, currentBranchId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setRefreshing(true);

      const headers: HeadersInit = {
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch(
        `/api/admin/analytics/dashboard?period=${period}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data.data?.analytics ?? data.analytics ?? null);
      setError(null);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  if (loading && !analytics) {
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
            <Card key={i} rounded="none" className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
              {error || "No se pudieron cargar los datos"}
            </p>
            <Button onClick={fetchAnalytics}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1
          className="text-2xl sm:text-3xl font-bold text-epoch-primary"
          data-tour="analytics-header"
        >
          Analíticas y Reportes
        </h1>
        <p className="text-sm text-admin-text-tertiary">
          {isGlobalView
            ? `Métricas y análisis - Todas las sucursales - Últimos ${analytics.period.days} días`
            : `Métricas y análisis - Últimos ${analytics.period.days} días`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
              <SelectItem value="365">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="min-h-[44px] flex-1 sm:flex-initial"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card
          rounded="none"
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide truncate">
                  Ingresos Totales
                </p>
                <MetricTooltip metricKey="totalRevenue" />
              </div>
              <div className="p-1.5 sm:p-2 bg-green-200 dark:bg-green-800 rounded-lg shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-700 dark:text-green-300" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-green-800 dark:text-green-200">
                {formatPrice(analytics.kpis.totalRevenue)}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                {getGrowthIcon(analytics.kpis.revenueGrowth)}
                <span
                  className={`text-xs sm:text-sm font-semibold ${getGrowthColor(analytics.kpis.revenueGrowth)}`}
                >
                  {formatPercentage(analytics.kpis.revenueGrowth)}
                </span>
                <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                  vs período anterior
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          rounded="none"
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide truncate">
                  Trabajos Lab.
                </p>
                <MetricTooltip metricKey="workOrdersTotal" />
              </div>
              <div className="p-1.5 sm:p-2 bg-blue-200 dark:bg-blue-800 rounded-lg shrink-0">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-800 dark:text-blue-200">
                {analytics.workOrders.total}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">
                  {analytics.workOrders.completed} completados
                </p>
                {analytics.workOrders.pending > 0 && (
                  <>
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400">
                      {analytics.workOrders.pending} pendientes
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          rounded="none"
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide truncate">
                  Presupuestos
                </p>
                <MetricTooltip metricKey="quoteConversionRate" />
              </div>
              <div className="p-1.5 sm:p-2 bg-amber-200 dark:bg-amber-800 rounded-lg shrink-0">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700 dark:text-amber-300" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-amber-800 dark:text-amber-200">
                {analytics.quotes.total}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <Target className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
                  {analytics.kpis.quoteConversionRate.toFixed(1)}% conversión
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          rounded="none"
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide truncate">
                  Citas
                </p>
                <MetricTooltip metricKey="appointmentsTotal" />
              </div>
              <div className="p-1.5 sm:p-2 bg-purple-200 dark:bg-purple-800 rounded-lg shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700 dark:text-purple-300" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-purple-800 dark:text-purple-200">
                {analytics.appointments.total}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">
                  {analytics.kpis.appointmentCompletionRate.toFixed(1)}%
                  completadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <Card
          rounded="none"
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-md hover:shadow-lg transition-all duration-300"
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1 sm:mb-2">
                  <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                    Ventas POS
                  </p>
                  <MetricTooltip metricKey="totalOrders" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {formatPrice(analytics.kpis.posRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1 sm:mt-2">
                  <ShoppingCart className="h-3 w-3 text-gray-400 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                    {analytics.kpis.posTransactionCount ??
                      analytics.kpis.totalOrders}{" "}
                    trans.
                  </p>
                </div>
              </div>
              <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          rounded="none"
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-md hover:shadow-lg transition-all duration-300"
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1 sm:mb-2">
                  <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                    Ingresos Trabajos
                  </p>
                  <MetricTooltip metricKey="workOrdersTotal" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {formatPrice(analytics.kpis.workOrdersRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1 sm:mt-2">
                  <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                    {analytics.kpis.avgDeliveryDays} días entrega
                  </p>
                </div>
              </div>
              <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          rounded="none"
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-md hover:shadow-lg transition-all duration-300"
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1 sm:mb-2">
                  <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                    Clientes
                  </p>
                  <MetricTooltip metricKey="totalCustomers" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {analytics.kpis.totalCustomers}
                </p>
                <div className="flex items-center gap-1 mt-1 sm:mt-2">
                  <User className="h-3 w-3 text-green-500 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                    {analytics.kpis.newCustomers} nuevos
                  </p>
                </div>
              </div>
              <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          rounded="none"
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-md hover:shadow-lg transition-all duration-300"
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1 sm:mb-2">
                  <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                    Productos
                  </p>
                  <MetricTooltip metricKey="topProducts" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {analytics.products.total}
                </p>
                <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2 flex-wrap">
                  {analytics.products.lowStock > 0 && (
                    <>
                      <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />
                      <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">
                        {analytics.products.lowStock} bajo stock
                      </p>
                    </>
                  )}
                  {analytics.products.outOfStock > 0 && (
                    <>
                      <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                      <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400">
                        {analytics.products.outOfStock} sin stock
                      </p>
                    </>
                  )}
                  {analytics.products.lowStock === 0 &&
                    analytics.products.outOfStock === 0 && (
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                        Stock saludable
                      </p>
                    )}
                </div>
              </div>
              <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 min-w-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-admin-border-primary/40">
          <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-full flex-nowrap gap-1 sm:gap-2 p-1 h-auto rounded-md bg-muted">
            <TabsTrigger
              value="overview"
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="work-orders"
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
            >
              Trabajos
            </TabsTrigger>
            <TabsTrigger
              value="quotes"
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
            >
              Presupuestos
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
            >
              Ventas
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
            >
              Productos
            </TabsTrigger>
            {analytics.support && (
              <TabsTrigger
                value="support"
                className="shrink-0 text-[10px] sm:text-sm px-2 sm:px-4 py-2 min-h-[44px]"
              >
                Incidentes
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Revenue Trend */}
            <Card
              rounded="none"
              className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
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
                      variant={
                        salesChartType === "column" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSalesChartType("column")}
                      className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Barras
                    </Button>
                    <Button
                      variant={
                        salesChartType === "line" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSalesChartType("line")}
                      className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
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
                    data={analytics.trends.sales}
                    title="Ingresos por Período"
                    color="#C5A059"
                    formatValue={formatPrice}
                    height={250}
                  />
                ) : (
                  <EnhancedLineChart
                    data={analytics.trends.sales}
                    title="Evolución de Ingresos"
                    color="#C5A059"
                    formatValue={formatPrice}
                    showGrid={true}
                    height={250}
                  />
                )}
              </CardContent>
            </Card>

            {/* Work Orders Trend */}
            <Card
              rounded="none"
              className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
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
                      variant={
                        workOrdersChartType === "column" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setWorkOrdersChartType("column")}
                      className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Barras
                    </Button>
                    <Button
                      variant={
                        workOrdersChartType === "line" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setWorkOrdersChartType("line")}
                      className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
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
                    data={analytics.trends.workOrders}
                    title="Trabajos por Período"
                    color="#1A2B23"
                    formatValue={(val) => Math.round(val).toString()}
                    height={250}
                  />
                ) : (
                  <EnhancedLineChart
                    data={analytics.trends.workOrders}
                    title="Evolución de Trabajos"
                    color="#1A2B23"
                    formatValue={(val) => Math.round(val).toString()}
                    showGrid={true}
                    height={250}
                  />
                )}
              </CardContent>
            </Card>

            {/* Work Orders Status Distribution */}
            <Card
              rounded="none"
              className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
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
                    title="Distribución por Estado"
                    showLegend={true}
                    showPercentage={true}
                    formatValue={(val) => Math.round(val).toString()}
                    height={250}
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
              rounded="none"
              className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
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
                    title="Distribución por Estado"
                    showLegend={true}
                    showPercentage={true}
                    formatValue={(val) => Math.round(val).toString()}
                    height={250}
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

        <TabsContent value="work-orders" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Work Orders Metrics */}
            <Card
              rounded="none"
              className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
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
              rounded="none"
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
            >
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <LineChartIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                  Tendencia de Trabajos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <EnhancedAreaChart
                  data={analytics.trends.workOrders}
                  title="Trabajos Creados por Día"
                  color="#1A2B23"
                  showGrid={true}
                  formatValue={(val) => Math.round(val).toString()}
                  height={250}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Quotes Metrics */}
            <Card
              rounded="none"
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
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
              rounded="none"
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
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
                      variant={
                        quotesChartType === "column" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setQuotesChartType("column")}
                      className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Barras
                    </Button>
                    <Button
                      variant={
                        quotesChartType === "line" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setQuotesChartType("line")}
                      className="h-8 sm:h-7 px-2 sm:px-3 text-xs min-h-[44px] sm:min-h-0"
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
                    data={analytics.trends.quotes}
                    title="Presupuestos por Período"
                    color="#C5A059"
                    formatValue={(val) => Math.round(val).toString()}
                    height={250}
                  />
                ) : (
                  <EnhancedLineChart
                    data={analytics.trends.quotes}
                    title="Presupuestos Creados por Día"
                    color="#C5A059"
                    showGrid={true}
                    formatValue={(val) => Math.round(val).toString()}
                    height={250}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Revenue by Category */}
            <Card
              rounded="none"
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
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
                    data={analytics.products.categoryRevenue.map((cat) => ({
                      label: cat.category,
                      value: cat.revenue,
                    }))}
                    title="Categorías Más Rentables"
                    color="#C5A059"
                    horizontal={true}
                    formatValue={formatPrice}
                    height={Math.max(
                      220,
                      Math.min(
                        350,
                        analytics.products.categoryRevenue.length * 36,
                      ),
                    )}
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
              rounded="none"
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
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
                    title="Distribución de Pagos"
                    showLegend={true}
                    showPercentage={true}
                    formatValue={formatPrice}
                    height={280}
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
              rounded="none"
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
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

        <TabsContent value="products" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Products */}
            <Card
              rounded="none"
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
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
                    data={analytics.products.topProducts
                      .slice(0, 8)
                      .map((prod) => ({
                        label: prod.name,
                        value: prod.revenue,
                      }))}
                    title="Por Ingresos"
                    color="#C5A059"
                    horizontal={true}
                    formatValue={formatPrice}
                    height={Math.min(
                      320,
                      Math.max(
                        220,
                        analytics.products.topProducts.slice(0, 8).length * 40,
                      ),
                    )}
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
              rounded="none"
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
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
              rounded="none"
              className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
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
          <TabsContent value="support" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Support KPIs */}
              <Card
                rounded="none"
                className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
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
                rounded="none"
                className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
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
                      data={analytics.support.trends}
                      title="Tickets por Día"
                      color="#C5A059"
                      formatValue={(val) => Math.round(val).toString()}
                      height={250}
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
                rounded="none"
                className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
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
                      title="Distribución por Estado"
                      showLegend={true}
                      showPercentage={true}
                      formatValue={(val) => Math.round(val).toString()}
                      height={250}
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
                rounded="none"
                className="bg-admin-bg-tertiary border border-admin-border-primary shadow-soft hover:shadow-medium transition-all duration-300"
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
                      title="Distribución por Categoría"
                      showLegend={true}
                      showPercentage={true}
                      formatValue={(val) => Math.round(val).toString()}
                      height={250}
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
