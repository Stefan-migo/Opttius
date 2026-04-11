"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle,
  Eye,
  Loader2,
  Package,
  RefreshCw,
  Truck,
  User,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Hooks
import { useBranch } from "@/hooks/useBranch";

import AppointmentDetails from "./AppointmentDetails";
// Components (will be created next)
import CustomerSelection from "./CustomerSelection";
import DateTimeSelection from "./DateTimeSelection";
import { useAppointmentForm } from "./hooks/useAppointmentForm";
import { useAvailability } from "./hooks/useAvailability";
import { useCustomerSearch } from "./hooks/useCustomerSearch";
import { useScheduleSettings } from "./hooks/useScheduleSettings";
// Types
import type {
  AppointmentType,
  CreateAppointmentFormProps,
} from "./types/appointment.types";

const appointmentTypes: AppointmentType[] = [
  { value: "eye_exam", label: "Examen de la Vista", icon: Eye },
  { value: "consultation", label: "Consulta", icon: User },
  { value: "fitting", label: "Ajuste de Lentes", icon: Package },
  { value: "delivery", label: "Entrega de Lentes", icon: Truck },
  { value: "repair", label: "Reparación", icon: Wrench },
  { value: "follow_up", label: "Seguimiento", icon: RefreshCw },
  { value: "emergency", label: "Emergencia", icon: AlertCircle },
  { value: "other", label: "Otro", icon: CheckCircle },
];

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
        console.log("⏰ Calling fetchAvailability after delay");
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
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Error al guardar cita");
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  const canSubmit =
    !appointmentFormHook.saving &&
    !!appointmentFormHook.formData.appointment_time &&
    (!isSuperAdmin || !!effectiveBranchForForm);

  return (
    <form className="space-y-8 pb-4" onSubmit={handleSubmit}>
      {/* Branch selector for super_admin - required to create appointment */}
      {isSuperAdmin && (
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
            Sucursal
          </Label>
          <Select
            value={formBranchId ?? ""}
            onValueChange={(v) => setFormBranchId(v || null)}
          >
            <SelectTrigger className="h-11 rounded-xl border-admin-border-primary/30 font-display font-bold text-[10px] tracking-widest uppercase">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-epoch-primary" />
                <SelectValue placeholder="Seleccione sucursal" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-admin-border-primary/20">
              {branches.map((b) => (
                <SelectItem
                  className="font-display font-medium text-[10px] tracking-widest uppercase"
                  key={b.id}
                  value={b.id}
                >
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!effectiveBranchForForm && (
            <p className="text-[10px] text-admin-error font-medium">
              Debe seleccionar una sucursal para crear la cita
            </p>
          )}
        </div>
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
        formatTime={formatTime}
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
        appointmentTypes={appointmentTypes}
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
