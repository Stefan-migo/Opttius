"use client";

import { Eye, FileText, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useSystemConfig } from "@/app/admin/system/hooks/useSystemConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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

  return (
    <form
      className="space-y-6 min-w-0 w-full overflow-hidden"
      onSubmit={handleSubmit}
    >
      {/* Prescription Header */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2 min-w-0 truncate">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">Información General</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <div className="min-w-0 space-y-2">
              <Label
                className="block text-sm font-medium"
                htmlFor="prescription_date"
              >
                Fecha de Receta *
              </Label>
              <Input
                required
                className="w-full"
                id="prescription_date"
                type="date"
                value={formData.prescription_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    prescription_date: e.target.value,
                  }))
                }
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label
                className="block text-sm font-medium"
                htmlFor="expiration_date"
              >
                Fecha de Vencimiento
              </Label>
              <Input
                className="w-full"
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expiration_date: e.target.value,
                  }))
                }
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label
                className="block text-sm font-medium"
                htmlFor="prescription_number"
              >
                Número de Receta
              </Label>
              <Input
                className="w-full"
                id="prescription_number"
                placeholder="Número único de receta"
                value={formData.prescription_number}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    prescription_number: e.target.value,
                  }))
                }
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label className="block text-sm font-medium" htmlFor="issued_by">
                Emitida por
              </Label>
              <Input
                className="w-full"
                id="issued_by"
                placeholder="Nombre del oftalmólogo/optómetra"
                value={formData.issued_by}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    issued_by: e.target.value,
                  }))
                }
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label
                className="block text-sm font-medium"
                htmlFor="issued_by_license"
              >
                Licencia Profesional
              </Label>
              <Input
                className="w-full"
                id="issued_by_license"
                placeholder="Número de licencia"
                value={formData.issued_by_license}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    issued_by_license: e.target.value,
                  }))
                }
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label
                className="block text-sm font-medium"
                htmlFor="prescription_type"
              >
                Tipo de Receta
              </Label>
              <Select
                value={formData.prescription_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, prescription_type: value }))
                }
              >
                <SelectTrigger
                  className="w-full min-w-0"
                  id="prescription_type"
                >
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {prescriptionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right Eye (OD) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2 min-w-0 truncate">
            <Eye className="h-5 w-5 shrink-0" />
            <span className="truncate">Ojo Derecho (OD - Oculus Dexter)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="od_sphere">
                Esfera (SPH)
              </Label>
              <Input
                className="w-full"
                id="od_sphere"
                placeholder="Ej: -2.50"
                step="0.25"
                type="number"
                value={formData.od_sphere}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    od_sphere: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                className="block text-sm font-medium"
                htmlFor="od_cylinder"
              >
                Cilindro (CYL)
              </Label>
              <Input
                className="w-full"
                id="od_cylinder"
                placeholder="Ej: -1.00"
                step="0.25"
                type="number"
                value={formData.od_cylinder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    od_cylinder: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="od_axis">
                Eje (AXIS)
              </Label>
              <Input
                className="w-full"
                id="od_axis"
                max="180"
                min="0"
                placeholder="0-180"
                type="number"
                value={formData.od_axis}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, od_axis: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="od_add">
                Adición (ADD)
              </Label>
              <Input
                className="w-full"
                id="od_add"
                placeholder="Para lectura"
                step="0.25"
                type="number"
                value={formData.od_add}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, od_add: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="prism_od">
                Prisma OD
              </Label>
              <Input
                className="w-full"
                id="prism_od"
                placeholder="Ej: 2.0 Base Up"
                value={formData.prism_od}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prism_od: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="tint_od">
                Tinte OD
              </Label>
              <Input
                className="w-full"
                id="tint_od"
                placeholder="Ej: Gris 20%"
                value={formData.tint_od}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tint_od: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Left Eye (OS) */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2 min-w-0 truncate">
            <Eye className="h-5 w-5 shrink-0" />
            <span className="truncate">
              Ojo Izquierdo (OS - Oculus Sinister)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="os_sphere">
                Esfera (SPH)
              </Label>
              <Input
                className="w-full"
                id="os_sphere"
                placeholder="Ej: -2.50"
                step="0.25"
                type="number"
                value={formData.os_sphere}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    os_sphere: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                className="block text-sm font-medium"
                htmlFor="os_cylinder"
              >
                Cilindro (CYL)
              </Label>
              <Input
                className="w-full"
                id="os_cylinder"
                placeholder="Ej: -1.00"
                step="0.25"
                type="number"
                value={formData.os_cylinder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    os_cylinder: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="os_axis">
                Eje (AXIS)
              </Label>
              <Input
                className="w-full"
                id="os_axis"
                max="180"
                min="0"
                placeholder="0-180"
                type="number"
                value={formData.os_axis}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, os_axis: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="os_add">
                Adición (ADD)
              </Label>
              <Input
                className="w-full"
                id="os_add"
                placeholder="Para lectura"
                step="0.25"
                type="number"
                value={formData.os_add}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, os_add: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="prism_os">
                Prisma OS
              </Label>
              <Input
                className="w-full"
                id="prism_os"
                placeholder="Ej: 2.0 Base Up"
                value={formData.prism_os}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prism_os: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="tint_os">
                Tinte OS
              </Label>
              <Input
                className="w-full"
                id="tint_os"
                placeholder="Ej: Gris 20%"
                value={formData.tint_os}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tint_os: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pupillary Distance (PD) - Binocular Section */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2 min-w-0 truncate">
            <Eye className="h-5 w-5 shrink-0" />
            <span className="truncate">Distancia Pupilar (PD) - Binocular</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="pd">
                PD Lejos (Distancia)
              </Label>
              <Input
                className="w-full"
                id="pd"
                placeholder="mm (binocular)"
                step="0.1"
                type="number"
                value={formData.pd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pd: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="near_pd">
                PD Cerca (Lectura)
              </Label>
              <Input
                className="w-full"
                id="near_pd"
                placeholder="mm (binocular)"
                step="0.1"
                type="number"
                value={formData.near_pd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, near_pd: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium" htmlFor="frame_pd">
                PD del Marco
              </Label>
              <Input
                className="w-full"
                id="frame_pd"
                placeholder="Distancia entre lentes (mm)"
                step="0.1"
                type="number"
                value={formData.frame_pd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, frame_pd: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                className="block text-sm font-medium"
                htmlFor="height_segmentation"
              >
                Altura de Segmentación
              </Label>
              <Input
                className="w-full"
                id="height_segmentation"
                placeholder="Para bifocal/progresivo (mm)"
                step="0.1"
                type="number"
                value={formData.height_segmentation}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    height_segmentation: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="min-w-0 truncate">
            Notas y Observaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <div className="space-y-2">
            <Label className="block text-sm font-medium" htmlFor="observations">
              Observaciones Clínicas
            </Label>
            <Textarea
              id="observations"
              placeholder="Observaciones del examen..."
              rows={3}
              value={formData.observations}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  observations: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label
              className="block text-sm font-medium"
              htmlFor="recommendations"
            >
              Recomendaciones
            </Label>
            <Textarea
              id="recommendations"
              placeholder="Recomendaciones para el paciente..."
              rows={3}
              value={formData.recommendations}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  recommendations: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label>Notas Generales</Label>
            <Textarea
              placeholder="Notas adicionales..."
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="min-w-0 truncate">Estado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <Label>Receta Activa</Label>
              <p className="text-sm text-tierra-media">
                La receta está activa y puede ser usada
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Receta Actual</Label>
              <p className="text-sm text-tierra-media">
                Marcar como receta principal del paciente
              </p>
            </div>
            <Switch
              checked={formData.is_current}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_current: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={saving} type="submit">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              {initialData?.id ? "Actualizar Receta" : "Crear Receta"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
