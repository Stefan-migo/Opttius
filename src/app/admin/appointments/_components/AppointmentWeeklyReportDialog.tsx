"use client";

import { FileText } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Appointment,
  getAppointmentTypeLabel,
  getStatusBadge,
  getWeeklyReportData,
  handlePrintWeeklyReport,
} from "./appointmentsUtils";

interface AppointmentWeeklyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
  appointments: Appointment[];
}

export function AppointmentWeeklyReportDialog({
  open,
  onOpenChange,
  currentDate,
  appointments,
}: AppointmentWeeklyReportDialogProps) {
  const weeklyReportRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                onClick={() => onOpenChange(false)}
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
  );
}
