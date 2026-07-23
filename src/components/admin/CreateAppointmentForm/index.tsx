"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
// Hooks
import { useBranch } from "@/hooks/useBranch";
import { appLogger } from '@/lib/logger';

import AppointmentDetails from "./AppointmentDetails";
import BranchSelectorForm from "./BranchSelector";
// Components (will be created next)
import CustomerSelection from "./CustomerSelection";
import DateTimeSelection from "./DateTimeSelection";
import { useAppointmentForm } from "./hooks/useAppointmentForm";
import { useAvailability } from "./hooks/useAvailability";
import { useCustomerSearch } from "./hooks/useCustomerSearch";
import { useScheduleSettings } from "./hooks/useScheduleSettings";
// Types
import type { CreateAppointmentFormProps } from "./types/appointment.types";
import { APPOINTMENT_TYPES } from "./types/appointment.types";

export default function CreateAppointmentForm({
  onSuccess,
  onCancel,
  initialData,
  initialCustomerId,
  lockDateTime = false,
  effectiveBranchId,
}: CreateAppointmentFormProps) {
  const { currentBranchId, isSuperAdmin, branches } = useBranch();

  // For super_admin: show branch selector. Use form selection or parent's effectiveBranchId.
  const [formBranchId, setFormBranchId] = useState<string | null>(
    effectiveBranchId ?? null,
  );
  useEffect(() => {
    if (effectiveBranchId) setFormBranchId(effectiveBranchId);
  }, [effectiveBranchId]);
  useEffect(() => {
    if (isSuperAdmin && branches.length > 0 && !formBranchId) {
      setFormBranchId(effectiveBranchId ?? branches[0]?.id ?? null);
    }
  }, [isSuperAdmin, branches, effectiveBranchId, formBranchId]);

  const effectiveBranchForForm =
    effectiveBranchId ??
    formBranchId ??
    (isSuperAdmin ? null : currentBranchId);

  const scheduleSettingsHook = useScheduleSettings({
    effectiveBranchId: effectiveBranchForForm,
  });
  const customerSearchHook = useCustomerSearch({
    initialData,
    initialCustomerId,
    currentBranchId: effectiveBranchForForm ?? currentBranchId,
  });
  const availabilityHook = useAvailability({
    scheduleSettings: scheduleSettingsHook.settings,
    effectiveBranchId: effectiveBranchForForm,
  });
  const appointmentFormHook = useAppointmentForm({
    initialData,
    scheduleSettings: scheduleSettingsHook.settings,
    effectiveBranchId: effectiveBranchForForm,
  });

  // Load availability when date or duration changes
  useEffect(() => {
    if (
      appointmentFormHook.formData.appointment_date &&
      scheduleSettingsHook.settings
    ) {
      // Add a small delay to ensure state is ready
      const timer = setTimeout(() => {
        appLogger.info("⏰ Calling fetchAvailability after delay");
        availabilityHook.fetchAvailability(
          appointmentFormHook.formData.appointment_date,
          appointmentFormHook.formData.duration_minutes,
        );
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    appointmentFormHook.formData.appointment_date,
    appointmentFormHook.formData.duration_minutes,
    scheduleSettingsHook.settings,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate customer first
      const customerValidation = customerSearchHook.validateCustomer();
      if (!customerValidation.isValid) {
        Object.values(customerValidation.errors).forEach((error) =>
          toast.error(error),
        );
        return;
      }

      // Handle form submission
      const success = await appointmentFormHook.handleSubmit(
        e,
        customerSearchHook.selectedCustomer,
        customerSearchHook.isGuestCustomer,
        customerSearchHook.guestCustomerData,
        onSuccess,
        lockDateTime,
      );

      if (success) {
        if (appointmentFormHook.formData.status === "completed") {
          toast.success(
            "Cita completada. El cliente ha sido registrado exitosamente en la base de datos de esta sucursal.",
          );
        } else {
          toast.success(
            initialData?.id
              ? "Cita actualizada exitosamente"
              : "Cita creada exitosamente",
          );
        }
        onSuccess();
      }
    } catch (error: unknown) {
      appLogger.error("Error saving appointment:", error);
      toast.error(error.message || "Error al guardar cita");
    }
  };

  const canSubmit =
    !appointmentFormHook.saving &&
    !!appointmentFormHook.formData.appointment_time &&
    (!isSuperAdmin || !!effectiveBranchForForm);

  return (
    <form className="space-y-8 pb-4" onSubmit={handleSubmit}>
      {isSuperAdmin && (
        <BranchSelectorForm
          branches={branches}
          effectiveBranchForForm={effectiveBranchForForm}
          formBranchId={formBranchId}
          onBranchChange={(v) => setFormBranchId(v || null)}
        />
      )}

      {/* Customer Selection */}
      <CustomerSelection
        customerResults={customerSearchHook.customerResults}
        customerSearch={customerSearchHook.customerSearch}
        guestCustomerData={customerSearchHook.guestCustomerData}
        isGuestCustomer={customerSearchHook.isGuestCustomer}
        searchingCustomers={customerSearchHook.searchingCustomers}
        selectedCustomer={customerSearchHook.selectedCustomer}
        onCustomerClear={() => {
          customerSearchHook.setSelectedCustomer(null);
          appointmentFormHook.updateField("prescription_id", null);
        }}
        onCustomerSearchChange={customerSearchHook.setCustomerSearch}
        onCustomerSearchClear={customerSearchHook.clearCustomerSearch}
        onCustomerSelect={customerSearchHook.setSelectedCustomer}
        onGuestDataChange={customerSearchHook.updateGuestCustomerData}
        onGuestModeToggle={customerSearchHook.setIsGuestCustomer}
      />

      {/* Date and Time Selection */}
      <DateTimeSelection
        availableSlots={availabilityHook.availableSlots}
        date={appointmentFormHook.formData.appointment_date}
        duration={appointmentFormHook.formData.duration_minutes}
        formatTime={(time: string) => {
          const [h, m] = time.split(":");
          return `${h}:${m}`;
        }}
        isSlotAvailable={availabilityHook.isSlotAvailable}
        loadingAvailability={availabilityHook.loading}
        lockDateTime={lockDateTime}
        maxDate={scheduleSettingsHook.getMaxDate()}
        minDate={scheduleSettingsHook.getMinDate()}
        time={appointmentFormHook.formData.appointment_time}
        onDateChange={(date: string) => {
          if (lockDateTime) return;
          const today = new Date().toISOString().split("T")[0];
          if (date < today) {
            toast.error("No se pueden agendar citas en fechas pasadas");
            return;
          }
          appointmentFormHook.updateFormData({
            appointment_date: date,
            appointment_time: "",
          });
          availabilityHook.clearSlots();
        }}
        onDurationChange={(duration: number) => {
          appointmentFormHook.updateFormData({
            duration_minutes: duration,
            appointment_time: "",
          });
          availabilityHook.clearSlots();
        }}
        onLoadAvailability={() => {
          if (
            appointmentFormHook.formData.appointment_date &&
            scheduleSettingsHook.settings
          ) {
            availabilityHook.fetchAvailability(
              appointmentFormHook.formData.appointment_date,
              appointmentFormHook.formData.duration_minutes,
            );
          }
        }}
        onTimeChange={(time: string) =>
          appointmentFormHook.updateField("appointment_time", time)
        }
      />

      {/* Appointment Details */}
      <AppointmentDetails
        appointmentType={appointmentFormHook.formData.appointment_type}
        appointmentTypes={APPOINTMENT_TYPES}
        followUpDate={appointmentFormHook.formData.follow_up_date}
        followUpRequired={appointmentFormHook.formData.follow_up_required}
        notes={appointmentFormHook.formData.notes}
        reason={appointmentFormHook.formData.reason}
        status={appointmentFormHook.formData.status}
        onFollowUpDateChange={(date: string) =>
          appointmentFormHook.updateField("follow_up_date", date)
        }
        onFollowUpToggle={(required: boolean) =>
          appointmentFormHook.updateField("follow_up_required", required)
        }
        onNotesChange={(notes: string) =>
          appointmentFormHook.updateField("notes", notes)
        }
        onReasonChange={(reason: string) =>
          appointmentFormHook.updateField("reason", reason)
        }
        onStatusChange={(status: string) =>
          appointmentFormHook.updateField("status", status)
        }
        onTypeChange={(type: string) =>
          appointmentFormHook.updateField("appointment_type", type)
        }
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <Button
          className="h-12 px-8 rounded-xl font-bold text-admin-text-tertiary hover:bg-admin-bg-tertiary/20 uppercase text-[11px] tracking-widest transition-all"
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Descartar
        </Button>
        <Button
          className="h-12 px-10 rounded-xl bg-admin-accent-primary hover:bg-admin-accent-primary/90 text-white shadow-premium-md font-bold uppercase text-[11px] tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
          disabled={!canSubmit}
          type="submit"
        >
          {appointmentFormHook.saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {initialData?.id ? "Confirmar Cambios" : "Agendar Ahora"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
