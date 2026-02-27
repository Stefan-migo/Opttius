"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";

interface AppointmentItem {
  id: string;
  customer_name: string;
  appointment_time: string;
  appointment_type: string | null;
  status: string;
  duration_minutes: number;
}

interface AppointmentsListProps {
  appointments: AppointmentItem[];
  formatTime: (time: string) => string;
  getAppointmentStatusBadge: (status: string) => React.ReactNode;
}

export function AppointmentsList({
  appointments,
  formatTime,
  getAppointmentStatusBadge,
}: AppointmentsListProps) {
  return (
    <Card className="border-none bg-admin-bg-tertiary/50 rounded-xl shadow-none group transition-all duration-300">
      <CardHeader className="pb-4 border-b border-admin-border-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center">
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
              className="h-9 px-4 font-display font-bold text-[10px] text-epoch-primary hover:bg-epoch-primary/5 rounded-xl group transition-all tracking-widest uppercase"
            >
              GESTIONAR AGENDA
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-admin-border-primary/5">
          {appointments.length > 0 ? (
            appointments.map((appointment) => (
              <Link
                key={appointment.id}
                href="/admin/appointments"
                className="group flex items-center p-6 hover:bg-admin-bg-tertiary/60 active:bg-admin-bg-tertiary/70 transition-all duration-300 relative overflow-hidden border-l-2 border-l-transparent hover:border-l-epoch-accent/50 block"
              >
                <div className="flex-shrink-0 mr-6 text-center min-w-[70px] pr-6">
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

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <span className="inline-flex h-8 w-8 items-center justify-center text-admin-text-tertiary group-hover:text-admin-text-primary rounded-xl">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex items-center justify-center gap-3 h-[72px] sm:h-[300px] text-center p-4 sm:p-8 sm:flex-col">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-admin-bg-tertiary border border-admin-border-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-admin-text-tertiary/20" />
              </div>
              <div className="text-left sm:text-center">
                <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Tranquilidad absoluta para este ciclo
                </p>
                <p className="text-[11px] font-serif italic text-admin-text-tertiary/60 mt-0.5 sm:mt-2">
                  No hay registros de citas programadas para el día de hoy.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
