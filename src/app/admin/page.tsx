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
  CalendarPlus,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

// Colors from the brand palette: Opttius "Epoch" Edition
const COLORS = {
  primary: "#1A2B23", // Forest Green (Epoch Primary)
  secondary: "#121212", // Charcoal (Epoch Surface)
  accent: "#C5A059", // Vintage Gold (Epoch Accent)
  cream: "#F9F7F2", // Elegant Cream (Epoch Background)
  success: "#1A2B23", // Main green
  warning: "#C5A059", // Main gold
  danger: "#ae0000",
  info: "#415a77",
};

// Chart colors optimized for theme synchronization
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
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
  const [revenuePeriod, setRevenuePeriod] = useState<string>("7");

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

      const params = new URLSearchParams({ period: revenuePeriod });
      const response = await fetch(
        `/api/admin/dashboard?${params.toString()}`,
        { headers },
      );

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
  }, [currentBranchId, isGlobalView, revenuePeriod]);

  const getAppointmentStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge
            variant="outline"
            className="bg-transparent text-admin-info border-admin-info/30 font-bold text-[10px] uppercase tracking-wider rounded-none"
          >
            <Clock className="h-3 w-3 mr-1" />
            Programada
          </Badge>
        );
      case "confirmed":
        return (
          <Badge
            variant="outline"
            className="bg-transparent text-admin-success border-admin-success/30 font-bold text-[10px] uppercase tracking-wider rounded-none"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmada
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-admin-accent-primary/10 text-admin-accent-primary border-admin-accent-primary/20 font-bold text-[10px] uppercase tracking-wider rounded-none"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Completada
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-admin-error/10 text-admin-error border-admin-error/30 font-bold text-[10px] uppercase tracking-wider rounded-none"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        );
      case "no_show":
        return (
          <Badge
            variant="outline"
            className="bg-transparent text-admin-text-tertiary border-admin-border-secondary font-bold text-[10px] uppercase tracking-wider rounded-none"
          >
            <XCircle className="h-3 w-3 mr-1" />
            No asistó
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="text-[10px] font-bold uppercase tracking-wider rounded-none"
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
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-admin-border-primary/20">
          <div className="space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96 opacity-50" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Banner Skeleton */}
        <Skeleton className="h-20 w-full" />

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-admin-border-primary/20 bg-admin-border-primary/5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-8 border-r border-admin-border-primary/10 bg-admin-bg-tertiary/20"
            >
              <div className="flex justify-between mb-6">
                <Skeleton className="h-12 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32" />
                <div className="pt-4 border-t border-admin-border-primary/5">
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-none shadow-none">
            <CardHeader className="pb-2 border-b border-admin-border-primary/10">
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="p-8">
              <Skeleton className="h-[320px] w-full" />
            </CardContent>
          </Card>
          <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-none shadow-none">
            <CardHeader className="pb-2 border-b border-admin-border-primary/10">
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="p-8">
              <Skeleton className="h-[320px] w-full" />
            </CardContent>
          </Card>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-admin-border-primary/20">
        <div className="space-y-1">
          <h1
            className="text-4xl font-display font-bold tracking-tight text-admin-text-primary uppercase"
            data-tour="dashboard-header"
          >
            Resumen Ejecutivo
          </h1>
          <p className="text-xs font-serif italic text-admin-text-tertiary tracking-[0.2em] uppercase">
            Santuario de la Gestión Óptica • Flujo de Operaciones
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/pos">
            <Button className="h-10 px-6 bg-epoch-primary hover:bg-epoch-surface text-white font-bold rounded-none transition-all shadow-xl flex items-center gap-2 border border-admin-border-primary/10">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-display tracking-widest text-xs">
                VENTA RÁPIDA
              </span>
            </Button>
          </Link>
          <Link href="/admin/appointments">
            <Button
              variant="outline"
              className="h-10 px-6 bg-admin-bg-tertiary/50 border-admin-border-primary/30 text-admin-text-primary font-bold rounded-none transition-all flex items-center gap-2 hover:bg-admin-bg-secondary"
            >
              <Calendar className="h-4 w-4" />
              <span className="font-display tracking-widest text-xs">
                AGENDA
              </span>
            </Button>
          </Link>
          <Link href="/admin/work-orders">
            <Button
              variant="outline"
              className="h-10 px-6 bg-admin-bg-tertiary/50 border-admin-border-primary/30 text-admin-text-primary font-bold rounded-none transition-all flex items-center gap-2 hover:bg-admin-bg-secondary relative"
            >
              <div className="relative">
                <Package className="h-4 w-4" />
                {(data?.kpis?.workOrders?.pending ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-admin-accent-secondary text-[#1A2B23] text-[8px] font-black flex items-center justify-center border border-admin-bg-secondary leading-none shadow-sm">
                    {data?.kpis?.workOrders?.pending ?? 0}
                  </span>
                )}
              </div>
              <span className="font-display tracking-widest text-xs">
                TALLER
              </span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stock Alert Banner - Compact */}
      {data?.lowStockProducts?.length > 0 && (
        <Card className="border border-admin-error/20 bg-admin-error/[0.02] rounded-none shadow-none overflow-hidden animate-in slide-in-from-top duration-500 relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <AlertTriangle size={60} />
          </div>
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-admin-error/10 border border-admin-error/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-admin-error" />
                </div>
                <div>
                  <p className="font-display font-medium text-admin-text-primary text-sm tracking-wide uppercase">
                    {data?.lowStockProducts?.length} Alerta
                    {data?.lowStockProducts?.length !== 1 ? "s" : ""} de
                    Inventario
                  </p>
                  <p className="text-[11px] font-serif italic text-admin-text-tertiary mt-0.5">
                    Artículos críticos:{" "}
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
                  className="h-9 font-display tracking-widest text-[10px] bg-admin-bg-tertiary/50 text-admin-error border-admin-error/30 hover:bg-admin-error hover:text-white rounded-none transition-all"
                >
                  GESTIONAR ARCHIVO
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-0 border border-admin-border-primary/20 bg-admin-border-primary/5">
            {/* Revenue Card */}
            <Card className="border-none bg-admin-bg-tertiary/50 rounded-none shadow-none hover:bg-admin-bg-secondary transition-all duration-500 group overflow-hidden border-r border-admin-border-primary/10">
              <CardContent className="p-8 relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <DollarSign className="h-6 w-6 text-epoch-primary" />
                  </div>
                  <div
                    className={cn(
                      "flex items-center text-[10px] font-display font-bold px-2 py-1 gap-1",
                      data.kpis.revenue.change >= 0
                        ? "text-epoch-primary"
                        : "text-admin-error",
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
                  <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em]">
                    Rendimiento Mensual
                  </p>
                  <p className="text-3xl font-display font-bold text-admin-text-primary tracking-tight">
                    {formatCurrency(data.kpis.revenue.current)}
                  </p>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-admin-border-primary/5">
                    <Activity className="h-3 w-3 text-admin-text-tertiary/40" />
                    <span className="text-[9px] font-display font-medium text-admin-text-tertiary/60 uppercase tracking-widest">
                      {statsLabel}
                    </span>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                  <DollarSign size={120} />
                </div>
              </CardContent>
            </Card>

            {/* Appointments Card */}
            <Card className="border-none bg-admin-bg-tertiary/50 rounded-none shadow-none hover:bg-admin-bg-secondary transition-all duration-500 group overflow-hidden border-r border-admin-border-primary/10">
              <CardContent className="p-8 relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 bg-epoch-accent/5 border border-epoch-accent/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Calendar className="h-6 w-6 text-epoch-accent" />
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-epoch-primary text-white border-none rounded-none text-[9px] font-display font-bold tracking-widest px-2"
                  >
                    HOY
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em]">
                    Agenda del Día
                  </p>
                  <p className="text-3xl font-display font-bold text-admin-text-primary tracking-tight">
                    {data.kpis.appointments?.today || 0}{" "}
                    <span className="text-xs font-serif italic text-admin-text-tertiary tracking-normal normal-case">
                      Citas
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-admin-border-primary/5">
                    <Clock className="h-3 w-3 text-admin-text-tertiary/40" />
                    <span className="text-[9px] font-display font-medium text-admin-text-tertiary/60 uppercase tracking-widest">
                      {data.kpis.appointments?.confirmed || 0} Confirmadas
                    </span>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                  <Calendar size={120} />
                </div>
              </CardContent>
            </Card>

            {/* Products Card */}
            <Card className="border-none bg-admin-bg-tertiary/50 rounded-none shadow-none hover:bg-admin-bg-secondary transition-all duration-500 group overflow-hidden border-r border-admin-border-primary/10">
              <CardContent className="p-8 relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Package className="h-6 w-6 text-epoch-primary" />
                  </div>
                  {data.kpis.products.lowStock > 0 && (
                    <div className="h-2 w-2 bg-admin-error shadow-[0_0_10px_rgba(174,0,0,0.5)] animate-pulse" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em]">
                    Inventario Activo
                  </p>
                  <p className="text-3xl font-display font-bold text-admin-text-primary tracking-tight">
                    {data.kpis.products.total}{" "}
                    <span className="text-xs font-serif italic text-admin-text-tertiary tracking-normal normal-case">
                      Unidades
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-admin-border-primary/5">
                    <AlertTriangle
                      className={cn(
                        "h-3 w-3",
                        data.kpis.products.lowStock > 0
                          ? "text-admin-error"
                          : "text-epoch-primary",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[9px] font-display font-medium uppercase tracking-widest",
                        data.kpis.products.lowStock > 0
                          ? "text-admin-error"
                          : "text-epoch-primary/60",
                      )}
                    >
                      {data.kpis.products.lowStock > 0
                        ? `${data.kpis.products.lowStock} Alertas Críticas`
                        : "Archivo Saludable"}
                    </span>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                  <Package size={120} />
                </div>
              </CardContent>
            </Card>

            {/* Customers Card */}
            <Card className="border-none bg-admin-bg-tertiary/50 rounded-none shadow-none hover:bg-admin-bg-secondary transition-all duration-500 group overflow-hidden">
              <CardContent className="p-8 relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 bg-epoch-accent/5 border border-epoch-accent/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Users className="h-6 w-6 text-epoch-accent" />
                  </div>
                  <div className="bg-epoch-accent/10 p-1 text-epoch-accent">
                    <Plus className="h-3 w-3" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em]">
                    Cartera de Clientes
                  </p>
                  <p className="text-3xl font-display font-bold text-admin-text-primary tracking-tight">
                    {data.kpis.customers.total}
                  </p>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-admin-border-primary/5">
                    <TrendingUp className="h-3 w-3 text-epoch-primary/40" />
                    <span className="text-[9px] font-display font-medium text-epoch-primary tracking-widest uppercase">
                      +{data.kpis.customers.new} Este Ciclo
                    </span>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                  <Users size={120} />
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-none shadow-none overflow-hidden group">
          <CardHeader className="pb-2 border-b border-admin-border-primary/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-epoch-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                    Evolución de Ingresos
                  </CardTitle>
                </div>
              </div>
              <Select value={revenuePeriod} onValueChange={setRevenuePeriod}>
                <SelectTrigger className="w-[140px] h-9 text-[10px] font-display font-bold uppercase tracking-widest border-admin-border-primary/30 bg-admin-bg-tertiary/50 hover:bg-admin-bg-secondary transition-colors rounded-none">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-admin-border-primary/30">
                  <SelectItem
                    value="7"
                    className="text-[10px] font-display uppercase tracking-widest"
                  >
                    7 días
                  </SelectItem>
                  <SelectItem
                    value="30"
                    className="text-[10px] font-display uppercase tracking-widest"
                  >
                    30 días
                  </SelectItem>
                  <SelectItem
                    value="90"
                    className="text-[10px] font-display uppercase tracking-widest"
                  >
                    3 meses
                  </SelectItem>
                  <SelectItem
                    value="365"
                    className="text-[10px] font-display uppercase tracking-widest"
                  >
                    12 meses
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-2">
              {revenuePeriod === "7" &&
                "Análisis del ciclo semanal de facturación"}
              {revenuePeriod === "30" &&
                "Análisis del rendimiento operativo mensual"}
              {revenuePeriod === "90" && "Proyección estratégica trimestral"}
              {revenuePeriod === "365" &&
                "Informe anual de crecimiento corporativo"}
            </p>
          </CardHeader>
          <CardContent className="p-8">
            {data?.charts?.revenueTrend?.length > 0 ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    id="dashboard-revenue-chart"
                    data={data.charts.revenueTrend}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                          stopColor="var(--chart-1)"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--chart-1)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="0"
                      vertical={false}
                      stroke="rgba(0,0,0,0.03)"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 9,
                        fontWeight: 700,
                        fill: "var(--admin-text-tertiary)",
                        fontFamily: "var(--font-display)",
                      }}
                      tickFormatter={(date) =>
                        new Date(date)
                          .toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                          })
                          .toUpperCase()
                      }
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 9,
                        fontWeight: 700,
                        fill: "var(--admin-text-tertiary)",
                        fontFamily: "var(--font-display)",
                      }}
                      tickFormatter={(value) =>
                        `$${value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--admin-bg-secondary)",
                        borderRadius: "0",
                        border: "1px solid var(--admin-accent-secondary)",
                        boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.4)",
                        fontSize: "10px",
                        fontWeight: "bold",
                        fontFamily: "var(--font-display)",
                        color: "var(--admin-text-primary)",
                        padding: "12px",
                        zIndex: 100,
                      }}
                      itemStyle={{
                        color: "var(--admin-accent-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                      labelStyle={{
                        color: "rgba(249, 247, 242, 0.5)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
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
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                <div className="h-12 w-12 bg-admin-bg-tertiary border border-admin-border-primary/10 flex items-center justify-center">
                  <BarChart className="h-6 w-6 text-admin-text-tertiary/20" />
                </div>
                <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Falta de registros para el análisis operativo
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Orders Status Distribution */}
        <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-none shadow-none overflow-hidden group">
          <CardHeader className="pb-2 border-b border-admin-border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-epoch-accent/5 border border-epoch-accent/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-epoch-accent" />
              </div>
              <div>
                <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                  Estado Operativo
                </CardTitle>
              </div>
            </div>
            <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-2">
              Distribución técnica en taller y manufactura
            </p>
          </CardHeader>
          <CardContent className="p-8">
            {data.kpis.workOrders && data.kpis.workOrders.total > 0 ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart id="dashboard-ops-chart">
                    <Pie
                      data={[
                        {
                          name: "EN PROGRESO",
                          value: data.kpis.workOrders.inProgress,
                        },
                        {
                          name: "PENDIENTES",
                          value: data.kpis.workOrders.pending || 0,
                        },
                        {
                          name: "CONCLUIDOS",
                          value: data.kpis.workOrders.completed,
                        },
                      ].filter((item) => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                      strokeWidth={0}
                      animationBegin={200}
                      animationDuration={2000}
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
                            className="hover:opacity-80 transition-opacity"
                          />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--admin-bg-secondary)",
                        borderRadius: "0",
                        border: "1px solid var(--admin-accent-secondary)",
                        boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.4)",
                        fontSize: "10px",
                        fontWeight: "bold",
                        fontFamily: "var(--font-display)",
                        color: "var(--admin-text-primary)",
                        padding: "12px",
                      }}
                      itemStyle={{
                        color: "var(--admin-accent-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                      labelStyle={{
                        color: "rgba(249, 247, 242, 0.5)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="rect"
                      formatter={(value) => (
                        <span className="text-[9px] font-display font-bold text-admin-text-secondary uppercase tracking-widest pl-2">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                <div className="h-12 w-12 bg-admin-bg-tertiary border border-admin-border-primary/10 flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-admin-text-tertiary/20" />
                </div>
                <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Sin actividad operativa en el taller
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products Chart */}
      {data?.charts?.topProducts?.length > 0 && (
        <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-none shadow-none overflow-hidden group">
          <CardHeader className="pb-2 border-b border-admin-border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-epoch-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                  Best Sellers
                </CardTitle>
              </div>
            </div>
            <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-2">
              Excelencia en catálogo: Productos de mayor desempeño comercial
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[380px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.charts.topProducts}
                  layout="vertical"
                  margin={{ left: 60, right: 60, top: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="0"
                    horizontal={false}
                    stroke="rgba(0,0,0,0.03)"
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 9,
                      fontWeight: 700,
                      fill: "var(--admin-text-tertiary)",
                      fontFamily: "var(--font-display)",
                    }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={180}
                    tick={{
                      fontSize: 10,
                      fontWeight: 700,
                      fill: "var(--admin-text-primary)",
                      fontFamily: "var(--font-display)",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--admin-bg-secondary)",
                      borderRadius: "0",
                      border: "1px solid var(--admin-accent-secondary)",
                      boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.4)",
                      fontSize: "10px",
                      fontWeight: "bold",
                      fontFamily: "var(--font-display)",
                      color: "var(--admin-text-primary)",
                      padding: "12px",
                      zIndex: 100,
                    }}
                    itemStyle={{
                      color: "var(--admin-accent-secondary)",
                      textTransform: "uppercase",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Ingresos"
                    fill="var(--chart-1)"
                    radius={[0, 0, 0, 0]}
                    barSize={20}
                    animationDuration={2500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Appointments & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-0 border border-admin-border-primary/20">
        {/* Today's Appointments - Takes 2 columns */}
        <div className="lg:col-span-2 border-r border-admin-border-primary/10">
          <Card className="border-none bg-admin-bg-tertiary/50 rounded-none shadow-none group transition-all duration-300">
            <CardHeader className="pb-4 border-b border-admin-border-primary/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-epoch-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                      Citas de Hoy
                    </CardTitle>
                    <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
                      Archivo de Compromisos Diarios
                    </p>
                  </div>
                </div>
                <Link href="/admin/appointments">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-4 font-display font-bold text-[10px] text-epoch-primary hover:bg-epoch-primary/5 rounded-none group transition-all tracking-widest uppercase"
                  >
                    GESTIONAR AGENDA
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-admin-border-primary/5">
                {data?.todayAppointments?.length > 0 ? (
                  data.todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="group flex items-center p-6 hover:bg-admin-bg-secondary transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-epoch-accent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex-shrink-0 mr-6 text-center min-w-[70px] border-r border-admin-border-primary/10 pr-6">
                        <p className="text-sm font-display font-bold text-admin-text-primary leading-none tracking-wider">
                          {formatTime(appointment.appointment_time)}
                        </p>
                        <p className="text-[9px] font-display font-medium text-admin-text-tertiary uppercase tracking-[0.1em] mt-2">
                          {appointment.duration_minutes} MINUTOS
                        </p>
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-display font-bold text-admin-text-primary truncate uppercase tracking-wide">
                            {appointment.customer_name}
                          </p>
                          {getAppointmentStatusBadge(appointment.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-serif italic text-admin-text-tertiary tracking-tight">
                            {appointment.appointment_type?.replace(/_/g, " ") ||
                              "Consulta General Terapéutica"}
                          </span>
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-admin-text-tertiary hover:text-epoch-primary hover:bg-admin-bg-secondary border border-transparent hover:border-admin-border-primary/10 rounded-none shadow-sm"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center p-8">
                    <div className="h-12 w-12 bg-admin-bg-tertiary border border-admin-border-primary/10 flex items-center justify-center mb-4">
                      <Clock className="h-6 w-6 text-admin-text-tertiary/20" />
                    </div>
                    <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Tranquilidad absoluta para este ciclo
                    </p>
                    <p className="text-[11px] font-serif italic text-admin-text-tertiary/60 mt-2">
                      No hay registros de citas programadas para el día de hoy.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions (Dashboard Management) */}
        <div>
          <Card className="border-none bg-admin-bg-tertiary/30 rounded-none shadow-none h-full group">
            <CardHeader className="pb-4 border-b border-admin-border-primary/5 bg-admin-bg-tertiary/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-epoch-accent/5 border border-epoch-accent/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-epoch-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                    Comandos
                  </CardTitle>
                  <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
                    Operaciones de Acceso Rápido
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Dynamic Search Actions */}
              <div className="space-y-3">
                <DashboardSearch
                  type="customer"
                  placeholder="LOCALIZAR CLIENTE..."
                />
                <DashboardSearch
                  type="product"
                  placeholder="IDENTIFICAR PRODUCTO..."
                />
              </div>

              <Button
                onClick={() => setIsAppointmentModalOpen(true)}
                className="w-full h-12 bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] rounded-none shadow-premium-sm transition-all flex items-center justify-center gap-3 uppercase cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Nueva Cita Médica
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-admin-bg-tertiary/50 border-admin-border-primary/20 hover:border-epoch-accent/40 text-admin-text-primary rounded-none transition-all cursor-pointer hover:bg-admin-bg-secondary"
                  onClick={() => (window.location.href = "/admin/products")}
                >
                  <Package className="h-5 w-5 text-epoch-primary" />
                  <span className="text-[9px] font-display font-bold uppercase tracking-widest">
                    Catálogo
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-admin-bg-tertiary/50 border-admin-border-primary/20 hover:border-epoch-accent/40 text-admin-text-primary rounded-none transition-all cursor-pointer hover:bg-admin-bg-secondary"
                  onClick={() => (window.location.href = "/admin/customers")}
                >
                  <Users className="h-5 w-5 text-epoch-accent" />
                  <span className="text-[9px] font-display font-bold uppercase tracking-widest">
                    Clientes
                  </span>
                </Button>
              </div>

              <div className="pt-6 mt-6 border-t border-admin-border-primary/10">
                <p className="text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] mb-4">
                  SISTEMA DE ASISTENCIA
                </p>
                <div className="p-4 bg-admin-bg-tertiary/50 border border-admin-border-primary/10 rounded-none relative overflow-hidden group/box">
                  <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover/box:opacity-[0.1] transition-opacity">
                    <FileText size={80} />
                  </div>
                  <p className="text-[11px] font-serif italic text-admin-text-secondary leading-relaxed mb-3">
                    "La precisión es el sello distintivo de la maestría óptica."
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-[10px] font-display font-bold text-epoch-accent uppercase tracking-widest hover:text-epoch-primary"
                  >
                    Ver Documentación →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Creation Modal */}
      <Dialog
        open={isAppointmentModalOpen}
        onOpenChange={setIsAppointmentModalOpen}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-none border-2 border-admin-border-primary/20 shadow-premium-lg p-0">
          <DialogHeader className="p-8 bg-admin-bg-tertiary border-b border-admin-border-primary/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 bg-epoch-primary flex items-center justify-center">
                <CalendarPlus className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-2xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                Nueva Cita Médica
              </DialogTitle>
            </div>
            <DialogDescription className="text-admin-text-tertiary font-serif italic text-[11px] tracking-wide">
              Ingrese las especificaciones técnicas para la reserva de agenda
              del paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 bg-admin-bg-secondary">
            <CreateAppointmentForm
              onSuccess={() => {
                setIsAppointmentModalOpen(false);
                fetchDashboardData();
                toast.success("AGENDAMIENTO COMPLETADO");
              }}
              onCancel={() => setIsAppointmentModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
