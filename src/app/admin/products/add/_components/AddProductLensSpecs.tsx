"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

interface PrescriptionRange {
  sph_min: string;
  sph_max: string;
  cyl_min: string;
  cyl_max: string;
  add_min: string;
  add_max: string;
}

interface ProductLensSpecsProps {
  lensType: string;
  lensMaterial: string;
  lensIndex: string;
  uvProtection: string;
  blueLightFilter: boolean;
  blueLightFilterPercentage: string;
  photochromic: boolean;
  prescriptionAvailable: boolean;
  lensCoatings: string[];
  prescriptionRange: PrescriptionRange;
  lensTypes: readonly unknown[];
  lensMaterials: readonly unknown[];
  uvProtectionLevels: readonly unknown[];
  lensCoatingOptions: string[];
  onFieldChange: (field: string, value: unknown) => void;
  onAddToArray: (field: string, value: string) => void;
  onRemoveFromArray: (field: string, value: string) => void;
  onUpdatePrescriptionRange: (field: string, value: string) => void;
}

export function AddProductLensSpecs({
  lensType,
  lensMaterial,
  lensIndex,
  uvProtection,
  blueLightFilter,
  blueLightFilterPercentage,
  photochromic,
  prescriptionAvailable,
  lensCoatings,
  prescriptionRange,
  lensTypes,
  lensMaterials,
  uvProtectionLevels,
  lensCoatingOptions,
  onFieldChange,
  onAddToArray,
  onRemoveFromArray,
  onUpdatePrescriptionRange,
}: ProductLensSpecsProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Especificaciones del Lente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          <div>
            <Label>Tipo de Lente</Label>
            <Select
              value={lensType}
              onValueChange={(value) =>
                onFieldChange("lens_type", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {(lensTypes as any[]).map((type: any) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Material del Lente</Label>
            <Select
              value={lensMaterial}
              onValueChange={(value) =>
                onFieldChange("lens_material", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar material" />
              </SelectTrigger>
              <SelectContent>
                {(lensMaterials as any[]).map((material: any) => (
                  <SelectItem key={material.value} value={material.value}>
                    {material.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Índice de Refracción</Label>
            <Input
              className="border-black/20"
              placeholder="Ej: 1.67"
              step="0.01"
              type="number"
              value={lensIndex}
              onChange={(e) =>
                onFieldChange("lens_index", e.target.value)
              }
            />
          </div>
          <div>
            <Label>Protección UV</Label>
            <Select
              value={uvProtection}
              onValueChange={(value) =>
                onFieldChange("uv_protection", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar nivel" />
              </SelectTrigger>
              <SelectContent>
                {(uvProtectionLevels as any[]).map((level: any) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          <div className="flex items-center space-x-2">
            <input
              checked={blueLightFilter}
              className="rounded"
              id="blue_light_filter"
              type="checkbox"
              onChange={(e) =>
                onFieldChange("blue_light_filter", e.target.checked)
              }
            />
            <Label htmlFor="blue_light_filter">Filtro de Luz Azul</Label>
          </div>
          {blueLightFilter && (
            <div>
              <Label>Porcentaje de Filtro (%)</Label>
              <Input
                className="border-black/20"
                max="100"
                min="0"
                placeholder="Ej: 40"
                type="number"
                value={blueLightFilterPercentage}
                onChange={(e) =>
                  onFieldChange(
                    "blue_light_filter_percentage",
                    e.target.value,
                  )
                }
              />
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              checked={photochromic}
              className="rounded"
              id="photochromic"
              type="checkbox"
              onChange={(e) =>
                onFieldChange("photochromic", e.target.checked)
              }
            />
            <Label htmlFor="photochromic">
              Fotocromático (Transitions)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              checked={prescriptionAvailable}
              className="rounded"
              id="prescription_available"
              type="checkbox"
              onChange={(e) =>
                onFieldChange(
                  "prescription_available",
                  e.target.checked,
                )
              }
            />
            <Label htmlFor="prescription_available">
              Disponible con Receta
            </Label>
          </div>
        </div>

        {/* Lens Coatings */}
        <div>
          <Label>Tratamientos y Recubrimientos</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {lensCoatings.map((coating) => (
              <Badge
                className="flex items-center gap-1"
                key={coating}
                variant="secondary"
              >
                {coating.replace(/_/g, " ")}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() =>
                    onRemoveFromArray("lens_coatings", coating)
                  }
                />
              </Badge>
            ))}
          </div>
          <Select
            onValueChange={(value) => onAddToArray("lens_coatings", value)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Agregar tratamiento" />
            </SelectTrigger>
            <SelectContent>
              {lensCoatingOptions
                .filter((c) => !lensCoatings.includes(c))
                .map((coating) => (
                  <SelectItem key={coating} value={coating}>
                    {coating.replace(/_/g, " ")}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prescription Range */}
        {prescriptionAvailable && (
          <div>
            <Label className="mb-2 block">
              Rango de Receta Soportado
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 min-w-0">
              <div>
                <Label className="text-xs">SPH Mínimo</Label>
                <Input
                  className="border-black/20"
                  placeholder="-10.00"
                  step="0.25"
                  type="number"
                  value={prescriptionRange.sph_min}
                  onChange={(e) =>
                    onUpdatePrescriptionRange("sph_min", e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="text-xs">SPH Máximo</Label>
                <Input
                  className="border-black/20"
                  placeholder="+6.00"
                  step="0.25"
                  type="number"
                  value={prescriptionRange.sph_max}
                  onChange={(e) =>
                    onUpdatePrescriptionRange("sph_max", e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="text-xs">CIL Mínimo</Label>
                <Input
                  className="border-black/20"
                  placeholder="-4.00"
                  step="0.25"
                  type="number"
                  value={prescriptionRange.cyl_min}
                  onChange={(e) =>
                    onUpdatePrescriptionRange("cyl_min", e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="text-xs">CIL Máximo</Label>
                <Input
                  className="border-black/20"
                  placeholder="+4.00"
                  step="0.25"
                  type="number"
                  value={prescriptionRange.cyl_max}
                  onChange={(e) =>
                    onUpdatePrescriptionRange("cyl_max", e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="text-xs">ADD Mínimo</Label>
                <Input
                  className="border-black/20"
                  placeholder="0.00"
                  step="0.25"
                  type="number"
                  value={prescriptionRange.add_min}
                  onChange={(e) =>
                    onUpdatePrescriptionRange("add_min", e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="text-xs">ADD Máximo</Label>
                <Input
                  className="border-black/20"
                  placeholder="+4.00"
                  step="0.25"
                  type="number"
                  value={prescriptionRange.add_max}
                  onChange={(e) =>
                    onUpdatePrescriptionRange("add_max", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
