"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  Eye,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Activity,
  Award,
  ChevronRight,
  Target,
  Zap,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import businessConfig from "@/config/business";
import { DashboardSearch } from "@/components/admin/DashboardSearch";
import { useBranch } from "@/hooks/useBranch";
import { formatCurrency, formatDateTime } from "@/lib/utils";
const CreateAppointmentForm = dynamic(
  () => import("@/components/admin/CreateAppointmentForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-accent-primary"></div>
      </div>
    ),
    ssr: false,
  },
);

// Colors from the brand palette
const COLORS = {
  primary: "#AE0000", // Opttius Red
  secondary: "#B17A47", // Bronze
  accent: "#D4A574", // Gold
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  COLORS.success,
  COLORS.warning,
];

interface DashboardData {
  kpis: {
    products: {
      total: number;
      lowStock: number;
      outOfStock: number;
    };
    orders: {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    revenue: {
      current: number;
      previous: number;
      change: number;
      currency: string;
    };
    customers: {
      total: number;
      new: number;
      returning: number;
    };
    appointments?: {
      today: number;
      scheduled: number;
      confirmed: number;
      pending: number;
    };
    workOrders?: {
      new: number;
      inProgress: number;
      completed: number;
      pending: number;
      total: number;
    };
    quotes?: {
      total: number;
      pending: number;
      converted: number;
    };
  };
  todayAppointments: any[];
  lowStockProducts: any[];
  charts: {
    revenueTrend: any[];
    ordersStatus: any;
    topProducts: any[];
  };
}

const defaultDashboardData: DashboardData = {
  kpis: {
    revenue: {
      current: 0,
      previous: 0,
      change: 0,
      currency: "CLP",
    },
    orders: {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    },
    products: {
      total: 0,
      lowStock: 0,
      outOfStock: 0,
    },
    customers: {
      total: 0,
      new: 0,
      returning: 0,
    },
    appointments: {
      today: 0,
      scheduled: 0,
      confirmed: 0,
      pending: 0,
    },
    workOrders: {
      new: 0,
      total: 0,
      inProgress: 0,
      pending: 0,
      completed: 0,
    },
    quotes: {
      total: 0,
      pending: 0,
      converted: 0,
    },
  },
  todayAppointments: [],
  lowStockProducts: [],
  charts: {
    revenueTrend: [],
    ordersStatus: {},
    topProducts: [],
  },
};

export default function AdminDashboard() {
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(defaultDashboardData);
  const [error, setError] = useState<string | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Add branch header if branch is selected, or 'global' if in global view
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (currentBranchId) {
        headers["x-branch-id"] = currentBranchId;
      } else if (isGlobalView && isSuperAdmin) {
        headers["x-branch-id"] = "global";
      }

      const response = await fetch("/api/admin/dashboard", { headers });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(
          result.error?.message || "Failed to fetch dashboard data",
        );
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Error al cargar los datos del dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentBranchId, isGlobalView]);

  const getAppointmentStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge
            variant="outline"
            className="bg-admin-bg-tertiary/50 text-admin-info border-admin-info/30 font-bold text-[10px] uppercase tracking-wider"
          >
            <Clock className="h-3 w-3 mr-1" />
            Programada
          </Badge>
        );
      case "confirmed":
        return (
          <Badge
            variant="outline"
            className="bg-admin-bg-tertiary/50 text-admin-success border-admin-success/30 font-bold text-[10px] uppercase tracking-wider"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmada
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-admin-bg-tertiary/50 text-admin-accent-secondary border-admin-accent-secondary/30 font-bold text-[10px] uppercase tracking-wider"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Completada
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-admin-error/10 text-admin-error border-admin-error/30 font-bold text-[10px] uppercase tracking-wider"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        );
      case "no_show":
        return (
          <Badge
            variant="outline"
            className="bg-admin-bg-tertiary/50 text-admin-text-tertiary border-admin-border-secondary font-bold text-[10px] uppercase tracking-wider"
          >
            <XCircle className="h-3 w-3 mr-1" />
            No asistó
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="text-[10px] font-bold uppercase tracking-wider"
          >
            {status}
          </Badge>
        );
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-8 bg-admin-bg-tertiary/50 rounded-xl w-64"></div>
          <div className="h-4 bg-admin-bg-tertiary/30 rounded-lg w-96"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              className="border-none bg-admin-bg-tertiary/20 h-32 rounded-2xl shadow-none"
            ></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[500px] animate-in fade-in duration-500">
        <div className="text-center max-w-md p-8 bg-admin-bg-secondary rounded-3xl border border-admin-error/20 shadow-xl shadow-admin-error/5">
          <div className="h-16 w-16 bg-admin-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-admin-error" />
          </div>
          <h2 className="text-xl font-bold text-admin-text-primary mb-2">
            Disculpe las molestias
          </h2>
          <p className="text-admin-text-tertiary mb-6 leading-relaxed">
            {error ||
              "Ocurrió un error inesperado al sincronizar con la central."}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full h-11 bg-admin-accent-primary hover:bg-admin-accent-secondary text-white font-bold rounded-xl transition-all shadow-lg shadow-admin-accent-primary/20"
          >
            Sincronizar Panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
        <div className="space-y-1">
          <h1
            className="text-3xl font-bold tracking-tight text-admin-text-primary font-malisha"
            data-tour="dashboard-header"
          >
            Resumen Ejecutivo
          </h1>
          <p className="text-sm font-medium text-admin-text-tertiary uppercase tracking-widest">
            Panel de Gestión Estratégica
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin/pos">
            <Button className="h-11 px-6 bg-admin-accent-primary hover:bg-admin-accent-secondary text-white font-bold rounded-xl transition-all shadow-lg shadow-admin-accent-primary/10 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Venta Rápida</span>
            </Button>
          </Link>
          <Link href="/admin/appointments">
            <Button
              variant="secondary"
              className="h-11 px-6 bg-admin-bg-tertiary hover:bg-admin-border-primary text-admin-text-primary font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Agenda</span>
            </Button>
          </Link>
          <Link href="/admin/work-orders">
            <Button
              variant="secondary"
              className="h-11 px-6 bg-admin-bg-tertiary hover:bg-admin-border-primary text-admin-text-primary font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              <span>Taller</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stock Alert Banner - Compact */}
      {data?.lowStockProducts?.length > 0 && (
        <Card className="border-none bg-admin-bg-tertiary shadow-soft overflow-hidden animate-in slide-in-from-top duration-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-admin-error/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-admin-error" />
                </div>
                <div>
                  <p className="font-bold text-admin-text-primary text-sm">
                    {data?.lowStockProducts?.length} producto
                    {data?.lowStockProducts?.length !== 1 ? "s" : ""} con stock
                    crítico
                  </p>
                  <p className="text-xs text-admin-text-tertiary">
                    {data?.lowStockProducts
                      ?.slice(0, 2)
                      .map((p) => p.name)
                      .join(", ")}
                    {data?.lowStockProducts?.length > 2 &&
                      ` y ${data?.lowStockProducts?.length - 2} más`}
                  </p>
                </div>
              </div>
              <Link href="/admin/products?filter=low_stock">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 font-bold bg-white text-admin-error border-admin-error/20 hover:bg-admin-error hover:text-white rounded-lg transition-all"
                >
                  Gestionar Inventario
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {(() => {
        const currentBranch = branches?.find((b) => b.id === currentBranchId);
        const statsLabel = isGlobalView
          ? "Todas las sucursales"
          : currentBranch
            ? `Sucursal: ${currentBranch.name}`
            : "Sucursal seleccionada";

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Revenue Card */}
            <Card className="border-none bg-admin-bg-tertiary shadow-soft hover:shadow-premium-lg transition-all duration-300 group overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 bg-admin-success/10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                    <DollarSign className="h-6 w-6 text-admin-success" />
                  </div>
                  <div
                    className={cn(
                      "flex items-center text-[11px] font-bold px-2 py-1 rounded-lg gap-1",
                      data.kpis.revenue.change >= 0
                        ? "bg-admin-success/10 text-admin-success"
                        : "bg-admin-error/10 text-admin-error",
                    )}
                  >
                    {data.kpis.revenue.change >= 0 ? (
                      <>
                        <ArrowUpRight className="h-3 w-3" />
                        <span>+{data.kpis.revenue.change.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-3 w-3" />
                        <span>{data.kpis.revenue.change.toFixed(1)}%</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                    Rendimiento Mensual
                  </p>
                  <p className="text-2xl font-bold text-admin-text-primary tracking-tight">
                    {formatCurrency(data.kpis.revenue.current)}
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-admin-border-primary/30">
                    <Activity className="h-3 w-3 text-admin-text-tertiary" />
                    <span className="text-[10px] font-bold text-admin-text-tertiary uppercase">
                      {statsLabel}
                    </span>
                  </div>
                </div>

                <div className="absolute top-0 right-0 p-4 opacity-[0.2] group-hover:opacity-[0.5] transition-opacity">
                  <DollarSign size={80} />
                </div>
              </CardContent>
            </Card>

            {/* Appointments Card */}
            <Card className="border-none bg-admin-bg-tertiary shadow-soft hover:shadow-premium-lg transition-all duration-300 group overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 bg-admin-accent-primary/10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                    <Calendar className="h-6 w-6 text-admin-accent-primary" />
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-admin-accent-primary/5 text-admin-accent-primary border-admin-accent-primary/20 text-[10px] font-bold"
                  >
                    HOY
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                    Agenda del Día
                  </p>
                  <p className="text-2xl font-bold text-admin-text-primary tracking-tight">
                    {data.kpis.appointments?.today || 0}{" "}
                    <span className="text-sm font-medium text-admin-text-tertiary tracking-normal">
                      Citas
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-admin-border-primary/30">
                    <Clock className="h-3 w-3 text-admin-text-tertiary" />
                    <span className="text-[10px] font-bold text-admin-text-tertiary uppercase">
                      {data.kpis.appointments?.confirmed || 0} Confirmadas
                    </span>
                  </div>
                </div>

                <div className="absolute top-0 right-0 p-4 opacity-[0.2] group-hover:opacity-[0.5] transition-opacity">
                  <Calendar size={80} />
                </div>
              </CardContent>
            </Card>

            {/* Products Card */}
            <Card className="border-none bg-admin-bg-tertiary shadow-soft hover:shadow-premium-lg transition-all duration-300 group overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 bg-admin-accent-secondary/10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                    <Package className="h-6 w-6 text-admin-accent-secondary" />
                  </div>
                  {data.kpis.products.lowStock > 0 && (
                    <div className="h-2 w-2 bg-admin-error rounded-full animate-pulse shadow-[0_0_8px_var(--admin-error)]" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                    Inventario Activo
                  </p>
                  <p className="text-2xl font-bold text-admin-text-primary tracking-tight">
                    {data.kpis.products.total}{" "}
                    <span className="text-sm font-medium text-admin-text-tertiary tracking-normal">
                      SKUs
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-admin-border-primary/30">
                    <AlertTriangle
                      className={cn(
                        "h-3 w-3",
                        data.kpis.products.lowStock > 0
                          ? "text-admin-error"
                          : "text-admin-success",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase",
                        data.kpis.products.lowStock > 0
                          ? "text-admin-error"
                          : "text-admin-success",
                      )}
                    >
                      {data.kpis.products.lowStock > 0
                        ? `${data.kpis.products.lowStock} Alertas`
                        : "Stock Saludable"}
                    </span>
                  </div>
                </div>

                <div className="absolute top-0 right-0 p-4 opacity-[0.2] group-hover:opacity-[0.5] transition-opacity">
                  <Package size={80} />
                </div>
              </CardContent>
            </Card>

            {/* Customers Card */}
            <Card className="border-none bg-admin-bg-tertiary shadow-soft hover:shadow-premium-lg transition-all duration-300 group overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 bg-admin-info/10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                    <Users className="h-6 w-6 text-admin-info" />
                  </div>
                  <div className="bg-admin-info/10 text-admin-info p-1 rounded-lg">
                    <Plus className="h-3 w-3" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                    Cartera de Clientes
                  </p>
                  <p className="text-2xl font-bold text-admin-text-primary tracking-tight">
                    {data.kpis.customers.total}
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-admin-border-primary/30">
                    <TrendingUp className="h-3 w-3 text-admin-success" />
                    <span className="text-[10px] font-bold text-admin-success uppercase">
                      +{data.kpis.customers.new} Este Mes
                    </span>
                  </div>
                </div>

                <div className="absolute top-0 right-0 p-4 opacity-[0.2] group-hover:opacity-[0.5] transition-opacity">
                  <Users size={80} />
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="border-none bg-admin-bg-tertiary shadow-soft overflow-hidden group">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 bg-admin-success/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-admin-success" />
              </div>
              <CardTitle className="text-lg font-bold text-admin-text-primary tracking-tight">
                Evolución de Ingresos
              </CardTitle>
            </div>
            <p className="text-xs font-bold text-admin-text-tertiary uppercase tracking-wider">
              Análisis de los últimos 7 días
            </p>
          </CardHeader>
          <CardContent>
            {data?.charts?.revenueTrend?.length > 0 ? (
              <div className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    id="dashboard-revenue-chart"
                    data={data.charts.revenueTrend}
                  >
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={COLORS.success}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={COLORS.success}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(0,0,0,0.05)"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 10,
                        fontWeight: 600,
                        fill: "var(--admin-text-tertiary)",
                      }}
                      tickFormatter={(date) =>
                        new Date(date).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                        })
                      }
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 10,
                        fontWeight: 600,
                        fill: "var(--admin-text-tertiary)",
                      }}
                      tickFormatter={(value) =>
                        `$${value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#1a1a1a",
                      }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Ingresos",
                      ]}
                      labelFormatter={(date) =>
                        new Date(date).toLocaleDateString("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.success}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-2">
                <BarChart className="h-10 w-10 text-admin-text-tertiary opacity-20" />
                <p className="text-xs font-bold text-admin-text-tertiary uppercase">
                  Datos insuficientes para análisis
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Orders Status Distribution */}
        <Card className="border-none bg-admin-bg-tertiary shadow-soft overflow-hidden group">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 bg-admin-accent-secondary/10 rounded-lg flex items-center justify-center">
                <Target className="h-4 w-4 text-admin-accent-secondary" />
              </div>
              <CardTitle className="text-lg font-bold text-admin-text-primary tracking-tight">
                Estado Operativo
              </CardTitle>
            </div>
            <p className="text-xs font-bold text-admin-text-tertiary uppercase tracking-wider">
              Distribución de trabajos en taller
            </p>
          </CardHeader>
          <CardContent>
            {data.kpis.workOrders && data.kpis.workOrders.total > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart id="dashboard-ops-chart">
                    <Pie
                      data={[
                        {
                          name: "En Progreso",
                          value: data.kpis.workOrders.inProgress,
                        },
                        {
                          name: "Pendientes",
                          value: data.kpis.workOrders.pending || 0,
                        },
                        {
                          name: "Completados",
                          value: data.kpis.workOrders.completed,
                        },
                      ].filter((item) => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      animationBegin={200}
                    >
                      {[
                        {
                          name: "En Progreso",
                          value: data.kpis.workOrders.inProgress,
                        },
                        {
                          name: "Pendientes",
                          value: data.kpis.workOrders.pending || 0,
                        },
                        {
                          name: "Completados",
                          value: data.kpis.workOrders.completed,
                        },
                      ]
                        .filter((item) => item.value > 0)
                        .map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={0}
                          />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-[11px] font-bold text-admin-text-secondary uppercase">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-2">
                <PieChart className="h-10 w-10 text-admin-text-tertiary opacity-20" />
                <p className="text-xs font-bold text-admin-text-tertiary uppercase">
                  Sin actividad operativa registrada
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products Chart */}
      {data?.charts?.topProducts?.length > 0 && (
        <Card className="border-none bg-admin-bg-tertiary shadow-soft overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 bg-admin-accent-primary/10 rounded-lg flex items-center justify-center">
                <Award className="h-4 w-4 text-admin-accent-primary" />
              </div>
              <CardTitle className="text-lg font-bold text-admin-text-primary tracking-tight">
                Best Sellers
              </CardTitle>
            </div>
            <p className="text-xs font-bold text-admin-text-tertiary uppercase tracking-wider">
              Top 5 productos con mayor rentabilidad
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.charts.topProducts}
                  layout="vertical"
                  margin={{ left: 40, right: 40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="rgba(0,0,0,0.05)"
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fontWeight: 600,
                      fill: "var(--admin-text-tertiary)",
                    }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={140}
                    tick={{
                      fontSize: 10,
                      fontWeight: 700,
                      fill: "var(--admin-text-primary)",
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.02)" }}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "revenue")
                        return [formatCurrency(value), "Ingresos"];
                      return [value, "Unidades"];
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Ingresos"
                    fill={COLORS.primary}
                    radius={[0, 8, 8, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Appointments & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Today's Appointments - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card className="border-none bg-admin-bg-tertiary shadow-soft hover:shadow-premium-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-admin-accent-primary/10 rounded-xl flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-admin-accent-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-admin-text-primary tracking-tight">
                      Citas de Hoy
                    </CardTitle>
                    <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Agenda Diaria
                    </p>
                  </div>
                </div>
                <Link href="/admin/appointments">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-4 font-bold text-admin-accent-primary hover:bg-admin-accent-primary/5 rounded-lg group transition-all"
                  >
                    Gestionar Agenda
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.todayAppointments?.length > 0 ? (
                  data.todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="group flex items-center p-4 rounded-xl bg-admin-bg-tertiary/30 border border-admin-border-primary/30 hover:bg-admin-bg-tertiary/60 hover:border-admin-accent-primary/20 transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-admin-accent-primary opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex-shrink-0 mr-4 text-center min-w-[60px]">
                        <p className="text-sm font-black text-admin-text-primary leading-none">
                          {formatTime(appointment.appointment_time)}
                        </p>
                        <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-tighter mt-1">
                          {appointment.duration_minutes} MIN
                        </p>
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-admin-text-primary truncate">
                            {appointment.customer_name}
                          </p>
                          {getAppointmentStatusBadge(appointment.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-admin-text-tertiary uppercase tracking-tight">
                            {appointment.appointment_type?.replace(/_/g, " ") ||
                              "Consulta General"}
                          </span>
                          {appointment.notes && (
                            <div className="h-1 w-1 rounded-full bg-admin-border-primary" />
                          )}
                          <span className="text-[11px] text-admin-text-tertiary italic truncate">
                            {appointment.notes}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg text-admin-text-tertiary hover:text-admin-accent-primary"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 bg-admin-bg-tertiary/50 rounded-full flex items-center justify-center mb-4">
                      <Calendar className="h-8 w-8 text-admin-text-tertiary/30" />
                    </div>
                    <p className="text-sm font-bold text-admin-text-secondary uppercase tracking-wider">
                      Sin citas programadas
                    </p>
                    <p className="text-xs text-admin-text-tertiary mt-1">
                      No hay registros para este bloque de tiempo
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-none bg-admin-bg-tertiary shadow-soft hover:shadow-premium-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-admin-info/10 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5 text-admin-info" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-admin-text-primary tracking-tight">
                  Acciones Rápidas
                </CardTitle>
                <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Accesos Directos
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stock Alerts Section */}
            {data?.lowStockProducts?.length > 0 && (
              <div className="p-4 bg-admin-error/5 border border-admin-error/10 rounded-2xl animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 bg-admin-error/10 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-admin-error" />
                  </div>
                  <p className="text-sm font-bold text-admin-error uppercase tracking-tight">
                    Alertas Críticas
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  {data?.lowStockProducts?.slice(0, 3).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-admin-error/5"
                    >
                      <span className="text-xs font-medium text-admin-text-secondary truncate pr-2">
                        {product.name}
                      </span>
                      <span className="text-[10px] font-black text-admin-error bg-admin-error/10 px-1.5 py-0.5 rounded">
                        {product.currentStock}
                      </span>
                    </div>
                  ))}
                  {data?.lowStockProducts?.length > 3 && (
                    <p className="text-[10px] font-bold text-admin-error/60 text-center uppercase">
                      +{data?.lowStockProducts?.length - 3} productos
                      adicionales
                    </p>
                  )}
                </div>

                <Link href="/admin/products?filter=low_stock">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-9 text-xs font-bold text-admin-error hover:bg-admin-error hover:text-white transition-all rounded-lg"
                  >
                    Resolver Stock
                    <ChevronRight className="h-3 w-3 ml-2" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Dynamic Search Actions */}
            <div className="space-y-3">
              <DashboardSearch
                type="customer"
                placeholder="Buscar Cliente..."
              />
              <DashboardSearch
                type="product"
                placeholder="Buscar Producto..."
              />
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  label: "Agendar Cita",
                  icon: CalendarDays,
                  action: () => setIsAppointmentModalOpen(true),
                  color: "text-admin-accent-primary",
                },
                {
                  label: "Nuevo Presupuesto",
                  icon: FileText,
                  href: "/admin/quotes",
                  color: "text-admin-info",
                },
                {
                  label: "Punto de Venta",
                  icon: ShoppingCart,
                  href: "/admin/pos",
                  color: "text-admin-success",
                },
                {
                  label: "Catálogo",
                  icon: Package,
                  href: "/admin/products",
                  color: "text-admin-accent-secondary",
                },
              ].map((action, idx) => {
                const ButtonContent = (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 px-4 border-admin-border-primary/50 text-admin-text-secondary font-bold text-sm bg-admin-bg-tertiary/20 hover:bg-white hover:border-admin-accent-primary hover:text-admin-accent-primary hover:shadow-premium-sm transition-all duration-300 rounded-xl group"
                    onClick={action.action}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg bg-admin-bg-tertiary flex items-center justify-center mr-3 group-hover:bg-admin-accent-primary/10 transition-colors",
                      )}
                    >
                      <action.icon className={cn("h-4 w-4", action.color)} />
                    </div>
                    <span className="flex-1 text-left">{action.label}</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                  </Button>
                );

                return action.href ? (
                  <Link key={idx} href={action.href} className="w-full">
                    {ButtonContent}
                  </Link>
                ) : (
                  <div key={idx} className="w-full">
                    {ButtonContent}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Creation Modal */}
      <Dialog
        open={isAppointmentModalOpen}
        onOpenChange={setIsAppointmentModalOpen}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-premium-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-admin-text-primary tracking-tight">
              Nueva Cita
            </DialogTitle>
            <DialogDescription className="text-admin-text-tertiary font-bold uppercase text-[10px] tracking-widest">
              Completa los datos para agendar una nueva atención
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <CreateAppointmentForm
              onSuccess={() => {
                setIsAppointmentModalOpen(false);
                fetchDashboardData();
                toast.success("Cita agendada exitosamente");
              }}
              onCancel={() => setIsAppointmentModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
