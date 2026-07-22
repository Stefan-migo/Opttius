"use client";

import { ArrowRight, CalendarDays, Clock, Settings, User } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { AppointmentStatusSection } from "./AppointmentStatusSection";
import {
  Appointment,
  getAppointmentTypeIcon,
  getAppointmentTypeLabel,
  getStatusBadge,
} from "./appointmentsUtils";

interface AppointmentDetailDialogProps {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onAppointmentChange?: (appointment: Appointment) => void;
}

export function AppointmentDetailDialog({
  appointment,
  open,
  onOpenChange,
  onEdit,
  onAppointmentChange,
}: AppointmentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              {getStatusBadge(appointment.status)}
            </div>
            <DialogDescription className="text-[10px] font-serif italic text-admin-text-tertiary tracking-widest pl-13">
              EXPEDIENTE ID: {appointment.id.substring(0, 8)} • REGISTRO DE
              ARCHIVO
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
              {appointment.customer ? (
                <div className="space-y-1">
                  <p className="text-lg font-bold text-admin-text-primary">
                    {appointment.customer.first_name}{" "}
                    {appointment.customer.last_name}
                  </p>
                  <div className="flex flex-col gap-1">
                    {appointment.customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-admin-text-secondary">
                        <span className="opacity-50">📞</span>{" "}
                        {appointment.customer.phone}
                      </div>
                    )}
                    {appointment.customer.email && (
                      <div className="flex items-center gap-2 text-sm text-admin-text-secondary">
                        <span className="opacity-50">✉️</span>{" "}
                        {appointment.customer.email}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-lg font-bold text-admin-text-primary">
                    {appointment.guest_first_name} {appointment.guest_last_name}
                  </p>
                  <div className="flex flex-col gap-1">
                    {appointment.guest_rut && (
                      <div className="flex items-center gap-2 text-sm text-admin-text-secondary italic">
                        <span className="opacity-50">🆔</span> RUT:{" "}
                        {appointment.guest_rut}
                      </div>
                    )}
                    {appointment.guest_phone && (
                      <div className="flex items-center gap-2 text-sm text-admin-text-secondary">
                        <span className="opacity-50">📞</span>{" "}
                        {appointment.guest_phone}
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
                  appointment.appointment_date + "T12:00:00",
                ).toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                • {appointment.appointment_time}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider">
                Servicio / Tipo
              </p>
              <div className="flex items-center gap-2 text-sm font-bold text-admin-text-primary">
                {(() => {
                  const Icon = getAppointmentTypeIcon(
                    appointment.appointment_type,
                  );
                  return <Icon className="h-3.5 w-3.5 text-admin-info" />;
                })()}
                <span>
                  {getAppointmentTypeLabel(appointment.appointment_type)}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider">
                Duración
              </p>
              <p className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-admin-text-tertiary" />
                {appointment.duration_minutes} min
              </p>
            </div>
          </div>

          <AppointmentStatusSection
            appointment={appointment}
            onAppointmentChange={onAppointmentChange}
            onOpenChange={onOpenChange}
          />

          {/* Notes & Reason */}
          {(appointment.reason || appointment.notes) && (
            <div className="bg-admin-bg-tertiary/10 p-5 rounded-2xl space-y-4">
              {appointment.reason && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider text-admin-info">
                    Motivo
                  </p>
                  <p className="text-sm font-medium text-admin-text-primary leading-relaxed">
                    {appointment.reason}
                  </p>
                </div>
              )}
              {appointment.notes && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider text-admin-accent-primary">
                    Observaciones
                  </p>
                  <p className="text-sm font-medium text-admin-text-primary leading-relaxed italic">
                    {appointment.notes}
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
              onClick={onEdit}
            >
              <Settings className="h-4 w-4 mr-2" />
              Editar Datos
            </Button>
            {appointment.customer?.id && (
              <Link
                className="flex-1"
                href={`/admin/customers/${appointment.customer.id}`}
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
  );
}
