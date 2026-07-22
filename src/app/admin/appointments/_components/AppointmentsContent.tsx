"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import { cn } from "@/lib/utils";

import { useAppointments } from "../../hooks/useAppointments";
import { useAppointmentSettings } from "../../hooks/useAppointmentSettings";
import { AppointmentDetailDialog } from "./AppointmentDetailDialog";
import { AppointmentsFilters } from "./AppointmentsFilters";
import { AppointmentsHeader } from "./AppointmentsHeader";
import { AppointmentsSidebar } from "./AppointmentsSidebar";
import {
  Appointment,
  getMondayOfWeek,
  goToToday,
  handleSlotClick,
  navigateDate,
} from "./appointmentsUtils";
import { AppointmentWeeklyReportDialog } from "./AppointmentWeeklyReportDialog";
import { CreateAppointmentDialog } from "./CreateAppointmentDialog";

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

  const {
    data: _appointmentsData,
    isLoading: loading,
    refetch,
  } = useAppointments({
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
        branches={branches}
        currentDate={currentDate}
        isGlobalView={isGlobalView}
        isSuperAdmin={isSuperAdmin}
        selectedBranchForView={selectedBranchForView}
        statusFilter={statusFilter}
        view={view}
        weekLabelDate={weekLabelDate}
        onBranchChange={(v) => setSelectedBranchForView(v)}
        onGoToToday={() => goToToday(setCurrentDate)}
        onNavigateNext={() =>
          navigateDate(currentDate, view, "next", setCurrentDate)
        }
        onNavigatePrev={() =>
          navigateDate(currentDate, view, "prev", setCurrentDate)
        }
        onStatusFilterChange={setStatusFilter}
        onViewChange={(v) => setView(v)}
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

      <CreateAppointmentDialog
        isGlobalView={isGlobalView}
        open={showCreateAppointment}
        prefilledAppointmentData={prefilledAppointmentData}
        selectedAppointment={selectedAppointment}
        selectedBranchForView={selectedBranchForView}
        onCancel={() => {
          setShowCreateAppointment(false);
          setSelectedAppointment(null);
          setPrefilledAppointmentData(null);
        }}
        onOpenChange={setShowCreateAppointment}
        onSuccess={handleAppointmentCreated}
      />

      {/* Appointment Detail Dialog */}
      {selectedAppointment && !showCreateAppointment && (
        <AppointmentDetailDialog
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onAppointmentChange={(updated) => setSelectedAppointment(updated)}
          onEdit={() => setShowCreateAppointment(true)}
          onOpenChange={() => setSelectedAppointment(null)}
        />
      )}

      {/* Weekly Report Dialog */}
      <AppointmentWeeklyReportDialog
        appointments={appointments}
        currentDate={currentDate}
        open={showWeeklyReport}
        onOpenChange={setShowWeeklyReport}
      />
    </div>
  );
}
