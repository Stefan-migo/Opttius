"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSystemConfig } from "@/app/admin/system/hooks/useSystemConfig";
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
import { Eye, Loader2, Plus, Calendar, User, FileText } from "lucide-react";
import { toast } from "sonner";

interface CreatePrescriptionFormProps {
  customerId: string;
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
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
    } catch (error: any) {
      console.error("Error saving prescription:", error);
      toast.error(error.message || "Error al guardar receta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 min-w-0 w-full overflow-hidden"
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
                htmlFor="prescription_date"
                className="block text-sm font-medium"
              >
                Fecha de Receta *
              </Label>
              <Input
                id="prescription_date"
                type="date"
                className="w-full"
                value={formData.prescription_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    prescription_date: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label
                htmlFor="expiration_date"
                className="block text-sm font-medium"
              >
                Fecha de Vencimiento
              </Label>
              <Input
                id="expiration_date"
                className="w-full"
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
                htmlFor="prescription_number"
                className="block text-sm font-medium"
              >
                Número de Receta
              </Label>
              <Input
                id="prescription_number"
                className="w-full"
                value={formData.prescription_number}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    prescription_number: e.target.value,
                  }))
                }
                placeholder="Número único de receta"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="issued_by" className="block text-sm font-medium">
                Emitida por
              </Label>
              <Input
                id="issued_by"
                className="w-full"
                value={formData.issued_by}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    issued_by: e.target.value,
                  }))
                }
                placeholder="Nombre del oftalmólogo/optómetra"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label
                htmlFor="issued_by_license"
                className="block text-sm font-medium"
              >
                Licencia Profesional
              </Label>
              <Input
                id="issued_by_license"
                className="w-full"
                value={formData.issued_by_license}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    issued_by_license: e.target.value,
                  }))
                }
                placeholder="Número de licencia"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label
                htmlFor="prescription_type"
                className="block text-sm font-medium"
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
                  id="prescription_type"
                  className="w-full min-w-0"
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
              <Label htmlFor="od_sphere" className="block text-sm font-medium">
                Esfera (SPH)
              </Label>
              <Input
                id="od_sphere"
                type="number"
                step="0.25"
                value={formData.od_sphere}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    od_sphere: e.target.value,
                  }))
                }
                placeholder="Ej: -2.50"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="od_cylinder"
                className="block text-sm font-medium"
              >
                Cilindro (CYL)
              </Label>
              <Input
                id="od_cylinder"
                type="number"
                step="0.25"
                value={formData.od_cylinder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    od_cylinder: e.target.value,
                  }))
                }
                placeholder="Ej: -1.00"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="od_axis" className="block text-sm font-medium">
                Eje (AXIS)
              </Label>
              <Input
                id="od_axis"
                type="number"
                min="0"
                max="180"
                value={formData.od_axis}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, od_axis: e.target.value }))
                }
                placeholder="0-180"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="od_add" className="block text-sm font-medium">
                Adición (ADD)
              </Label>
              <Input
                id="od_add"
                type="number"
                step="0.25"
                value={formData.od_add}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, od_add: e.target.value }))
                }
                placeholder="Para lectura"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prism_od" className="block text-sm font-medium">
                Prisma OD
              </Label>
              <Input
                id="prism_od"
                value={formData.prism_od}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prism_od: e.target.value }))
                }
                placeholder="Ej: 2.0 Base Up"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tint_od" className="block text-sm font-medium">
                Tinte OD
              </Label>
              <Input
                id="tint_od"
                value={formData.tint_od}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tint_od: e.target.value }))
                }
                placeholder="Ej: Gris 20%"
                className="w-full"
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
              <Label htmlFor="os_sphere" className="block text-sm font-medium">
                Esfera (SPH)
              </Label>
              <Input
                id="os_sphere"
                type="number"
                step="0.25"
                value={formData.os_sphere}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    os_sphere: e.target.value,
                  }))
                }
                placeholder="Ej: -2.50"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="os_cylinder"
                className="block text-sm font-medium"
              >
                Cilindro (CYL)
              </Label>
              <Input
                id="os_cylinder"
                type="number"
                step="0.25"
                value={formData.os_cylinder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    os_cylinder: e.target.value,
                  }))
                }
                placeholder="Ej: -1.00"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="os_axis" className="block text-sm font-medium">
                Eje (AXIS)
              </Label>
              <Input
                id="os_axis"
                type="number"
                min="0"
                max="180"
                value={formData.os_axis}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, os_axis: e.target.value }))
                }
                placeholder="0-180"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="os_add" className="block text-sm font-medium">
                Adición (ADD)
              </Label>
              <Input
                id="os_add"
                type="number"
                step="0.25"
                value={formData.os_add}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, os_add: e.target.value }))
                }
                placeholder="Para lectura"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prism_os" className="block text-sm font-medium">
                Prisma OS
              </Label>
              <Input
                id="prism_os"
                value={formData.prism_os}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prism_os: e.target.value }))
                }
                placeholder="Ej: 2.0 Base Up"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tint_os" className="block text-sm font-medium">
                Tinte OS
              </Label>
              <Input
                id="tint_os"
                value={formData.tint_os}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tint_os: e.target.value }))
                }
                placeholder="Ej: Gris 20%"
                className="w-full"
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
              <Label htmlFor="pd" className="block text-sm font-medium">
                PD Lejos (Distancia)
              </Label>
              <Input
                id="pd"
                type="number"
                step="0.1"
                value={formData.pd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pd: e.target.value }))
                }
                placeholder="mm (binocular)"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="near_pd" className="block text-sm font-medium">
                PD Cerca (Lectura)
              </Label>
              <Input
                id="near_pd"
                type="number"
                step="0.1"
                value={formData.near_pd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, near_pd: e.target.value }))
                }
                placeholder="mm (binocular)"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frame_pd" className="block text-sm font-medium">
                PD del Marco
              </Label>
              <Input
                id="frame_pd"
                type="number"
                step="0.1"
                value={formData.frame_pd}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, frame_pd: e.target.value }))
                }
                placeholder="Distancia entre lentes (mm)"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="height_segmentation"
                className="block text-sm font-medium"
              >
                Altura de Segmentación
              </Label>
              <Input
                id="height_segmentation"
                type="number"
                step="0.1"
                value={formData.height_segmentation}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    height_segmentation: e.target.value,
                  }))
                }
                placeholder="Para bifocal/progresivo (mm)"
                className="w-full"
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
            <Label htmlFor="observations" className="block text-sm font-medium">
              Observaciones Clínicas
            </Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  observations: e.target.value,
                }))
              }
              placeholder="Observaciones del examen..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="recommendations"
              className="block text-sm font-medium"
            >
              Recomendaciones
            </Label>
            <Textarea
              id="recommendations"
              value={formData.recommendations}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  recommendations: e.target.value,
                }))
              }
              placeholder="Recomendaciones para el paciente..."
              rows={3}
            />
          </div>
          <div>
            <Label>Notas Generales</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Notas adicionales..."
              rows={3}
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
        <Button type="submit" disabled={saving}>
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
