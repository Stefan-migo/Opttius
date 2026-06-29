"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Receipt,
  ShoppingCart,
  Target,
  User,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";

import { MetricTooltip } from "@/components/admin/MetricTooltip";
import { Card, CardContent } from "@/components/ui/card";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getGrowthIcon(growth: number) {
  if (growth > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  if (growth < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Activity className="h-4 w-4 text-gray-500" />;
}

function getGrowthColor(growth: number) {
  if (growth > 0) return "text-green-600";
  if (growth < 0) return "text-red-600";
  return "text-gray-600";
}

interface KPIProps {
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
}

export function AnalyticsKPICards({
  kpis,
  workOrders,
  quotes,
  appointments,
  products,
}: KPIProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-lg hover:shadow-xl transition-all duration-300"
          rounded="none"
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
                {formatPrice(kpis.totalRevenue)}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                {getGrowthIcon(kpis.revenueGrowth)}
                <span
                  className={`text-xs sm:text-sm font-semibold ${getGrowthColor(kpis.revenueGrowth)}`}
                >
                  {kpis.revenueGrowth >= 0 ? "+" : ""}
                  {kpis.revenueGrowth.toFixed(1)}%
                </span>
                <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                  vs período anterior
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-lg hover:shadow-xl transition-all duration-300"
          rounded="none"
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
                {workOrders.total}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">
                  {workOrders.completed} completados
                </p>
                {workOrders.pending > 0 && (
                  <>
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400">
                      {workOrders.pending} pendientes
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-lg hover:shadow-xl transition-all duration-300"
          rounded="none"
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
                {quotes.total}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <Target className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
                  {kpis.quoteConversionRate.toFixed(1)}% conversión
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-lg hover:shadow-xl transition-all duration-300"
          rounded="none"
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
                {appointments.total}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">
                  {kpis.appointmentCompletionRate.toFixed(1)}% completadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <Card
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-md hover:shadow-lg transition-all duration-300"
          rounded="none"
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
                  {formatPrice(kpis.posRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1 sm:mt-2">
                  <ShoppingCart className="h-3 w-3 text-gray-400 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                    {kpis.posTransactionCount ?? kpis.totalOrders} trans.
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
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-md hover:shadow-lg transition-all duration-300"
          rounded="none"
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
                  {formatPrice(kpis.workOrdersRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1 sm:mt-2">
                  <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                    {kpis.avgDeliveryDays} días entrega
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
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-md hover:shadow-lg transition-all duration-300"
          rounded="none"
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
                  {kpis.totalCustomers}
                </p>
                <div className="flex items-center gap-1 mt-1 sm:mt-2">
                  <User className="h-3 w-3 text-green-500 shrink-0" />
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                    {kpis.newCustomers} nuevos
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
          className="bg-admin-bg-tertiary border border-admin-border-primary shadow-md hover:shadow-lg transition-all duration-300"
          rounded="none"
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
                  {products.total}
                </p>
                <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2 flex-wrap">
                  {products.lowStock > 0 && (
                    <>
                      <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />
                      <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">
                        {products.lowStock} bajo stock
                      </p>
                    </>
                  )}
                  {products.outOfStock > 0 && (
                    <>
                      <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                      <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400">
                        {products.outOfStock} sin stock
                      </p>
                    </>
                  )}
                  {products.lowStock === 0 && products.outOfStock === 0 && (
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
    </>
  );
}
