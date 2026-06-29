"use client";

import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import DashboardAlerts from "./DashboardAlerts";
import DashboardCharts from "./DashboardCharts";
import DashboardHeader from "./DashboardHeader";
import DashboardKPICards from "./DashboardKPICards";
import type { DashboardData } from "./types";
import { AppointmentsList } from "@/components/admin/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/useBranch";
import { useMobileView } from "@/hooks/useMobileView";

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

export default function AdminDashboardContent() {
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const { isMobile } = useMobileView();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(defaultDashboardData);
  const [error, setError] = useState<string | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<string>("7");
  const [refreshing, setRefreshing] = useState(false);
  const pendingWorkOrders = data?.kpis?.workOrders?.pending ?? 0;

  const fetchDashboardData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }

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

        <Skeleton className="h-20 w-full rounded-xl" />

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
      <DashboardHeader
        refreshing={refreshing}
        pendingWorkOrders={pendingWorkOrders}
        onRefresh={() => fetchDashboardData(true)}
        onOpenAppointment={() => setIsAppointmentModalOpen(true)}
      />

      <DashboardAlerts lowStockProducts={data?.lowStockProducts ?? []} />

      <AppointmentsList
        appointments={(data?.todayAppointments ?? []) as { id: string; customer_name: string; appointment_time: string; appointment_type: string | null; status: string; duration_minutes: number }[]}
        formatTime={formatTime}
        getAppointmentStatusBadge={getAppointmentStatusBadge}
      />

      <DashboardKPICards
        data={data}
        revenuePeriod={revenuePeriod}
        branches={branches}
        currentBranchId={currentBranchId}
        isGlobalView={isGlobalView}
      />

      <DashboardCharts
        data={data}
        revenuePeriod={revenuePeriod}
        onRevenuePeriodChange={setRevenuePeriod}
      />

      <Dialog
        open={isAppointmentModalOpen}
        onOpenChange={setIsAppointmentModalOpen}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl bg-background p-0">
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
