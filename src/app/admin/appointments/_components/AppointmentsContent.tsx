"use client";

import { CalendarDays, FileText } from "lucide-react";
import dynamic from "next/dynamic";

import { AppointmentDetailDialog } from "./AppointmentDetailDialog";
import { AppointmentsFilters } from "./AppointmentsFilters";
import { AppointmentsHeader } from "./AppointmentsHeader";
import { AppointmentsSidebar } from "./AppointmentsSidebar";
import {
  Appointment,
  getMondayOfWeek,
  getAppointmentTypeLabel,
  getStatusBadge,
  getWeeklyReportData,
  goToToday,
  handlePrintWeeklyReport,
  handleSlotClick,
  navigateDate,
} from "./appointmentsUtils";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAppointmentSettings } from "../../hooks/useAppointmentSettings";
import { useAppointments } from "../../hooks/useAppointments";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/useBranch";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthContext } from "@/contexts/AuthContext";

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

export default function AppointmentsContent() {
  const { user, loading: authLoading } = useAuthContext();
  const [view, setView] = useState<"day" | "week" | "month">("week");

  // Default to day view on mobile for better usability (only on initial mount)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setView("day");
    }
  }, []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [prefilledAppointmentData, setPrefilledAppointmentData] = useState<{
    date?: string;
    time?: string;
    lockDateTime?: boolean;
  } | null>(null);
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

  const queryClient = useQueryClient();

  const { data: _appointmentsData, isLoading: loading, refetch } =
    useAppointments({
      branchId: branchIdForFilter,
      view,
      currentDate,
      statusFilter,
      user,
      authLoading,
    });
  // ponytail: service Appointment[] lacks customer/guest fields; annotate with component type
  const appointments: Appointment[] = _appointmentsData ?? [];

  const { data: _scheduleSettings } = useAppointmentSettings({
    branchId: branchIdForFilter || currentBranchId || null,
    user,
    authLoading,
  });
  // ponytail: ScheduleSettings mismatch between service and calendar; keep any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scheduleSettings: any = _scheduleSettings ?? null;

  // Derived value
  const weekLabelDate =
    view === "week" ? getMondayOfWeek(currentDate) : currentDate;

  const handleAppointmentCreated = () => {
    setShowCreateAppointment(false);
    setSelectedAppointment(null);
    setPrefilledAppointmentData(null);

    setLastRefresh(Date.now());
    queryClient.invalidateQueries({ queryKey: ["admin", "appointments"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "schedule-settings"] });
    toast.success("Cita agendada correctamente");
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setPrefilledAppointmentData(null);
    setShowCreateAppointment(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <AppointmentsHeader
        onNewAppointment={() => {
          setSelectedAppointment(null);
          setPrefilledAppointmentData(null);
          setShowCreateAppointment(true);
        }}
      />

      <AppointmentsFilters
        view={view}
        statusFilter={statusFilter}
        currentDate={currentDate}
        weekLabelDate={weekLabelDate}
        isGlobalView={isGlobalView}
        isSuperAdmin={isSuperAdmin}
        selectedBranchForView={selectedBranchForView}
        branches={branches}
        onViewChange={(v) => setView(v)}
        onStatusFilterChange={setStatusFilter}
        onNavigatePrev={() =>
          navigateDate(currentDate, view, "prev", setCurrentDate)
        }
        onNavigateNext={() =>
          navigateDate(currentDate, view, "next", setCurrentDate)
        }
        onGoToToday={() => goToToday(setCurrentDate)}
        onBranchChange={(v) => setSelectedBranchForView(v)}
      />

      {/* Main Agenda Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar Mini-Dashboard */}
        <AppointmentsSidebar
          appointments={appointments}
          onAppointmentClick={handleAppointmentClick}
          onRefresh={() => {
            setLastRefresh(Date.now());
            queryClient.invalidateQueries({
              queryKey: ["admin", "appointments"],
            });
            toast.info("Datos sincronizados");
          }}
          onShowWeeklyReport={() => setShowWeeklyReport(true)}
        />

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
                  onSlotClick={(date, time) =>
                    handleSlotClick(
                      date,
                      time,
                      setSelectedAppointment,
                      setPrefilledAppointmentData,
                      setShowCreateAppointment,
                    )
                  }
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
                  {selectedAppointment
                    ? "Expediente de cita"
                    : "Reservar cita"}
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
        <AppointmentDetailDialog
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onOpenChange={() => setSelectedAppointment(null)}
          onEdit={() => setShowCreateAppointment(true)}
          onAppointmentChange={(updated) => setSelectedAppointment(updated)}
        />
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
                        const data = getWeeklyReportData(
                          currentDate,
                          appointments,
                        );
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
                  onClick={() => handlePrintWeeklyReport(weeklyReportRef)}
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
              const data = getWeeklyReportData(currentDate, appointments);
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
