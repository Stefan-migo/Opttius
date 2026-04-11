"use client";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Truck,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/useBranch";
import { cn } from "@/lib/utils";

// Lazy load large components to reduce initial bundle size
const AppointmentCalendar = dynamic(
  () => import("@/components/admin/AppointmentCalendar"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-epoch-primary mx-auto" />
          <p className="text-admin-text-tertiary">Cargando calendario...</p>
        </div>
      </div>
    ),
    ssr: false,
  },
);

const CreateAppointmentForm = dynamic(
  () => import("@/components/admin/CreateAppointmentForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-epoch-primary mx-auto" />
          <p className="text-admin-text-tertiary">Cargando formulario...</p>
        </div>
      </div>
    ),
    ssr: false,
  },
);
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import { appointmentService } from "@/lib/api/services";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  customer?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  } | null;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_rut?: string;
  guest_email?: string;
  guest_phone?: string;
  assigned_staff?: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
  notes?: string;
  reason?: string;
}

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuthContext();
  const [view, setView] = useState<"day" | "week" | "month">("week");

  // Default to day view on mobile for better usability (only on initial mount)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setView("day");
    }
  }, []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [prefilledAppointmentData, setPrefilledAppointmentData] = useState<{
    date?: string;
    time?: string;
    lockDateTime?: boolean;
  } | null>(null);
  // Using any for scheduleSettings due to type mismatch between service and component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scheduleSettings, setScheduleSettings] = useState<any>(null);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const weeklyReportRef = useRef<HTMLDivElement>(null);

  const {
    currentBranch,
    branches,
    isGlobalView,
    isSuperAdmin,
    setCurrentBranch,
    currentBranchId,
  } = useBranch();
  const [selectedBranchForView, setSelectedBranchForView] = useState<
    string | null
  >(null);

  // Determine which branch to use for filtering
  const branchIdForFilter =
    isGlobalView && selectedBranchForView
      ? selectedBranchForView
      : currentBranch?.id || null;

  // Initialize selectedBranchForView when in global view
  useEffect(() => {
    if (isGlobalView && isSuperAdmin && branches.length > 0) {
      if (!selectedBranchForView) {
        setSelectedBranchForView(branches[0]?.id || null);
      }
    } else if (!isGlobalView && selectedBranchForView) {
      setSelectedBranchForView(null);
    }
  }, [isGlobalView, isSuperAdmin, branches.length, selectedBranchForView]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAppointments();
      fetchScheduleSettings();
    }
  }, [currentDate, view, statusFilter, branchIdForFilter, authLoading, user]);

  const fetchAppointments = async () => {
    if (!user || authLoading) return;

    try {
      setLoading(true);
      let startDate: Date;
      let endDate: Date;
      if (view === "day") {
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
      } else if (view === "week") {
        const monday = getMondayOfWeek(currentDate);
        startDate = new Date(monday);
        endDate = new Date(monday);
        endDate.setDate(endDate.getDate() + 6);
      } else {
        startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 30);
        endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 30);
      }

      const appointments = await appointmentService.getAppointments({
        date_from: startDate.toISOString().split("T")[0],
        date_to: endDate.toISOString().split("T")[0],
        status: statusFilter !== "all" ? statusFilter : undefined,
        branch_id: branchIdForFilter || undefined,
      });

      setAppointments(appointments.data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Error al cargar citas");
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleSettings = async () => {
    if (!user || authLoading) return;

    try {
      const settings = await appointmentService.getScheduleSettings(
        branchIdForFilter || currentBranchId || undefined,
      );
      setScheduleSettings(settings || null);
    } catch (error) {
      console.error("Error fetching schedule settings:", error);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
      setCurrentDate(newDate);
    } else if (view === "week") {
      const monday = getMondayOfWeek(currentDate);
      monday.setDate(monday.getDate() + (direction === "next" ? 7 : -7));
      setCurrentDate(monday);
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Semana determinada por el lunes (ISO 8601)
  const getMondayOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  };

  const weekLabelDate =
    view === "week" ? getMondayOfWeek(currentDate) : currentDate;

  const getAppointmentTypeIcon = (type: string): typeof Calendar => {
    const icons: Record<string, typeof Calendar> = {
      eye_exam: Eye,
      consultation: User,
      fitting: Package,
      delivery: Truck,
      repair: Wrench,
      follow_up: RefreshCw,
      emergency: AlertCircle,
      other: Calendar,
    };
    return icons[type] || Calendar;
  };

  const getAppointmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      eye_exam: "Examen de la Vista",
      consultation: "Consulta",
      fitting: "Ajuste",
      delivery: "Entrega",
      repair: "Reparación",
      follow_up: "Seguimiento",
      emergency: "Emergencia",
      other: "Otro",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge
            className="bg-admin-bg-tertiary/50 text-admin-info border-admin-info/30 font-bold text-[10px] uppercase tracking-wider"
            variant="outline"
          >
            <Clock className="h-3 w-3 mr-1" />
            Programada
          </Badge>
        );
      case "confirmed":
        return (
          <Badge
            className="bg-admin-bg-tertiary/50 text-admin-success border-admin-success/30 font-bold text-[10px] uppercase tracking-wider"
            variant="outline"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmada
          </Badge>
        );
      case "completed":
        return (
          <Badge
            className="bg-admin-bg-tertiary/50 text-admin-accent-secondary border-admin-accent-secondary/30 font-bold text-[10px] uppercase tracking-wider"
            variant="outline"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Completada
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            className="bg-admin-error/10 text-admin-error border-admin-error/30 font-bold text-[10px] uppercase tracking-wider"
            variant="outline"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        );
      case "no_show":
        return (
          <Badge
            className="bg-admin-bg-tertiary/50 text-admin-text-tertiary border-admin-border-secondary font-bold text-[10px] uppercase tracking-wider"
            variant="outline"
          >
            <XCircle className="h-3 w-3 mr-1" />
            No asistó
          </Badge>
        );
      default:
        return (
          <Badge
            className="text-[10px] font-bold uppercase tracking-wider"
            variant="secondary"
          >
            {status}
          </Badge>
        );
    }
  };

  const handleAppointmentCreated = async () => {
    setShowCreateAppointment(false);
    setSelectedAppointment(null);
    setPrefilledAppointmentData(null); // Clear prefilled data after successful creation

    // Force refresh to ensure calendar updates
    setLastRefresh(Date.now());

    // Fetch appointments and wait for it to complete
    try {
      await fetchAppointments();
      toast.success("Cita agendada correctamente");
    } catch (error) {
      toast.error("Error al actualizar el calendario");
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setPrefilledAppointmentData(null); // Clear prefilled data when viewing existing appointment
    setShowCreateAppointment(false); // Close create form if open
  };

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: sunday };
  };

  const getWeeklyReportData = () => {
    const { start, end } = getWeekRange(currentDate);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const weekAppointments = appointments.filter((a) => {
      const d = a.appointment_date;
      return d >= startStr && d <= endStr;
    });
    const byDay: Record<string, Appointment[]> = {};
    const days = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      byDay[days[i]] = weekAppointments
        .filter((a) => a.appointment_date === dateStr)
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    }
    const byStatus = {
      scheduled: weekAppointments.filter((a) => a.status === "scheduled")
        .length,
      confirmed: weekAppointments.filter((a) => a.status === "confirmed")
        .length,
      completed: weekAppointments.filter((a) => a.status === "completed")
        .length,
      cancelled: weekAppointments.filter((a) => a.status === "cancelled")
        .length,
      no_show: weekAppointments.filter((a) => a.status === "no_show").length,
    };
    return {
      start,
      end,
      startStr,
      endStr,
      appointments: weekAppointments,
      byDay,
      byStatus,
    };
  };

  const handleSlotClick = (date: Date, time: string) => {
    // Open create appointment form with pre-filled date and time
    setSelectedAppointment(null);
    // Format time correctly (HH:MM)
    const timeFormatted = time.length >= 5 ? time.substring(0, 5) : time;
    setPrefilledAppointmentData({
      date: date.toISOString().split("T")[0],
      time: timeFormatted,
      lockDateTime: true, // Lock date and time when opened from slot
    });
    setShowCreateAppointment(true);
  };

  const handlePrintWeeklyReport = () => {
    const el = weeklyReportRef.current;
    // Try new window first (direct from user gesture to avoid popup blocking)
    const printWindow = window.open("", "_blank");
    if (!printWindow || !el) {
      // Fallback: use in-page print with CSS visibility
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.print());
      });
      return;
    }
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-print-hide]").forEach((n) => n.remove());
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte Semanal de Citas</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 1rem; color: #333; }
            .grid { display: grid; gap: 0.75rem; }
            .grid-cols-5 { grid-template-columns: repeat(5, 1fr); }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .p-4 { padding: 1rem; }
            .rounded-xl { border-radius: 0.75rem; }
            .border { border: 1px solid #e5e7eb; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-2xl { font-size: 1.5rem; }
            .font-bold { font-weight: 700; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .divide-y > * + * { border-top: 1px solid #e5e7eb; }
            [class*="print:hidden"] { display: none !important; }
          </style>
        </head>
        <body>${clone.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      // Delay print to ensure layout is ready
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 100);
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header - multi-row */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
            Agenda
          </h1>
          <p className="text-[10px] sm:text-xs font-serif italic text-admin-text-tertiary uppercase tracking-[0.2em] sm:tracking-[0.3em]">
            Gestión Técnica de Consultas y Procedimientos Ópticos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/appointments/settings">
            <Button
              aria-label="Configuración"
              className="h-9 w-9 sm:w-auto sm:px-4 bg-white border-admin-border-primary/20 hover:border-epoch-accent/40 text-admin-text-primary font-display font-bold text-[10px] tracking-widest uppercase rounded-xl transition-all"
              size="sm"
              variant="outline"
            >
              <Settings className="h-4 w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Configuración</span>
            </Button>
          </Link>
          <Button
            className="h-9 gap-1.5 px-4 sm:px-6 bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-widest uppercase rounded-xl transition-all shadow-premium-sm"
            size="sm"
            onClick={() => {
              setSelectedAppointment(null);
              setPrefilledAppointmentData(null);
              setShowCreateAppointment(true);
            }}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-sm">Nueva Cita</span>
          </Button>
        </div>
      </div>

      {/* View Controls - responsive layout and fonts */}
      <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-xl shadow-none overflow-hidden">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-4 md:gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center bg-white p-1 rounded-xl border border-admin-border-primary/20 w-fit">
                <Button
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-admin-bg-tertiary text-admin-text-primary rounded-lg sm:rounded-xl transition-all"
                  size="sm"
                  variant="ghost"
                  onClick={() => navigateDate("prev")}
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button
                  className="px-3 sm:px-6 h-8 sm:h-9 font-display font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-admin-text-secondary hover:bg-admin-bg-tertiary rounded-lg sm:rounded-xl transition-all"
                  size="sm"
                  variant="ghost"
                  onClick={goToToday}
                >
                  Hoy
                </Button>
                <Button
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-admin-bg-tertiary text-admin-text-primary rounded-lg sm:rounded-xl transition-all"
                  size="sm"
                  variant="ghost"
                  onClick={() => navigateDate("next")}
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 bg-white rounded-xl border border-admin-border-primary/20 min-w-0">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-primary shrink-0" />
                <span className="text-sm sm:text-base md:text-lg font-display font-bold text-admin-text-primary uppercase tracking-tight truncate">
                  {view === "day"
                    ? currentDate.toLocaleDateString("es-CL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })
                    : view === "week"
                      ? `Semana del ${weekLabelDate.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}`
                      : currentDate.toLocaleDateString("es-CL", {
                          month: "long",
                          year: "numeric",
                        })}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Branch selector for global view */}
              {isGlobalView && isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedBranchForView || ""}
                    onValueChange={(value) => setSelectedBranchForView(value)}
                  >
                    <SelectTrigger className="w-[140px] sm:w-[160px] md:w-[180px] h-9 sm:h-10 bg-white border-admin-border-primary/20 font-display font-bold text-[9px] sm:text-[10px] tracking-widest uppercase rounded-xl focus:ring-epoch-primary/20 transition-all">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-epoch-primary" />
                        <SelectValue placeholder="SUCURSAL" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-admin-border-primary/20 shadow-premium-lg">
                      {branches.map((branch) => (
                        <SelectItem
                          className="font-display font-medium text-[10px] tracking-widest uppercase"
                          key={branch.id}
                          value={branch.id}
                        >
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="h-10 w-px bg-admin-border-primary/10 hidden md:block mx-1" />

              <Select
                value={view}
                onValueChange={(value: "day" | "week" | "month") =>
                  setView(value)
                }
              >
                <SelectTrigger className="w-[90px] sm:w-[110px] md:w-[120px] h-9 sm:h-10 bg-white border-admin-border-primary/20 font-display font-bold text-[9px] sm:text-[10px] tracking-widest uppercase rounded-xl transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-admin-border-primary/20 shadow-premium-lg">
                  <SelectItem
                    className="font-display font-medium text-[9px] sm:text-[10px] tracking-widest uppercase"
                    value="day"
                  >
                    Día
                  </SelectItem>
                  <SelectItem
                    className="font-display font-medium text-[9px] sm:text-[10px] tracking-widest uppercase"
                    value="week"
                  >
                    Semana
                  </SelectItem>
                  <SelectItem
                    className="font-display font-medium text-[9px] sm:text-[10px] tracking-widest uppercase"
                    value="month"
                  >
                    Mes
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] sm:w-[160px] md:w-[180px] h-9 sm:h-10 bg-white border-admin-border-primary/20 font-display font-bold text-[9px] sm:text-[10px] tracking-widest uppercase rounded-xl transition-all">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-epoch-accent" />
                    <SelectValue placeholder="ESTADO" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-admin-border-primary/20 shadow-premium-lg">
                  <SelectItem
                    className="font-display font-medium text-[9px] sm:text-[10px] tracking-widest uppercase"
                    value="all"
                  >
                    <span className="hidden sm:inline">TODOS LOS ESTADOS</span>
                    <span className="sm:hidden">Todos</span>
                  </SelectItem>
                  <SelectItem
                    className="font-display font-medium text-[10px] tracking-widest uppercase text-admin-info"
                    value="scheduled"
                  >
                    PROGRAMADAS
                  </SelectItem>
                  <SelectItem
                    className="font-display font-medium text-[10px] tracking-widest uppercase text-admin-success"
                    value="confirmed"
                  >
                    CONFIRMADAS
                  </SelectItem>
                  <SelectItem
                    className="font-display font-medium text-[10px] tracking-widest uppercase text-epoch-primary"
                    value="completed"
                  >
                    COMPLETADAS
                  </SelectItem>
                  <SelectItem
                    className="font-display font-medium text-[10px] tracking-widest uppercase text-admin-error"
                    value="cancelled"
                  >
                    CANCELADAS
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Agenda Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar Mini-Dashboard */}
        <div className="space-y-6 xl:col-span-1">
          <Card className="border-none bg-admin-bg-tertiary shadow-soft overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-admin-text-primary uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4 text-admin-accent-primary" />
                Resumen de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-admin-info/5 p-3 rounded-xl border border-admin-info/10">
                  <p className="text-[9px] font-bold text-admin-info uppercase">
                    Total Citas
                  </p>
                  <p className="text-xl font-black text-admin-info">
                    {appointments.length}
                  </p>
                </div>
                <div className="bg-admin-success/5 p-3 rounded-xl border border-admin-success/10">
                  <p className="text-[9px] font-bold text-admin-success uppercase">
                    Confirmadas
                  </p>
                  <p className="text-xl font-black text-admin-success">
                    {
                      appointments.filter((a) => a.status === "confirmed")
                        .length
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest px-1">
                  Próximos Bloques
                </p>
                <div className="space-y-2">
                  {appointments
                    .filter(
                      (a) =>
                        new Date(
                          a.appointment_date + "T12:00:00",
                        ).toDateString() === new Date().toDateString(),
                    )
                    .sort((a, b) =>
                      a.appointment_time.localeCompare(b.appointment_time),
                    )
                    .slice(0, 3)
                    .map((apt) => (
                      <div
                        className="flex items-center gap-3 p-2 rounded-lg bg-admin-bg-tertiary/20 border border-admin-border-primary/30 hover:bg-white transition-all cursor-pointer"
                        key={apt.id}
                        onClick={() => handleAppointmentClick(apt)}
                      >
                        <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm text-admin-accent-primary">
                          {apt.appointment_time.substring(0, 5)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-admin-text-primary truncate">
                            {apt.customer
                              ? `${apt.customer.first_name} ${apt.customer.last_name}`
                              : `${apt.guest_first_name} ${apt.guest_last_name}`}
                          </p>
                          <p className="text-[9px] text-admin-text-tertiary truncate uppercase">
                            {getAppointmentTypeLabel(apt.appointment_type)}
                          </p>
                        </div>
                      </div>
                    ))}
                  {appointments.filter(
                    (a) =>
                      new Date(
                        a.appointment_date + "T12:00:00",
                      ).toDateString() === new Date().toDateString(),
                  ).length === 0 && (
                    <p className="text-[10px] text-admin-text-tertiary italic p-4 text-center">
                      No hay citas para hoy
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-admin-bg-tertiary shadow-soft overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-admin-text-primary uppercase tracking-widest flex items-center gap-2">
                <Settings className="h-4 w-4 text-admin-info" />
                Herramientas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button
                className="w-full justify-start text-xs font-bold text-admin-text-secondary hover:text-admin-accent-primary hover:bg-admin-accent-primary/5 rounded-lg h-9"
                variant="ghost"
                onClick={() => {
                  setLastRefresh(Date.now());
                  fetchAppointments();
                  toast.info("Datos sincronizados");
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Sincronizar Datos
              </Button>
              <Button
                className="w-full justify-start text-xs font-bold text-admin-text-secondary hover:text-admin-accent-primary hover:bg-admin-accent-primary/5 rounded-lg h-9"
                variant="ghost"
                onClick={() => setShowWeeklyReport(true)}
              >
                <FileText className="h-3.5 w-3.5 mr-2" />
                Reporte Semanal
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Calendar View - Main Area */}
        <Card
          className="xl:col-span-3 border-none bg-admin-bg-tertiary shadow-soft overflow-hidden min-h-[600px]"
          data-tour="appointments-calendar"
        >
          <CardContent className="p-0">
            {loading ? (
              <div className="p-1 space-y-1 animate-in fade-in duration-500">
                <div className="grid grid-cols-7 gap-1 border-b border-admin-border-primary/10 pb-1">
                  {[...Array(7)].map((_, i) => (
                    <div className="p-4 space-y-2" key={i}>
                      <Skeleton className="h-4 w-12 mx-auto opacity-40" />
                      <Skeleton className="h-6 w-8 mx-auto" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 h-[500px]">
                  {[...Array(7)].map((_, col) => (
                    <div
                      className="border-r border-admin-border-primary/5 last:border-0 p-2 space-y-3"
                      key={col}
                    >
                      {[...Array(6)].map((_, row) => (
                        <Skeleton
                          className={cn(
                            "h-16 w-full opacity-[0.03]",
                            row % 3 === 0 && "opacity-10",
                          )}
                          key={row}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-1">
                <AppointmentCalendar
                  appointments={appointments}
                  currentDate={currentDate}
                  lastRefresh={lastRefresh}
                  scheduleSettings={scheduleSettings}
                  view={view}
                  onAppointmentClick={handleAppointmentClick}
                  onDateChange={setCurrentDate}
                  onSlotClick={handleSlotClick}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Appointment Dialog */}
      <Dialog
        open={showCreateAppointment}
        onOpenChange={setShowCreateAppointment}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-hidden border-2 border-admin-border-primary/20 bg-white shadow-premium-xl rounded-xl p-0 flex flex-col">
          <div className="p-0 flex flex-col min-h-0 flex-1 overflow-hidden">
            <DialogHeader className="p-4 sm:p-6 md:p-8 bg-admin-bg-tertiary border-b border-admin-border-primary/10 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-epoch-primary flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-white" />
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                  {selectedAppointment ? "Expediente de cita" : "Reservar cita"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-[11px] font-serif italic text-admin-text-tertiary tracking-wide pl-13">
                {selectedAppointment
                  ? "Modifique los parámetros técnicos de la sesión seleccionada en el archivo maestro."
                  : "Ingrese las especificaciones para agendar una nueva consulta en el ciclo óptico."}
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 sm:p-6 md:p-8 flex-1 min-h-0 flex flex-col overflow-hidden">
              <CreateAppointmentForm
                effectiveBranchId={
                  isGlobalView && selectedBranchForView
                    ? selectedBranchForView
                    : undefined
                }
                initialCustomerId={undefined}
                initialData={
                  selectedAppointment || prefilledAppointmentData || undefined
                }
                lockDateTime={prefilledAppointmentData?.lockDateTime || false}
                onCancel={() => {
                  setShowCreateAppointment(false);
                  setSelectedAppointment(null);
                  setPrefilledAppointmentData(null);
                }}
                onSuccess={handleAppointmentCreated}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Detail Dialog */}
      {selectedAppointment && !showCreateAppointment && (
        <Dialog
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
        >
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg border-2 border-admin-border-primary/20 bg-white shadow-premium-xl rounded-xl p-0 overflow-hidden">
            <div className="bg-admin-bg-tertiary p-8 border-b border-admin-border-primary/10">
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-epoch-primary flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <DialogTitle className="text-2xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
                      DETALLES TÉCNICOS
                    </DialogTitle>
                  </div>
                  {getStatusBadge(selectedAppointment.status)}
                </div>
                <DialogDescription className="text-[10px] font-serif italic text-admin-text-tertiary tracking-widest pl-13">
                  EXPEDIENTE ID: {selectedAppointment.id.substring(0, 8)} •
                  REGISTRO DE ARCHIVO
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-8 space-y-8">
              {/* Customer Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-4 bg-admin-accent-primary rounded-full" />
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                    Información del Cliente
                  </p>
                </div>

                <div className="pl-6 space-y-3">
                  {selectedAppointment.customer ? (
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-admin-text-primary">
                        {selectedAppointment.customer.first_name}{" "}
                        {selectedAppointment.customer.last_name}
                      </p>
                      <div className="flex flex-col gap-1">
                        {selectedAppointment.customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-admin-text-secondary">
                            <span className="opacity-50">📞</span>{" "}
                            {selectedAppointment.customer.phone}
                          </div>
                        )}
                        {selectedAppointment.customer.email && (
                          <div className="flex items-center gap-2 text-sm text-admin-text-secondary">
                            <span className="opacity-50">✉️</span>{" "}
                            {selectedAppointment.customer.email}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-admin-text-primary">
                        {selectedAppointment.guest_first_name}{" "}
                        {selectedAppointment.guest_last_name}
                      </p>
                      <div className="flex flex-col gap-1">
                        {selectedAppointment.guest_rut && (
                          <div className="flex items-center gap-2 text-sm text-admin-text-secondary italic">
                            <span className="opacity-50">🆔</span> RUT:{" "}
                            {selectedAppointment.guest_rut}
                          </div>
                        )}
                        {selectedAppointment.guest_phone && (
                          <div className="flex items-center gap-2 text-sm text-admin-text-secondary">
                            <span className="opacity-50">📞</span>{" "}
                            {selectedAppointment.guest_phone}
                          </div>
                        )}
                        <p className="text-[10px] font-bold text-admin-error mt-2 uppercase tracking-tight bg-admin-error/5 px-2 py-1 rounded inline-block">
                          Cliente no registrado en base de datos
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule Details Grid */}
              <div className="grid grid-cols-2 gap-6 bg-admin-bg-tertiary/30 p-5 rounded-2xl border border-admin-border-primary/30">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider">
                    Fecha y Hora
                  </p>
                  <p className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-admin-accent-primary" />
                    {new Date(
                      selectedAppointment.appointment_date + "T12:00:00",
                    ).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    • {selectedAppointment.appointment_time}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider">
                    Servicio / Tipo
                  </p>
                  <div className="flex items-center gap-2 text-sm font-bold text-admin-text-primary">
                    {(() => {
                      const Icon = getAppointmentTypeIcon(
                        selectedAppointment.appointment_type,
                      );
                      return <Icon className="h-3.5 w-3.5 text-admin-info" />;
                    })()}
                    <span>
                      {getAppointmentTypeLabel(
                        selectedAppointment.appointment_type,
                      )}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider">
                    Duración
                  </p>
                  <p className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-admin-text-tertiary" />
                    {selectedAppointment.duration_minutes} min
                  </p>
                </div>
              </div>

              {/* Status Update Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-4 bg-admin-info rounded-full" />
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                    Gestión de Estado
                  </p>
                </div>
                <div className="flex items-center gap-3 pl-6">
                  <Select
                    value={selectedAppointment.status}
                    onValueChange={async (newStatus) => {
                      // Validate that newStatus is a valid appointment status
                      const validStatuses = [
                        "scheduled",
                        "confirmed",
                        "completed",
                        "cancelled",
                        "no_show",
                      ] as const;
                      if (
                        !validStatuses.includes(
                          newStatus as (typeof validStatuses)[number],
                        )
                      ) {
                        toast.error("Estado inválido");
                        return;
                      }
                      try {
                        await appointmentService.updateAppointment(
                          selectedAppointment.id,
                          {
                            status: newStatus as
                              | "scheduled"
                              | "confirmed"
                              | "completed"
                              | "cancelled"
                              | "no_show",
                          },
                        );
                        setSelectedAppointment({
                          ...selectedAppointment,
                          status: newStatus,
                        });
                        fetchAppointments();
                        if (newStatus === "completed") {
                          toast.success(
                            "Cita completada. El cliente ha sido registrado exitosamente en la base de datos de esta sucursal.",
                          );
                        } else {
                          toast.success("Estado actualizado");
                        }
                      } catch (error) {
                        toast.error("Error al actualizar");
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 h-11 rounded-xl border-admin-border-primary/50 font-bold text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-admin-border-primary">
                      <SelectItem className="text-admin-info" value="scheduled">
                        Programada
                      </SelectItem>
                      <SelectItem
                        className="text-admin-success"
                        value="confirmed"
                      >
                        Confirmada
                      </SelectItem>
                      <SelectItem
                        className="text-admin-accent-secondary"
                        value="completed"
                      >
                        Completada
                      </SelectItem>
                      <SelectItem
                        className="text-admin-error"
                        value="cancelled"
                      >
                        Cancelada
                      </SelectItem>
                      <SelectItem
                        className="text-admin-text-tertiary"
                        value="no_show"
                      >
                        No se presentó
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="h-11 w-11 rounded-xl text-admin-error hover:bg-admin-error hover:text-white transition-all border border-admin-error/20"
                    size="icon"
                    variant="ghost"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("¿Eliminar cita permanentemente?")) return;
                      try {
                        await appointmentService.deleteAppointment(
                          selectedAppointment.id,
                        );
                        toast.success("Cita eliminada");
                        setSelectedAppointment(null);
                        fetchAppointments();
                      } catch (error) {
                        toast.error("Error al eliminar");
                      }
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Notes & Reason */}
              {(selectedAppointment.reason || selectedAppointment.notes) && (
                <div className="bg-admin-bg-tertiary/10 p-5 rounded-2xl space-y-4">
                  {selectedAppointment.reason && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider text-admin-info">
                        Motivo
                      </p>
                      <p className="text-sm font-medium text-admin-text-primary leading-relaxed">
                        {selectedAppointment.reason}
                      </p>
                    </div>
                  )}
                  {selectedAppointment.notes && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider text-admin-accent-primary">
                        Observaciones
                      </p>
                      <p className="text-sm font-medium text-admin-text-primary leading-relaxed italic">
                        {selectedAppointment.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-admin-border-primary/30">
                <Button
                  className="flex-1 h-12 rounded-xl border-admin-border-primary hover:bg-admin-bg-tertiary font-bold transition-all text-sm uppercase tracking-wide"
                  variant="outline"
                  onClick={() => setShowCreateAppointment(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Editar Datos
                </Button>
                {selectedAppointment.customer?.id && (
                  <Link
                    className="flex-1"
                    href={`/admin/customers/${selectedAppointment.customer.id}`}
                  >
                    <Button className="w-full h-12 rounded-xl bg-admin-accent-primary hover:bg-admin-accent-secondary font-bold transition-all uppercase tracking-wide text-sm flex items-center justify-center gap-2">
                      Ficha Cliente
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Weekly Report Dialog */}
      <Dialog open={showWeeklyReport} onOpenChange={setShowWeeklyReport}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-admin-border-primary/20 bg-admin-bg-secondary shadow-premium-xl rounded-xl p-0 print:overflow-visible print:max-h-none">
          <div
            className="p-8 space-y-8 print:p-4 print:max-w-none"
            id="weekly-report-print"
            ref={weeklyReportRef}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:flex-row">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-admin-accent-primary/10 rounded-xl flex items-center justify-center">
                    <FileText className="h-6 w-6 text-admin-accent-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-admin-text-primary">
                      Reporte Semanal de Citas
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-admin-text-tertiary uppercase tracking-widest mt-1">
                      {(() => {
                        const data = getWeeklyReportData();
                        return `${data.start.toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                        })} - ${data.end.toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}`;
                      })()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div data-print-hide className="flex gap-2 print:hidden">
                <Button
                  className="gap-2"
                  size="sm"
                  variant="outline"
                  onClick={handlePrintWeeklyReport}
                >
                  <FileText className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWeeklyReport(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>

            {(() => {
              const data = getWeeklyReportData();
              return (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-4 rounded-xl bg-admin-bg-tertiary/30 border border-admin-border-primary/20 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-admin-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-[9px] font-bold text-admin-text-tertiary uppercase tracking-[0.2em] relative z-10">
                        Total
                      </p>
                      <p className="text-2xl font-display font-bold text-admin-text-primary relative z-10">
                        {data.appointments.length}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-admin-info/5 border border-admin-info/10 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-admin-info/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-[9px] font-bold text-admin-text-tertiary uppercase tracking-[0.2em] relative z-10">
                        Programadas
                      </p>
                      <p className="text-2xl font-display font-bold text-admin-info relative z-10">
                        {data.byStatus.scheduled}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-admin-success/5 border border-admin-success/10 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-admin-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-[9px] font-bold text-admin-text-tertiary uppercase tracking-[0.2em] relative z-10">
                        Confirmadas
                      </p>
                      <p className="text-2xl font-display font-bold text-admin-success relative z-10">
                        {data.byStatus.confirmed}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-admin-accent-secondary/5 border border-admin-accent-secondary/10 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-admin-accent-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-[9px] font-bold text-admin-text-tertiary uppercase tracking-[0.2em] relative z-10">
                        Completadas
                      </p>
                      <p className="text-2xl font-display font-bold text-admin-accent-secondary relative z-10">
                        {data.byStatus.completed}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-admin-error/5 border border-admin-error/10 col-span-2 sm:col-span-1 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-admin-error/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-[9px] font-bold text-admin-text-tertiary uppercase tracking-[0.2em] relative z-10">
                        Canceladas / No asistió
                      </p>
                      <p className="text-2xl font-display font-bold text-admin-error relative z-10">
                        {data.byStatus.cancelled + data.byStatus.no_show}
                      </p>
                    </div>
                  </div>

                  {/* Daily breakdown */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Detalle por día
                    </p>
                    <div className="space-y-4">
                      {[
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                        "Domingo",
                      ].map((day) => {
                        const dayApts = data.byDay[day] || [];
                        if (dayApts.length === 0) return null;
                        const dateStr = dayApts[0]?.appointment_date;
                        return (
                          <div
                            className="border border-admin-border-primary/30 rounded-xl overflow-hidden"
                            key={day}
                          >
                            <div className="px-4 py-2 bg-admin-bg-tertiary/50 border-b border-admin-border-primary/30 flex justify-between items-center">
                              <span className="font-bold text-sm text-admin-text-primary">
                                {day}{" "}
                                {dateStr &&
                                  new Date(
                                    dateStr + "T12:00:00",
                                  ).toLocaleDateString("es-CL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                              </span>
                              <span className="text-xs font-medium text-admin-text-tertiary">
                                {dayApts.length} cita
                                {dayApts.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="divide-y divide-admin-border-primary/20">
                              {dayApts.map((apt) => (
                                <div
                                  className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-admin-bg-tertiary/20"
                                  key={apt.id}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-mono font-bold text-admin-text-tertiary shrink-0">
                                      {apt.appointment_time.substring(0, 5)}
                                    </span>
                                    <span className="text-sm font-medium text-admin-text-primary truncate">
                                      {apt.customer
                                        ? `${apt.customer.first_name} ${apt.customer.last_name}`
                                        : `${apt.guest_first_name} ${apt.guest_last_name}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-admin-text-tertiary">
                                      {getAppointmentTypeLabel(
                                        apt.appointment_type,
                                      )}
                                    </span>
                                    {getStatusBadge(apt.status)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {data.appointments.length === 0 && (
                      <p className="text-center py-12 text-admin-text-tertiary italic">
                        No hay citas en esta semana
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
