"use client";

import { Activity, FileText, RefreshCw, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Appointment, getAppointmentTypeLabel } from "./appointmentsUtils";

interface AppointmentsSidebarProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onRefresh: () => void;
  onShowWeeklyReport: () => void;
}

export function AppointmentsSidebar({
  appointments,
  onAppointmentClick,
  onRefresh,
  onShowWeeklyReport,
}: AppointmentsSidebarProps) {
  return (
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
                {appointments.filter((a) => a.status === "confirmed").length}
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
                    new Date(a.appointment_date + "T12:00:00").toDateString() ===
                    new Date().toDateString(),
                )
                .sort((a, b) =>
                  a.appointment_time.localeCompare(b.appointment_time),
                )
                .slice(0, 3)
                .map((apt) => (
                  <div
                    className="flex items-center gap-3 p-2 rounded-lg bg-admin-bg-tertiary/20 border border-admin-border-primary/30 hover:bg-white transition-all cursor-pointer"
                    key={apt.id}
                    onClick={() => onAppointmentClick(apt)}
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
                  new Date(a.appointment_date + "T12:00:00").toDateString() ===
                  new Date().toDateString(),
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
            onClick={onRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Sincronizar Datos
          </Button>
          <Button
            className="w-full justify-start text-xs font-bold text-admin-text-secondary hover:text-admin-accent-primary hover:bg-admin-accent-primary/5 rounded-lg h-9"
            variant="ghost"
            onClick={onShowWeeklyReport}
          >
            <FileText className="h-3.5 w-3.5 mr-2" />
            Reporte Semanal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
