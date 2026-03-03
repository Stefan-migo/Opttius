import { useState, useEffect } from "react";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { useAuthContext } from "@/contexts/AuthContext";

interface AppointmentFormData {
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  assigned_to: string | null;
  notes: string;
  reason: string;
  follow_up_required: boolean;
  follow_up_date: string;
  prescription_id: string | null;
  order_id: string | null;
}

interface UseAppointmentFormProps {
  initialData?: any;
  scheduleSettings: any;
  effectiveBranchId?: string | null;
}

export function useAppointmentForm({
  initialData,
  scheduleSettings,
  effectiveBranchId,
}: UseAppointmentFormProps) {
  const { user, loading: authLoading } = useAuthContext();
  const { currentBranchId } = useBranch();
  const branchIdForRequest =
    effectiveBranchId !== undefined ? effectiveBranchId : currentBranchId;
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form data
  const [formData, setFormData] = useState<AppointmentFormData>({
    appointment_date:
      initialData?.appointment_date ||
      initialData?.date ||
      new Date().toISOString().split("T")[0],
    appointment_time: initialData?.appointment_time || initialData?.time || "",
    duration_minutes:
      initialData?.duration_minutes ||
      scheduleSettings?.default_appointment_duration ||
      30,
    appointment_type: initialData?.appointment_type || "consultation",
    status: initialData?.status || "scheduled",
    assigned_to: initialData?.assigned_to || null,
    notes: initialData?.notes || "",
    reason: initialData?.reason || "",
    follow_up_required: initialData?.follow_up_required || false,
    follow_up_date: initialData?.follow_up_date || "",
    prescription_id: initialData?.prescription_id || null,
    order_id: initialData?.order_id || null,
  });

  // Update form data when initialData changes (for prefilled slots)
  useEffect(() => {
    if (initialData?.date || initialData?.appointment_date) {
      const newDate = initialData.appointment_date || initialData.date;
      const newTime = initialData.appointment_time || initialData.time;

      setFormData((prev) => ({
        ...prev,
        appointment_date: newDate || prev.appointment_date,
        appointment_time: newTime || prev.appointment_time,
      }));
    }
  }, [initialData]);

  // Update duration when schedule settings load
  useEffect(() => {
    if (scheduleSettings && !initialData?.duration_minutes) {
      const defaultDuration =
        scheduleSettings.default_appointment_duration || 30;
      setFormData((prev) => ({
        ...prev,
        duration_minutes: defaultDuration,
      }));
    }
  }, [scheduleSettings, initialData?.duration_minutes]);

  const updateField = (field: keyof AppointmentFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const updateFormData = (data: Partial<AppointmentFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // Clear errors for updated fields
    const newErrors = { ...errors };
    Object.keys(data).forEach((field) => {
      if (newErrors[field as keyof AppointmentFormData]) {
        delete newErrors[field as keyof AppointmentFormData];
      }
    });
    setErrors(newErrors);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    if (!formData.appointment_date) {
      newErrors.appointment_date = "La fecha es obligatoria";
    }

    if (!formData.appointment_time) {
      newErrors.appointment_time = "La hora es obligatoria";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      appointment_date: new Date().toISOString().split("T")[0],
      appointment_time: "",
      duration_minutes: scheduleSettings?.default_appointment_duration || 30,
      appointment_type: "consultation",
      status: "scheduled",
      assigned_to: null,
      notes: "",
      reason: "",
      follow_up_required: false,
      follow_up_date: "",
      prescription_id: null,
      order_id: null,
    });
    setErrors({});
  };

  const handleSubmit = async (
    e: React.FormEvent,
    selectedCustomer: any,
    isGuestCustomer: boolean,
    guestCustomerData: any,
    onSuccess: () => void,
    lockDateTime: boolean = false,
  ) => {
    e.preventDefault();

    // Validate form
    if (!validate()) {
      return false;
    }

    // Validate customer selection or guest customer data
    if (isGuestCustomer) {
      // Validate guest customer data
      if (!guestCustomerData.first_name?.trim()) {
        setErrors((prev) => ({
          ...prev,
          guest_first_name: "El nombre es obligatorio",
        }));
        return false;
      }
      if (!guestCustomerData.last_name?.trim()) {
        setErrors((prev) => ({
          ...prev,
          guest_last_name: "El apellido es obligatorio",
        }));
        return false;
      }
      if (!guestCustomerData.rut?.trim()) {
        setErrors((prev) => ({ ...prev, guest_rut: "El RUT es obligatorio" }));
        return false;
      }
    } else {
      // Validate registered customer
      if (!selectedCustomer) {
        setErrors((prev) => ({
          ...prev,
          customer: "Selecciona un cliente registrado",
        }));
        return false;
      }
    }

    setSaving(true);
    try {
      const url = initialData?.id
        ? `/api/admin/appointments/${initialData.id}`
        : "/api/admin/appointments";

      const method = initialData?.id ? "PUT" : "POST";

      // Ensure time format is correct (HH:MM:SS)
      let appointmentTime = formData.appointment_time;
      if (appointmentTime && appointmentTime.includes(":")) {
        const parts = appointmentTime.split(":");
        if (parts.length === 2) {
          // If format is HH:MM, add :00 seconds
          appointmentTime = appointmentTime + ":00";
        } else if (parts.length === 3 && parts[2] === "") {
          // If format is HH:MM:, add 00
          appointmentTime = appointmentTime + "00";
        }
      }

      const requestBody: any = {
        appointment_date: formData.appointment_date,
        appointment_time: appointmentTime,
        duration_minutes: formData.duration_minutes,
        appointment_type: formData.appointment_type,
        status: formData.status,
        assigned_to: formData.assigned_to || null,
        notes: formData.notes || null,
        reason: formData.reason || null,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_date || null,
        prescription_id: formData.prescription_id || null,
        order_id: formData.order_id || null,
        cancellation_reason: null,
      };

      // If guest customer, send guest data to store in appointment
      if (isGuestCustomer) {
        // Import formatRUT here or pass it as dependency
        const formattedRUT = guestCustomerData.rut?.trim() || "";
        requestBody.guest_customer = {
          first_name: guestCustomerData.first_name?.trim(),
          last_name: guestCustomerData.last_name?.trim(),
          rut: formattedRUT,
          email: guestCustomerData.email?.trim() || null,
          phone: guestCustomerData.phone?.trim() || null,
        };
      } else {
        requestBody.customer_id = selectedCustomer.id;
      }

      const headers = {
        "Content-Type": "application/json",
        ...getBranchHeader(branchIdForRequest),
      };

      // Super admin in global view: send branch_id in body so API can create appointment
      if (branchIdForRequest) {
        requestBody.branch_id = branchIdForRequest;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar cita");
      }

      return true;
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    formData,
    updateField,
    updateFormData,
    validate,
    errors,
    saving,
    setSaving,
    resetForm,
    handleSubmit,
  };
}
