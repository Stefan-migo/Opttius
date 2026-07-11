"use client";

import { CalendarDays } from "lucide-react";
import dynamic from "next/dynamic";

import { AppointmentDetailDialog } from "./AppointmentDetailDialog";
import { AppointmentsFilters } from "./AppointmentsFilters";
import { AppointmentsHeader } from "./AppointmentsHeader";
import { AppointmentsSidebar } from "./AppointmentsSidebar";
import { AppointmentWeeklyReportDialog } from "./AppointmentWeeklyReportDialog";
import {
  Appointment,
  getMondayOfWeek,
  goToToday,
  handleSlotClick,
  navigateDate,
} from "./appointmentsUtils";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
      <AppointmentWeeklyReportDialog
        open={showWeeklyReport}
        onOpenChange={setShowWeeklyReport}
        currentDate={currentDate}
        appointments={appointments}
      />
    </div>
  );
}
