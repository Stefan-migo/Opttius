"use client";

import { CalendarDays } from "lucide-react";

import CreateAppointmentForm from "@/components/admin/CreateAppointmentForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Appointment } from "./appointmentsUtils";

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAppointment: Appointment | null;
  prefilledAppointmentData: Record<string, unknown> | null;
  isGlobalView: boolean;
  selectedBranchForView: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  selectedAppointment,
  prefilledAppointmentData,
  isGlobalView,
  selectedBranchForView,
  onCancel,
  onSuccess,
}: CreateAppointmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              lockDateTime={prefilledAppointmentData?.lockDateTime === true}
              onCancel={onCancel}
              onSuccess={onSuccess}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
