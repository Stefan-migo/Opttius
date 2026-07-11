"use client";

import { ArrowRight, CalendarDays, Clock, Settings, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Appointment,
  getAppointmentTypeIcon,
  getAppointmentTypeLabel,
  getStatusBadge,
} from "./appointmentsUtils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { appointmentService } from "@/lib/api/services";

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
  const queryClient = useQueryClient();

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
                    {appointment.guest_first_name}{" "}
                    {appointment.guest_last_name}
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
                value={appointment.status}
                onValueChange={async (newStatus) => {
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
                      appointment.id,
                      {
                        status: newStatus as
                          | "scheduled"
                          | "confirmed"
                          | "completed"
                          | "cancelled"
                          | "no_show",
                      },
                    );
                    const updated = { ...appointment, status: newStatus };
                    onAppointmentChange?.(updated);
                    queryClient.invalidateQueries({
                      queryKey: ["admin", "appointments"],
                    });
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
                  <SelectItem className="text-admin-error" value="cancelled">
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
                    await appointmentService.deleteAppointment(appointment.id);
                    toast.success("Cita eliminada");
                    onOpenChange(false);
                    queryClient.invalidateQueries({
                      queryKey: ["admin", "appointments"],
                    });
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
