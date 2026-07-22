"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appointmentService } from "@/lib/api/services";

import type { Appointment } from "./appointmentsUtils";

interface AppointmentStatusSectionProps {
  appointment: Appointment;
  onAppointmentChange?: (appointment: Appointment) => void;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentStatusSection({
  appointment,
  onAppointmentChange,
  onOpenChange,
}: AppointmentStatusSectionProps) {
  const queryClient = useQueryClient();

  return (
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
              await appointmentService.updateAppointment(appointment.id, {
                status: newStatus as
                  | "scheduled"
                  | "confirmed"
                  | "completed"
                  | "cancelled"
                  | "no_show",
              });
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
            <SelectItem className="text-admin-success" value="confirmed">
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
            <SelectItem className="text-admin-text-tertiary" value="no_show">
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
  );
}
