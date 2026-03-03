"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  User,
  Calendar,
  Clock,
  Loader2,
  Plus,
  Eye,
  Package,
  Truck,
  Wrench,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRUT } from "@/lib/utils/rut";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { useAuthContext } from "@/contexts/AuthContext";
import { extractDataFromResponse } from "@/lib/api/response-helpers";
import { useFormOptions } from "@/hooks/useFormOptions";

interface CreateAppointmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
  initialCustomerId?: string;
  lockDateTime?: boolean; // Lock date and time when opened from calendar slot
  /** When in global view, branch to scope customer search and appointment creation */
  effectiveBranchId?: string;
}

export default function CreateAppointmentForm({
  onSuccess,
  onCancel,
  initialData,
  initialCustomerId,
  lockDateTime = false,
  effectiveBranchId,
}: CreateAppointmentFormProps) {
  const { user, loading: authLoading } = useAuthContext();
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

  const branchIdForSearch =
    effectiveBranchForForm ?? currentBranchId ?? undefined;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(
    initialData?.customer || null,
  );
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Guest customer (non-registered) mode
  // If initialData has a customer, start in registered mode, otherwise allow guest mode
  const [isGuestCustomer, setIsGuestCustomer] = useState(
    !initialData?.customer && !initialCustomerId,
  );
  const [guestCustomerData, setGuestCustomerData] = useState({
    first_name: "",
    last_name: "",
    rut: "",
    email: "",
    phone: "",
  });

  // Schedule settings
  const [scheduleSettings, setScheduleSettings] = useState<any>(null);

  // Available time slots
  const [availableSlots, setAvailableSlots] = useState<
    Array<{ time_slot: string; available: boolean }>
  >([]);

  // Form data
  const [formData, setFormData] = useState({
    appointment_date:
      initialData?.appointment_date ||
      initialData?.date ||
      new Date().toISOString().split("T")[0],
    appointment_time: initialData?.appointment_time || initialData?.time || "",
    duration_minutes:
      initialData?.duration_minutes ||
      scheduleSettings?.default_appointment_duration ||
      30, // Will be updated when scheduleSettings loads
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

  const { options: formOptions } = useFormOptions("appointment");
  const appointmentTypeValues = formOptions.appointment_type || [];
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    eye_exam: Eye,
    consultation: User,
    fitting: Package,
    delivery: Truck,
    repair: Wrench,
    follow_up: RefreshCw,
    emergency: AlertCircle,
    other: CheckCircle,
  };
  const defaultAppointmentTypes = [
    { value: "eye_exam", label: "Examen de la Vista", icon: Eye },
    { value: "consultation", label: "Consulta", icon: User },
    { value: "fitting", label: "Ajuste de Lentes", icon: Package },
    { value: "delivery", label: "Entrega de Lentes", icon: Truck },
    { value: "repair", label: "Reparación", icon: Wrench },
    { value: "follow_up", label: "Seguimiento", icon: RefreshCw },
    { value: "emergency", label: "Emergencia", icon: AlertCircle },
    { value: "other", label: "Otro", icon: CheckCircle },
  ];
  const appointmentTypes =
    appointmentTypeValues.length > 0
      ? appointmentTypeValues.map((opt) => ({
          value: opt.value,
          label: opt.label,
          icon: iconMap[opt.value] || CheckCircle,
        }))
      : defaultAppointmentTypes;

  // Load schedule settings
  useEffect(() => {
    if (!authLoading && user) {
      fetchScheduleSettings();
    }
  }, [effectiveBranchForForm, authLoading, user]);

  useEffect(() => {
    if (
      initialCustomerId &&
      (!selectedCustomer || selectedCustomer.id !== initialCustomerId)
    ) {
      fetchCustomer(initialCustomerId);
    }
  }, [initialCustomerId, selectedCustomer]);

  // Load availability when date or duration changes
  useEffect(() => {
    console.log("🔄 Availability useEffect triggered:", {
      hasDate: !!formData.appointment_date,
      date: formData.appointment_date,
      duration: formData.duration_minutes,
      hasSettings: !!scheduleSettings,
    });

    if (formData.appointment_date && scheduleSettings) {
      // Add a small delay to ensure state is ready
      const timer = setTimeout(() => {
        console.log("⏰ Calling fetchAvailability after delay");
        fetchAvailability();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      console.log("⏸️ Skipping fetchAvailability - missing date or settings");
      if (!formData.appointment_date)
        console.log("  - Missing appointment_date");
      if (!scheduleSettings) console.log("  - Missing scheduleSettings");
    }
  }, [formData.appointment_date, formData.duration_minutes, scheduleSettings]);

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

      // Trigger availability fetch if date is set and scheduleSettings is loaded
      if (newDate && scheduleSettings) {
        // Small delay to ensure state is updated
        const timer = setTimeout(() => {
          fetchAvailability();
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [initialData, scheduleSettings]);

  const fetchScheduleSettings = async () => {
    if (!user || authLoading) return;

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchHeader(effectiveBranchForForm ?? currentBranchId),
      };

      const response = await fetch("/api/admin/schedule-settings", {
        headers,
        credentials: "include", // Include cookies for authentication
      });
      if (response.ok) {
        const data = await response.json();
        const settings = data.data ?? data.settings;
        setScheduleSettings(settings);
        // Update default duration from settings if not set from initialData
        if (settings && !initialData?.duration_minutes) {
          const defaultDuration = settings.default_appointment_duration || 30;
          setFormData((prev) => {
            // Always update to use the configured default duration
            // This ensures the form uses the setting from schedule configuration
            return {
              ...prev,
              duration_minutes: defaultDuration,
            };
          });
        }
      }
    } catch (error) {
      console.error("Error fetching schedule settings:", error);
    }
  };

  const fetchCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomer(data.data);
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  const fetchAvailability = async () => {
    if (!formData.appointment_date) {
      console.log("No date selected, skipping availability fetch");
      setAvailableSlots([]);
      return;
    }

    if (!scheduleSettings) {
      console.log(
        "Schedule settings not loaded yet, skipping availability fetch",
      );
      return;
    }

    // Super admin must select branch before we can fetch availability
    if (isSuperAdmin && !effectiveBranchForForm) {
      setAvailableSlots([]);
      return;
    }

    const selectedDate = new Date(formData.appointment_date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = selectedDate.getTime() === today.getTime();

    console.log("🔍 Fetching availability for:", {
      date: formData.appointment_date,
      duration: formData.duration_minutes,
      isToday,
      scheduleSettings: scheduleSettings ? "loaded" : "not loaded",
      minAdvanceHours: scheduleSettings?.min_advance_booking_hours || 0,
    });

    setLoadingAvailability(true);
    try {
      const params = new URLSearchParams({
        date: formData.appointment_date,
        duration: formData.duration_minutes.toString(),
      });

      const headers = {
        "Content-Type": "application/json",
        ...getBranchHeader(effectiveBranchForForm ?? currentBranchId),
      };

      const response = await fetch(
        `/api/admin/appointments/availability?${params}`,
        { headers },
      );
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Available slots response:", data);
        console.log("📊 Total slots:", data.slots?.length || 0);
        const availableCount =
          data.slots?.filter((s: any) => s.available === true).length || 0;
        console.log("📊 Available slots:", availableCount);
        console.log("📋 First few slots:", data.slots?.slice(0, 5));

        if (data.slots && data.slots.length > 0) {
          console.log(
            "✅ Setting available slots:",
            data.slots.length,
            "total,",
            availableCount,
            "available",
          );
          setAvailableSlots(data.slots);
        } else {
          console.warn("⚠️ No slots returned from API - empty array");
          setAvailableSlots([]);
        }
      } else {
        const errorData = await response.json();
        console.error("Error fetching availability:", errorData);
        toast.error(errorData.error || "Error al cargar disponibilidad");
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Error al cargar disponibilidad");
      setAvailableSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 1) {
        setCustomerResults([]);
        return;
      }

      setSearchingCustomers(true);
      try {
        const headers: Record<string, string> = {};
        if (branchIdForSearch) {
          headers["x-branch-id"] = branchIdForSearch;
        }
        const response = await fetch(
          `/api/admin/customers/search?q=${encodeURIComponent(customerSearch)}`,
          { headers },
        );
        if (response.ok) {
          const data = await response.json();
          setCustomerResults(extractDataFromResponse(data));
        }
      } catch (error) {
        console.error("Error searching customers:", error);
      } finally {
        setSearchingCustomers(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch, branchIdForSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate customer selection or guest customer data
    if (isGuestCustomer) {
      // Validate guest customer data
      if (
        !guestCustomerData.first_name ||
        !guestCustomerData.first_name.trim()
      ) {
        toast.error("El nombre es obligatorio");
        return;
      }
      if (!guestCustomerData.last_name || !guestCustomerData.last_name.trim()) {
        toast.error("El apellido es obligatorio");
        return;
      }
      if (!guestCustomerData.rut || !guestCustomerData.rut.trim()) {
        toast.error("El RUT es obligatorio");
        return;
      }
    } else {
      // Validate registered customer
      if (!selectedCustomer) {
        toast.error("Selecciona un cliente registrado");
        return;
      }
    }

    if (!formData.appointment_date) {
      toast.error("Selecciona una fecha");
      return;
    }

    if (!formData.appointment_time) {
      toast.error("Selecciona una hora");
      return;
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

      console.log("📤 Submitting appointment:", {
        date: formData.appointment_date,
        time: appointmentTime,
        originalTime: formData.appointment_time,
        duration: formData.duration_minutes,
        customerId: selectedCustomer?.id,
        isGuestCustomer,
        guestCustomerData,
      });

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
        branch_id: effectiveBranchForForm ?? currentBranchId ?? undefined,
      };

      // If guest customer, send guest data to store in appointment (not create customer)
      if (isGuestCustomer) {
        // Ensure RUT is properly formatted before sending
        const formattedRUT = formatRUT(guestCustomerData.rut.trim());
        requestBody.guest_customer = {
          first_name: guestCustomerData.first_name.trim(),
          last_name: guestCustomerData.last_name.trim(),
          rut: formattedRUT,
          email: guestCustomerData.email.trim() || null,
          phone: guestCustomerData.phone.trim() || null,
        };
      } else {
        requestBody.customer_id = selectedCustomer.id;
      }

      const headers = {
        "Content-Type": "application/json",
        ...getBranchHeader(effectiveBranchForForm ?? currentBranchId),
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar cita");
      }

      if (formData.status === "completed") {
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
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Error al guardar cita");
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  const isSlotAvailable = (timeSlot: string) => {
    const slot = availableSlots.find((s) => s.time_slot === timeSlot);
    return slot?.available || false;
  };

  const getMinDate = () => {
    if (!scheduleSettings) return new Date().toISOString().split("T")[0];
    const minHours = scheduleSettings.min_advance_booking_hours || 2;
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + minHours);
    return minDate.toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    if (!scheduleSettings) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      return maxDate.toISOString().split("T")[0];
    }
    const maxDays = scheduleSettings.max_advance_booking_days || 90;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxDays);
    return maxDate.toISOString().split("T")[0];
  };

  const canSubmit =
    !saving &&
    !!formData.appointment_time &&
    (!isSuperAdmin || !!effectiveBranchForForm);

  return (
    <form
      id="create-appointment-form"
      onSubmit={handleSubmit}
      className="flex flex-col min-h-0 flex-1"
    >
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-6 md:space-y-8 pb-4">
        {/* Branch selector for super_admin - required to create appointment */}
        {isSuperAdmin && (
          <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
            <CardContent className="p-4 sm:p-6 space-y-2">
              <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                Sucursal *
              </Label>
              <Select
                value={formBranchId ?? ""}
                onValueChange={(v) => setFormBranchId(v || null)}
              >
                <SelectTrigger className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-epoch-primary" />
                    <SelectValue placeholder="Seleccione sucursal" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-admin-border-primary shadow-premium-lg">
                  {branches.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      className="font-bold text-[11px] uppercase tracking-tight"
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
            </CardContent>
          </Card>
        )}

        {/* Customer Selection */}
        <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
          <CardHeader className="pb-3 sm:pb-4 border-b border-admin-border-primary/10 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center text-base sm:text-lg font-bold text-admin-text-primary tracking-tight">
              <div className="h-7 w-7 sm:h-8 sm:w-8 bg-admin-accent-primary/10 rounded-lg flex items-center justify-center mr-2 sm:mr-3 shrink-0">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-admin-accent-primary" />
              </div>
              Identificación del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Toggle between registered and guest customer */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-white/40 rounded-xl border border-admin-border-primary/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-admin-text-primary">
                  Cliente Registrado
                </Label>
                <p className="text-[10px] font-medium text-admin-text-tertiary uppercase">
                  Búsqueda en base de datos oficial
                </p>
              </div>
              <Switch
                checked={!isGuestCustomer}
                onCheckedChange={(checked) => {
                  setIsGuestCustomer(!checked);
                  if (!checked) {
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                    setCustomerResults([]);
                  } else {
                    setGuestCustomerData({
                      first_name: "",
                      last_name: "",
                      rut: "",
                      email: "",
                      phone: "",
                    });
                  }
                }}
                className="data-[state=checked]:bg-admin-accent-primary"
              />
            </div>

            {isGuestCustomer ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="p-4 bg-admin-info/5 border border-admin-info/10 rounded-xl">
                  <p className="text-[11px] font-bold text-admin-info uppercase tracking-tight flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    Registro Temporal
                  </p>
                  <p className="text-[10px] text-admin-text-secondary mt-1">
                    Ingrese los datos para esta reserva única. El cliente será
                    formalizado íntegramente al momento de la atención.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                      Nombre *
                    </Label>
                    <Input
                      placeholder="Nombre"
                      value={guestCustomerData.first_name}
                      onChange={(e) =>
                        setGuestCustomerData((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                      className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                      Apellido *
                    </Label>
                    <Input
                      placeholder="Apellido"
                      value={guestCustomerData.last_name}
                      onChange={(e) =>
                        setGuestCustomerData((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                      className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                      RUT *
                    </Label>
                    <Input
                      placeholder="12.345.678-9"
                      value={guestCustomerData.rut}
                      onChange={(e) => {
                        const value = e.target.value;
                        const formatted = formatRUT(value);
                        setGuestCustomerData((prev) => ({
                          ...prev,
                          rut: formatted,
                        }));
                      }}
                      className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                      Teléfono
                    </Label>
                    <Input
                      type="tel"
                      placeholder="+56 9..."
                      value={guestCustomerData.phone}
                      onChange={(e) =>
                        setGuestCustomerData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider ml-1">
                    Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={guestCustomerData.email}
                    onChange={(e) =>
                      setGuestCustomerData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                  />
                </div>
              </div>
            ) : selectedCustomer ? (
              <div className="relative p-3 sm:p-5 rounded-2xl bg-admin-accent-primary/[0.03] border border-admin-accent-primary/20 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-admin-accent-primary/10 rounded-full flex items-center justify-center font-black text-admin-accent-primary shrink-0 text-sm sm:text-base">
                      {selectedCustomer.first_name?.[0]}
                      {selectedCustomer.last_name?.[0]}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                      <p className="text-base sm:text-lg font-bold text-admin-text-primary tracking-tight truncate">
                        {selectedCustomer.first_name}{" "}
                        {selectedCustomer.last_name}
                      </p>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {selectedCustomer.email && (
                          <p
                            className="text-[10px] sm:text-[11px] font-medium text-admin-text-secondary truncate"
                            title={selectedCustomer.email}
                          >
                            <span className="opacity-50">✉️</span>{" "}
                            {selectedCustomer.email}
                          </p>
                        )}
                        {selectedCustomer.phone && (
                          <p
                            className="text-[10px] sm:text-[11px] font-medium text-admin-text-secondary truncate"
                            title={selectedCustomer.phone}
                          >
                            <span className="opacity-50">📞</span>{" "}
                            {selectedCustomer.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 sm:h-8 w-full sm:w-auto rounded-lg text-admin-accent-primary hover:bg-admin-accent-primary/10 font-bold text-[10px] uppercase tracking-widest shrink-0"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setFormData((prev) => ({
                        ...prev,
                        prescription_id: null,
                      }));
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  {searchingCustomers ? (
                    <Loader2 className="h-4 w-4 animate-spin text-admin-accent-primary" />
                  ) : (
                    <Search className="h-4 w-4 text-admin-text-tertiary" />
                  )}
                </div>
                <Input
                  placeholder="Buscar por Nombre, RUT o Email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="h-12 pl-12 rounded-2xl border-admin-border-primary/50 bg-white/60 focus:bg-white focus:ring-2 focus:ring-admin-accent-primary/20 transition-all font-medium text-sm"
                />

                {customerSearch.length >= 1 && (
                  <div className="z-[100] w-full mt-2 bg-white/95 backdrop-blur-md border border-admin-border-primary shadow-premium-lg rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
                      {customerResults.length > 0
                        ? customerResults.map((customer) => (
                            <div
                              key={customer.id}
                              className="flex items-center gap-3 p-3 hover:bg-admin-accent-primary/5 cursor-pointer rounded-xl transition-colors group"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setCustomerSearch("");
                                setCustomerResults([]);
                              }}
                            >
                              <div className="h-9 w-9 bg-admin-bg-tertiary rounded-lg flex items-center justify-center font-bold text-admin-text-secondary group-hover:bg-admin-accent-primary/10 group-hover:text-admin-accent-primary transition-colors text-xs">
                                {customer.first_name?.[0]}
                                {customer.last_name?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-admin-text-primary truncate">
                                  {customer.first_name} {customer.last_name}
                                </p>
                                <p className="text-[10px] text-admin-text-tertiary truncate">
                                  {customer.rut || customer.email}
                                </p>
                              </div>
                            </div>
                          ))
                        : !searchingCustomers && (
                            <div className="p-8 text-center text-admin-text-tertiary">
                              <User className="h-8 w-8 mx-auto mb-2 opacity-20" />
                              <p className="text-xs font-bold uppercase tracking-widest">
                                Sin coincidencias
                              </p>
                            </div>
                          )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date and Time Selection */}
        <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
          <CardHeader className="pb-3 sm:pb-4 border-b border-admin-border-primary/10 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="flex items-center text-base sm:text-lg font-bold text-admin-text-primary tracking-tight">
              <div className="h-7 w-7 sm:h-8 sm:w-8 bg-admin-info/10 rounded-lg flex items-center justify-center mr-2 sm:mr-3 shrink-0">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-admin-info" />
              </div>
              Agenda de la Sesión
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                  Fecha de Atención *
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => {
                      if (lockDateTime) return;
                      const selectedDate = e.target.value;
                      const today = new Date().toISOString().split("T")[0];
                      if (selectedDate < today) {
                        toast.error(
                          "No se pueden agendar citas en fechas pasadas",
                        );
                        return;
                      }
                      setFormData((prev) => ({
                        ...prev,
                        appointment_date: selectedDate,
                        appointment_time: "",
                      }));
                      setAvailableSlots([]);
                    }}
                    min={getMinDate()}
                    max={getMaxDate()}
                    className={cn(
                      "h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold px-4",
                      lockDateTime &&
                        "opacity-60 grayscale cursor-not-allowed bg-admin-bg-tertiary",
                    )}
                    disabled={lockDateTime}
                    required
                  />
                  {lockDateTime && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[10px]">🔒</span>
                    </div>
                  )}
                </div>
                {lockDateTime && (
                  <p className="text-[9px] font-bold text-admin-info uppercase tracking-tight ml-1">
                    Fijada desde el Calendario Maestro
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                  Duración Estimada *
                </Label>
                <Select
                  value={formData.duration_minutes.toString()}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      duration_minutes: parseInt(value),
                      appointment_time: "",
                    }));
                    setAvailableSlots([]);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-admin-border-primary shadow-premium-lg">
                    <SelectItem value="15" className="font-bold">
                      15 MINUTOS
                    </SelectItem>
                    <SelectItem value="30" className="font-bold">
                      30 MINUTOS
                    </SelectItem>
                    <SelectItem value="45" className="font-bold">
                      45 MINUTOS
                    </SelectItem>
                    <SelectItem value="60" className="font-bold">
                      1 HORA
                    </SelectItem>
                    <SelectItem value="90" className="font-bold">
                      1.5 HORAS
                    </SelectItem>
                    <SelectItem value="120" className="font-bold">
                      2 HORAS
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Available Time Slots Handling */}
            {formData.appointment_date && (
              <div className="space-y-4 pt-4 border-t border-admin-border-primary/10">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                    Bloques Disponibles
                  </Label>
                  {loadingAvailability && (
                    <Loader2 className="h-3 w-3 animate-spin text-admin-accent-primary" />
                  )}
                </div>

                {loadingAvailability ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-10 bg-admin-bg-tertiary/30 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : availableSlots.filter((s) => s.available).length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-admin-bg-tertiary/10 border border-dashed border-admin-border-primary/30">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-10" />
                    <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Sin disponibilidad inmediata
                    </p>
                    <p className="text-[9px] text-admin-text-tertiary mt-1">
                      Intente con otra fecha o verifique la configuración
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                    {availableSlots
                      .filter(
                        (slot) =>
                          slot && slot.time_slot && slot.available !== false,
                      )
                      .map((slot) => {
                        const isSelected =
                          formData.appointment_time === slot.time_slot;
                        const isLocked = lockDateTime && isSelected;

                        return (
                          <Button
                            key={slot.time_slot}
                            type="button"
                            variant="ghost"
                            onClick={(e) => {
                              if (lockDateTime && !isSelected) return;
                              e.preventDefault();
                              setFormData((prev) => ({
                                ...prev,
                                appointment_time: slot.time_slot,
                              }));
                            }}
                            className={cn(
                              "h-10 rounded-xl font-black text-[10px] tracking-tighter transition-all duration-300 border flex flex-col items-center justify-center p-0",
                              isSelected
                                ? "bg-admin-accent-primary text-white border-admin-accent-primary shadow-premium-sm scale-[1.05] z-10"
                                : "bg-white border-admin-border-primary/30 text-admin-text-secondary hover:border-admin-accent-primary/40 hover:bg-admin-accent-primary/[0.02]",
                              lockDateTime &&
                                !isSelected &&
                                "opacity-30 grayscale cursor-not-allowed",
                            )}
                            disabled={lockDateTime && !isSelected}
                          >
                            <span className="leading-none">
                              {formatTime(slot.time_slot)}
                            </span>
                            {isLocked && (
                              <span className="text-[8px] mt-0.5">🔒</span>
                            )}
                          </Button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointment Type & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
            <CardHeader className="pb-4 border-b border-admin-border-primary/10">
              <CardTitle className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
                <Package className="h-4 w-4 text-admin-accent-primary" />
                Tipo de Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <Select
                value={formData.appointment_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, appointment_type: value }))
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-admin-border-primary shadow-premium-lg">
                  {appointmentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem
                        key={type.value}
                        value={type.value}
                        className="font-bold"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 opacity-60" />
                          <span className="uppercase text-[11px] tracking-tight">
                            {type.label}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
            <CardHeader className="pb-4 border-b border-admin-border-primary/10">
              <CardTitle className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-admin-info" />
                Estado Inicial
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-admin-border-primary shadow-premium-lg">
                  <SelectItem
                    value="scheduled"
                    className="font-bold text-[11px] uppercase tracking-tight"
                  >
                    Programada
                  </SelectItem>
                  <SelectItem
                    value="confirmed"
                    className="font-bold text-[11px] uppercase tracking-tight"
                  >
                    Confirmada
                  </SelectItem>
                  <SelectItem
                    value="completed"
                    className="font-bold text-[11px] uppercase tracking-tight"
                  >
                    Completada
                  </SelectItem>
                  <SelectItem
                    value="cancelled"
                    className="font-bold text-[11px] uppercase tracking-tight text-red-600"
                  >
                    Cancelada
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Notes & Reasoning */}
        <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
          <CardHeader className="pb-4 border-b border-admin-border-primary/10">
            <CardTitle className="text-sm font-bold text-admin-text-primary flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-admin-accent-primary" />
              Detalles Clínicos & Notas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                Motivo de la Cita
              </Label>
              <Input
                value={formData.reason}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Describa brevemente el motivo..."
                className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                Observaciones Internas
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Información relevante para el profesional..."
                rows={3}
                className="rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all resize-none p-4"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-white/40 rounded-xl border border-admin-border-primary/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-admin-text-primary">
                  Requiere Seguimiento
                </Label>
                <p className="text-[10px] font-medium text-admin-text-tertiary uppercase">
                  Recordatorio automático de control
                </p>
              </div>
              <Switch
                checked={formData.follow_up_required}
                onCheckedChange={(checked) => {
                  const baseDate = formData.appointment_date
                    ? new Date(formData.appointment_date)
                    : new Date();
                  const followUpDate = new Date(baseDate);
                  followUpDate.setFullYear(followUpDate.getFullYear() + 1);
                  setFormData((prev) => ({
                    ...prev,
                    follow_up_required: checked,
                    follow_up_date: checked
                      ? followUpDate.toISOString().split("T")[0]
                      : "",
                  }));
                }}
                className="data-[state=checked]:bg-admin-accent-primary"
              />
            </div>

            {formData.follow_up_required && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                  Cita Proyectada
                </Label>
                <Input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      follow_up_date: e.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions - sticky footer, always visible */}
      <div className="shrink-0 flex flex-row justify-end gap-3 sm:gap-4 p-4 sm:p-6 md:p-8 pt-4 border-t border-admin-border-primary/10 bg-white">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-10 sm:h-12 px-4 sm:px-8 rounded-xl font-bold text-admin-text-tertiary hover:bg-admin-bg-tertiary/20 uppercase text-[10px] sm:text-[11px] tracking-widest transition-all"
        >
          Descartar
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-10 sm:h-12 px-6 sm:px-10 rounded-xl bg-admin-accent-primary hover:bg-admin-accent-primary/90 text-white shadow-premium-md font-bold uppercase text-[10px] sm:text-[11px] tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
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
