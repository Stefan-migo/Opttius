"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useSystemConfig } from "@/app/admin/system/hooks/useSystemConfig";

import { PrescriptionFormGeneralInfo } from "./CreatePrescriptionFormGeneralInfo";
import { PrescriptionFormLeftEye } from "./CreatePrescriptionFormLeftEye";
import { PrescriptionFormNotes } from "./CreatePrescriptionFormNotes";
import { PrescriptionFormPupillaryDistance } from "./CreatePrescriptionFormPupillaryDistance";
import { PrescriptionFormRightEye } from "./CreatePrescriptionFormRightEye";
import { PrescriptionFormStatus } from "./CreatePrescriptionFormStatus";

interface CreatePrescriptionFormProps {
  customerId: string;
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: unknown;
}

/** Add months to a date string (YYYY-MM-DD), returns YYYY-MM-DD */
function addMonthsToDate(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

export default function CreatePrescriptionForm({
  customerId,
  onSuccess,
  onCancel,
  initialData,
}: CreatePrescriptionFormProps) {
  const { configs } = useSystemConfig({ branchId: null });
  const expirationMonths =
    (configs?.find((c) => c.config_key === "prescription_expiration_months")
      ?.config_value as number) ?? 6;

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    prescription_date:
      initialData?.prescription_date || new Date().toISOString().split("T")[0],
    expiration_date: initialData?.expiration_date || "",
    prescription_number: initialData?.prescription_number || "",
    issued_by: initialData?.issued_by || "",
    issued_by_license: initialData?.issued_by_license || "",

    // Right Eye (OD - Oculus Dexter)
    od_sphere: initialData?.od_sphere || "",
    od_cylinder: initialData?.od_cylinder || "",
    od_axis: initialData?.od_axis || "",
    od_add: initialData?.od_add || "",

    // Left Eye (OS - Oculus Sinister)
    os_sphere: initialData?.os_sphere || "",
    os_cylinder: initialData?.os_cylinder || "",
    os_axis: initialData?.os_axis || "",
    os_add: initialData?.os_add || "",

    // Pupillary Distance (Binocular)
    pd:
      initialData?.pd ||
      (initialData?.od_pd && initialData?.os_pd
        ? (
            parseFloat(initialData.od_pd) + parseFloat(initialData.os_pd)
          ).toString()
        : ""),
    near_pd:
      initialData?.near_pd ||
      (initialData?.od_near_pd && initialData?.os_near_pd
        ? (
            parseFloat(initialData.od_near_pd) +
            parseFloat(initialData.os_near_pd)
          ).toString()
        : ""),

    // Additional measurements
    frame_pd: initialData?.frame_pd || "",
    height_segmentation: initialData?.height_segmentation || "",

    // Prescription type
    prescription_type: initialData?.prescription_type || "",
    lens_type: initialData?.lens_type || "",
    lens_material: initialData?.lens_material || "",

    // Special requirements
    prism_od: initialData?.prism_od || "",
    prism_os: initialData?.prism_os || "",
    tint_od: initialData?.tint_od || "",
    tint_os: initialData?.tint_os || "",
    coatings: initialData?.coatings || ([] as string[]),

    // Notes
    notes: initialData?.notes || "",
    observations: initialData?.observations || "",
    recommendations: initialData?.recommendations || "",

    // Status
    is_active:
      initialData?.is_active !== undefined ? initialData.is_active : true,
    is_current:
      initialData?.is_current !== undefined ? initialData.is_current : false,
  });

  // Auto-calculate expiration_date when prescription_date changes (from system config)
  useEffect(() => {
    if (!formData.prescription_date) return;
    const expiration = addMonthsToDate(
      formData.prescription_date,
      expirationMonths,
    );
    setFormData((prev) =>
      prev.expiration_date !== expiration
        ? { ...prev, expiration_date: expiration }
        : prev,
    );
  }, [formData.prescription_date, expirationMonths]);

  const prescriptionTypes = [
    { value: "single_vision", label: "Visión Simple" },
    { value: "bifocal", label: "Bifocal" },
    { value: "trifocal", label: "Trifocal" },
    { value: "progressive", label: "Progresivo" },
    { value: "reading", label: "Lectura" },
    { value: "computer", label: "Computadora" },
    { value: "sports", label: "Deportivo" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one eye has prescription data
    const hasOD = formData.od_sphere || formData.od_cylinder || formData.od_add;
    const hasOS = formData.os_sphere || formData.os_cylinder || formData.os_add;

    if (!hasOD && !hasOS) {
      toast.error("Debe ingresar al menos una receta para OD o OS");
      return;
    }

    setSaving(true);
    try {
      const url = initialData?.id
        ? `/api/admin/customers/${customerId}/prescriptions/${initialData.id}`
        : `/api/admin/customers/${customerId}/prescriptions`;

      const method = initialData?.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescription_date: formData.prescription_date,
          expiration_date: formData.expiration_date || null,
          prescription_number: formData.prescription_number || null,
          issued_by: formData.issued_by || null,
          issued_by_license: formData.issued_by_license || null,
          od_sphere: formData.od_sphere ? parseFloat(formData.od_sphere) : null,
          od_cylinder: formData.od_cylinder
            ? parseFloat(formData.od_cylinder)
            : null,
          od_axis: formData.od_axis ? parseInt(formData.od_axis) : null,
          od_add: formData.od_add ? parseFloat(formData.od_add) : null,
          // Calculate monocular PD from binocular PD (divide by 2)
          od_pd: formData.pd ? parseFloat(formData.pd) / 2 : null,
          od_near_pd: formData.near_pd
            ? parseFloat(formData.near_pd) / 2
            : null,
          os_sphere: formData.os_sphere ? parseFloat(formData.os_sphere) : null,
          os_cylinder: formData.os_cylinder
            ? parseFloat(formData.os_cylinder)
            : null,
          os_axis: formData.os_axis ? parseInt(formData.os_axis) : null,
          os_add: formData.os_add ? parseFloat(formData.os_add) : null,
          os_pd: formData.pd ? parseFloat(formData.pd) / 2 : null,
          os_near_pd: formData.near_pd
            ? parseFloat(formData.near_pd) / 2
            : null,
          frame_pd: formData.frame_pd ? parseFloat(formData.frame_pd) : null,
          height_segmentation: formData.height_segmentation
            ? parseFloat(formData.height_segmentation)
            : null,
          prescription_type: formData.prescription_type || null,
          lens_type: formData.lens_type || null,
          lens_material: formData.lens_material || null,
          prism_od: formData.prism_od || null,
          prism_os: formData.prism_os || null,
          tint_od: formData.tint_od || null,
          tint_os: formData.tint_os || null,
          coatings: formData.coatings || [],
          notes: formData.notes || null,
          observations: formData.observations || null,
          recommendations: formData.recommendations || null,
          is_active: formData.is_active,
          is_current: formData.is_current,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar receta");
      }

      toast.success(
        initialData?.id
          ? "Receta actualizada exitosamente"
          : "Receta creada exitosamente",
      );
      onSuccess();
    } catch (error: unknown) {
      console.error("Error saving prescription:", error);
      toast.error(error.message || "Error al guardar receta");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form
      className="space-y-6 min-w-0 w-full overflow-hidden"
      onSubmit={handleSubmit}
    >
      <PrescriptionFormGeneralInfo
        formData={formData}
        prescriptionTypes={prescriptionTypes}
        onChange={handleFieldChange}
      />
      <PrescriptionFormRightEye
        formData={formData}
        onChange={handleFieldChange}
      />
      <PrescriptionFormLeftEye
        formData={formData}
        onChange={handleFieldChange}
      />
      <PrescriptionFormPupillaryDistance
        formData={formData}
        onChange={handleFieldChange}
      />
      <PrescriptionFormNotes
        formData={formData}
        onChange={handleFieldChange}
      />
      <PrescriptionFormStatus
        formData={formData}
        isEdit={!!initialData?.id}
        saving={saving}
        onChange={handleFieldChange}
        onCancel={onCancel}
      />
    </form>
  );
}
