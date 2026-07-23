"use client";

import dynamic from "next/dynamic";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Appointment, Prescription } from "@/lib/api/services";

const CreatePrescriptionForm = dynamic(
  () => import("@/components/admin/CreatePrescriptionForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary" />
      </div>
    ),
    ssr: false,
  },
);

const CreateAppointmentForm = dynamic(
  () => import("@/components/admin/CreateAppointmentForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary" />
      </div>
    ),
    ssr: false,
  },
);

const CreateQuoteForm = dynamic(
  () => import("@/components/admin/CreateQuoteForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary" />
      </div>
    ),
    ssr: false,
  },
);

interface CustomerDetailDialogsProps {
  customerId: string;
  showCreatePrescription: boolean;
  editingPrescription: Prescription | null;
  showCreateAppointment: boolean;
  editingAppointment: Appointment | null;
  showCreateQuote: boolean;
  fieldOperationId?: string;
  onClosePrescription: () => void;
  onCloseAppointment: () => void;
  onCloseQuote: () => void;
  onSuccess: () => void;
}

export function CustomerDetailDialogs({
  customerId,
  showCreatePrescription,
  editingPrescription,
  showCreateAppointment,
  editingAppointment,
  showCreateQuote,
  fieldOperationId,
  onClosePrescription,
  onCloseAppointment,
  onCloseQuote,
  onSuccess,
}: CustomerDetailDialogsProps) {
  return (
    <>
      <Dialog
        open={showCreatePrescription}
        onOpenChange={(open) => {
          if (!open) onClosePrescription();
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-7xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>
              {editingPrescription ? "Editar Receta" : "Nueva Receta"}
            </DialogTitle>
            <DialogDescription>
              {editingPrescription
                ? "Modifica los datos de la receta oftalmológica"
                : "Crea una nueva receta oftalmológica para este cliente"}
            </DialogDescription>
          </DialogHeader>
          <CreatePrescriptionForm
            customerId={customerId}
            initialData={editingPrescription || undefined}
            onCancel={onClosePrescription}
            onSuccess={onSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreateAppointment}
        onOpenChange={(open) => {
          if (!open) onCloseAppointment();
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? "Editar Cita" : "Nueva Cita"}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment
                ? "Modifica los detalles de la cita"
                : "Crea una nueva cita para este cliente"}
            </DialogDescription>
          </DialogHeader>
          <CreateAppointmentForm
            initialCustomerId={customerId}
            initialData={editingAppointment || undefined}
            onCancel={onCloseAppointment}
            onSuccess={onSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreateQuote}
        onOpenChange={(open) => {
          if (!open) onCloseQuote();
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
            <DialogDescription>
              Crea un presupuesto para este cliente
            </DialogDescription>
          </DialogHeader>
          <CreateQuoteForm
            initialCustomerId={customerId}
            initialFieldOperationId={fieldOperationId}
            onCancel={onCloseQuote}
            onSuccess={onSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
