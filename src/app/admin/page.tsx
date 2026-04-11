"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarPlus,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Receipt,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { AppointmentsList } from "@/components/admin/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/useBranch";
import { useMobileView } from "@/hooks/useMobileView";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
const CreateAppointmentForm = dynamic(
  () => import("@/components/admin/CreateAppointmentForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-accent-primary" />
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
  todayAppointments: unknown[];
  lowStockProducts: unknown[];
  charts: {
    revenueTrend: unknown[];
    ordersStatus: unknown;
    topProducts: unknown[];
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
  const { isMobile } = useMobileView();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(defaultDashboardData);
  const [error, setError] = useState<string | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<string>("7");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }

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
      setRefreshing(false);
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
            className="bg-transparent text-admin-info border-admin-info/30 font-bold text-[10px] uppercase tracking-wider rounded-xl"
            variant="outline"
          >
            <Clock className="h-3 w-3 mr-1" />
            Programada
          </Badge>
        );
      case "confirmed":
        return (
          <Badge
            className="bg-transparent text-admin-success border-admin-success/30 font-bold text-[10px] uppercase tracking-wider rounded-xl"
            variant="outline"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmada
          </Badge>
        );
      case "completed":
        return (
          <Badge
            className="bg-admin-accent-primary/10 text-admin-accent-primary border-admin-accent-primary/20 font-bold text-[10px] uppercase tracking-wider rounded-xl"
            variant="outline"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Completada
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            className="bg-admin-error/10 text-admin-error border-admin-error/30 font-bold text-[10px] uppercase tracking-wider rounded-xl"
            variant="outline"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        );
      case "no_show":
        return (
          <Badge
            className="bg-transparent text-admin-text-tertiary border-admin-border-secondary font-bold text-[10px] uppercase tracking-wider rounded-xl"
            variant="outline"
          >
            <XCircle className="h-3 w-3 mr-1" />
            No asistó
          </Badge>
        );
      default:
        return (
          <Badge
            className="text-[10px] font-bold uppercase tracking-wider rounded-xl"
            variant="secondary"
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
        <Skeleton className="h-20 w-full rounded-xl" />

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              className="p-8 rounded-xl border border-admin-border-primary/20 bg-admin-bg-tertiary/20"
              key={i}
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
          <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-xl shadow-none">
            <CardHeader className="pb-2 border-b border-admin-border-primary/10">
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="p-8">
              <Skeleton className="h-[320px] w-full" />
            </CardContent>
          </Card>
          <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-xl shadow-none">
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
        <div className="text-center max-w-md p-8 bg-admin-bg-secondary rounded-xl border border-admin-error/20 shadow-xl shadow-admin-error/5">
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
            className="w-full h-11 bg-admin-accent-primary hover:bg-admin-accent-secondary text-white font-bold rounded-xl transition-all shadow-lg shadow-admin-accent-primary/20"
            onClick={() => window.location.reload()}
          >
            Sincronizar Panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
      {/* Header - Simplified for mobile, expanded for desktop */}
      <div className="flex flex-col md:flex-col lg:flex-col xl:flex-row justify-between items-start gap-3 md:gap-4 xl:gap-6 pb-3 md:pb-4 border-b border-admin-border-primary/20">
        <div className="space-y-1">
          <h1
            className="text-xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight text-admin-text-primary uppercase"
            data-tour="dashboard-header"
          >
            Resumen Ejecutivo
          </h1>
          <p className="text-[10px] sm:text-xs font-serif italic text-admin-text-tertiary tracking-[0.15em] sm:tracking-[0.2em] uppercase">
            Visión general del negocio
          </p>
        </div>

        {/* Desktop-only action buttons - hidden on mobile */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
          <Button
            aria-label="Actualizar"
            className="h-9 w-9 bg-admin-bg-tertiary/50 border-admin-border-primary/30 text-admin-text-primary font-bold rounded-xl transition-all hover:shadow-md hover:border-epoch-accent/30"
            disabled={refreshing}
            size="icon"
            variant="outline"
            onClick={() => fetchDashboardData(true)}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Link href="/admin/pos">
            <Button className="h-9 sm:h-10 px-3 sm:px-6 bg-epoch-primary hover:bg-epoch-surface text-white font-bold rounded-xl transition-all shadow-xl flex items-center gap-1.5 sm:gap-2 border border-admin-border-primary/10">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-display tracking-widest text-[10px] sm:text-xs">
                POS
              </span>
            </Button>
          </Link>
          <Button
            className="h-9 w-9 sm:h-10 sm:w-auto sm:px-6 bg-admin-bg-tertiary/50 border-admin-border-primary/30 text-admin-text-primary font-bold rounded-xl transition-all hover:shadow-md hover:border-admin-accent-primary/30"
            size="icon"
            variant="outline"
            onClick={() => setIsAppointmentModalOpen(true)}
          >
            <Calendar className="h-4 w-4" />
            <span className="font-display tracking-widest text-xs hidden sm:inline ml-2">
              AGENDA
            </span>
          </Button>
          <Link href="/admin/work-orders">
            <Button
              className="h-9 w-9 sm:h-10 sm:w-auto sm:px-6 bg-admin-bg-tertiary/50 border-admin-border-primary/30 text-admin-text-primary font-bold rounded-xl transition-all hover:shadow-md hover:border-admin-accent-primary/30 relative"
              size="icon"
              variant="outline"
            >
              <div className="relative">
                <Package className="h-4 w-4" />
                {(data?.kpis?.workOrders?.pending ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-admin-accent-secondary text-[#1A2B23] text-[8px] font-black flex items-center justify-center border border-admin-bg-secondary leading-none shadow-sm">
                    {data?.kpis?.workOrders?.pending ?? 0}
                  </span>
                )}
              </div>
              <span className="font-display tracking-widest text-xs hidden sm:inline ml-2">
                TALLER
              </span>
            </Button>
          </Link>
          <Link href="/admin/customers/new">
            <Button className="h-9 sm:h-10 px-3 sm:px-6 bg-epoch-accent hover:bg-epoch-accent/90 text-epoch-primary font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5 sm:gap-2 border border-epoch-primary/20">
              <Users className="h-4 w-4" />
              <span className="font-display tracking-widest text-[10px] sm:text-xs">
                NUEVO CLIENTE
              </span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stock Alert Banner - Compact */}
      {data?.lowStockProducts?.length > 0 && (
        <Card className="border border-admin-error/20 bg-admin-error/[0.02] rounded-xl shadow-none overflow-hidden animate-in slide-in-from-top duration-500 relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <AlertTriangle size={60} />
          </div>
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-admin-error/10 border border-admin-error/20 flex items-center justify-center">
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
                  className="h-9 font-display tracking-widest text-[10px] bg-admin-bg-tertiary/50 text-admin-error border-admin-error/30 hover:bg-admin-error hover:text-white rounded-xl transition-all"
                  size="sm"
                  variant="outline"
                >
                  GESTIONAR ARCHIVO
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Appointments - Above KPIs */}
      <AppointmentsList
        appointments={data?.todayAppointments ?? []}
        formatTime={formatTime}
        getAppointmentStatusBadge={getAppointmentStatusBadge}
      />

      {/* KPI Cards - 6 Cards Simplified */}
      {(() => {
        const currentBranch = branches?.find((b) => b.id === currentBranchId);
        const statsLabel = isGlobalView
          ? "Todas las sucursales"
          : currentBranch
            ? `Sucursal: ${currentBranch.name}`
            : "Sucursal seleccionada";

        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
            {/* 1. Citas de Hoy - Más visible */}
            <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
              <CardContent className="p-2 md:p-4 relative">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-epoch-accent/10 border border-epoch-accent/20 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5 text-epoch-accent" />
                  </div>
                  <Badge className="bg-epoch-primary text-white border-none rounded-lg text-[6px] md:text-[8px] font-display font-bold tracking-widest px-1 py-0">
                    HOY
                  </Badge>
                </div>
                <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                  {data.kpis.appointments?.today || 0}
                </p>
                <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
                  Citas
                </p>
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
                  <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
                    {data.kpis.appointments?.confirmed || 0} conf.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 2. Trabajos Pendientes - Badge rojo */}
            <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
              <CardContent className="p-2 md:p-4 relative">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-admin-error/10 border border-admin-error/20 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Package className="h-4 w-4 md:h-5 md:w-5 text-admin-error" />
                  </div>
                  {(data.kpis.workOrders?.pending ?? 0) > 0 && (
                    <Badge className="bg-admin-error text-white border-none rounded-lg text-[6px] md:text-[8px] font-display font-bold tracking-widest px-1 py-0 animate-pulse">
                      {data.kpis.workOrders?.pending ?? 0}
                    </Badge>
                  )}
                </div>
                <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                  {data.kpis.workOrders?.pending || 0}
                </p>
                <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
                  Trabajos
                </p>
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
                  <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
                    {data.kpis.workOrders?.inProgress || 0} proc.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 3. Ingresos */}
            <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
              <CardContent className="p-2 md:p-4 relative">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-epoch-primary/10 border border-epoch-primary/20 flex items-center justify-center transition-transform group-hover:scale-110">
                    <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-epoch-primary" />
                  </div>
                  <div
                    className={cn(
                      "text-[7px] md:text-[9px] font-display font-bold px-1 md:px-1.5 py-0.5 rounded",
                      data.kpis.revenue.change >= 0
                        ? "text-epoch-primary bg-epoch-primary/10"
                        : "text-admin-error bg-admin-error/10",
                    )}
                  >
                    {data.kpis.revenue.change >= 0 ? "+" : ""}
                    {data.kpis.revenue.change.toFixed(1)}%
                  </div>
                </div>
                <p
                  className="text-base md:text-lg font-display font-bold text-admin-text-primary tracking-tight truncate"
                  title={formatCurrency(data.kpis.revenue.current)}
                >
                  {formatCurrency(data.kpis.revenue.current)}
                </p>
                <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
                  Ingresos
                </p>
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
                  <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
                    {revenuePeriod} días
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 4. Presupuestos Abiertos */}
            <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
              <CardContent className="p-2 md:p-4 relative">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Receipt className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                  {data.kpis.quotes?.pending || 0}
                </p>
                <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
                  Presupuestos
                </p>
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
                  <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
                    {data.kpis.quotes?.converted || 0} cerr.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 5. Alertas Stock */}
            <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
              <CardContent className="p-2 md:p-4 relative">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div
                    className={cn(
                      "h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                      data.kpis.products.lowStock > 0
                        ? "bg-admin-error/10 border border-admin-error/20"
                        : "bg-epoch-primary/10 border border-epoch-primary/20",
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        "h-4 w-4 md:h-5 md:w-5",
                        data.kpis.products.lowStock > 0
                          ? "text-admin-error"
                          : "text-epoch-primary",
                      )}
                    />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                  {data.kpis.products.lowStock}
                </p>
                <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
                  Stock
                </p>
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
                  <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
                    {data.kpis.products.outOfStock} sin stock
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 6. Clientes Totales */}
            <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
              <CardContent className="p-2 md:p-4 relative">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-epoch-accent/10 border border-epoch-accent/20 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-epoch-accent" />
                  </div>
                </div>
                <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                  {data.kpis.customers.total}
                </p>
                <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
                  Clientes
                </p>
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
                  <span className="text-[7px] md:text-[8px] font-display text-epoch-primary">
                    +{data.kpis.customers.new} nuevos
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Charts Section - Solo 1 gráfico */}
      <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-xl shadow-none overflow-hidden group">
        <CardHeader className="pb-2 border-b border-admin-border-primary/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-epoch-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                  Evolución de Ingresos
                </CardTitle>
              </div>
            </div>
            <Select value={revenuePeriod} onValueChange={setRevenuePeriod}>
              <SelectTrigger className="w-[140px] h-9 text-[10px] font-display font-bold uppercase tracking-widest border-admin-border-primary/30 bg-admin-bg-tertiary/50 hover:bg-admin-bg-secondary transition-colors rounded-xl">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary/30">
                <SelectItem
                  className="text-[10px] font-display uppercase tracking-widest"
                  value="7"
                >
                  7 días
                </SelectItem>
                <SelectItem
                  className="text-[10px] font-display uppercase tracking-widest"
                  value="30"
                >
                  30 días
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-2">
            {revenuePeriod === "7"
              ? "Análisis del ciclo semanal de facturación"
              : "Análisis del rendimiento operativo mensual"}
          </p>
        </CardHeader>
        <CardContent className="p-3 md:p-8">
          {data?.charts?.revenueTrend?.length > 0 ? (
            <div className="h-[160px] md:h-[220px] lg:h-[280px] w-full">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart
                  data={data.charts.revenueTrend}
                  id="dashboard-revenue-chart"
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      x2="0"
                      y1="0"
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
                    stroke="rgba(0,0,0,0.03)"
                    strokeDasharray="0"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="date"
                    dy={10}
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
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{
                      fontSize: 9,
                      fontWeight: 700,
                      fill: "var(--admin-text-tertiary)",
                      fontFamily: "var(--font-display)",
                    }}
                    tickFormatter={(value) =>
                      `$${value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`
                    }
                    tickLine={false}
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
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Ingresos",
                    ]}
                    itemStyle={{
                      color: "var(--admin-accent-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                    labelFormatter={(date) =>
                      new Date(date).toLocaleDateString("es-AR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })
                    }
                    labelStyle={{
                      color: "rgba(249, 247, 242, 0.5)",
                      marginBottom: "4px",
                      textTransform: "uppercase",
                    }}
                  />
                  <Area
                    animationDuration={2000}
                    dataKey="revenue"
                    fill="url(#colorRevenue)"
                    fillOpacity={1}
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-center space-y-4">
              <div className="h-12 w-12 rounded-xl bg-admin-bg-tertiary border border-admin-border-primary/10 flex items-center justify-center">
                <BarChart className="h-6 w-6 text-admin-text-tertiary/20" />
              </div>
              <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                Falta de registros para el análisis operativo
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Creation Modal - Epoch Style */}
      <Dialog
        open={isAppointmentModalOpen}
        onOpenChange={setIsAppointmentModalOpen}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl bg-background p-0">
          {/* Header - Light style matching appointments page */}
          <div className="flex items-center justify-between px-6 py-4 bg-admin-bg-tertiary border-b border-admin-border-primary/10 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-epoch-primary flex items-center justify-center rounded-lg">
                <CalendarPlus className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-lg font-display font-bold text-admin-text-primary tracking-wide">
                Nueva Cita
              </DialogTitle>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 bg-background">
            <CreateAppointmentForm
              onCancel={() => setIsAppointmentModalOpen(false)}
              onSuccess={() => {
                setIsAppointmentModalOpen(false);
                fetchDashboardData();
                toast.success("Cita agendada exitosamente");
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
