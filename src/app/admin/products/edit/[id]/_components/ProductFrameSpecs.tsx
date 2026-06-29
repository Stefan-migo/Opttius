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

interface FrameMeasurements {
  lens_width: string;
  bridge_width: string;
  temple_length: string;
  lens_height: string;
  total_width: string;
}

interface ProductFrameSpecsProps {
  frameType: string;
  frameMaterial: string;
  frameShape: string;
  frameGender: string;
  frameSize: string;
  frameColor: string;
  frameMeasurements: FrameMeasurements;
  frameFeatures: string[];
  frameTypes: readonly unknown[];
  frameMaterials: readonly unknown[];
  frameShapes: readonly unknown[];
  frameGenders: readonly unknown[];
  frameSizes: readonly unknown[];
  frameFeaturesOptions: string[];
  onFieldChange: (field: string, value: unknown) => void;
  onAddToArray: (field: string, value: string) => void;
  onRemoveFromArray: (field: string, value: string) => void;
  onUpdateFrameMeasurement: (field: string, value: string) => void;
}

export function ProductFrameSpecs({
  frameType,
  frameMaterial,
  frameShape,
  frameGender,
  frameSize,
  frameColor,
  frameMeasurements,
  frameFeatures,
  frameTypes,
  frameMaterials,
  frameShapes,
  frameGenders,
  frameSizes,
  frameFeaturesOptions,
  onFieldChange,
  onAddToArray,
  onRemoveFromArray,
  onUpdateFrameMeasurement,
}: ProductFrameSpecsProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Especificaciones del Armazón</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          <div>
            <Label>Tipo de Armazón</Label>
            <Select
              value={frameType}
              onValueChange={(value) =>
                onFieldChange("frame_type", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {(frameTypes as any[]).map((type: any) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Material del Armazón</Label>
            <Select
              value={frameMaterial}
              onValueChange={(value) =>
                onFieldChange("frame_material", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar material" />
              </SelectTrigger>
              <SelectContent>
                {(frameMaterials as any[]).map((material: any) => (
                  <SelectItem key={material.value} value={material.value}>
                    {material.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Forma del Armazón</Label>
            <Select
              value={frameShape}
              onValueChange={(value) =>
                onFieldChange("frame_shape", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar forma" />
              </SelectTrigger>
              <SelectContent>
                {(frameShapes as any[]).map((shape: any) => (
                  <SelectItem key={shape.value} value={shape.value}>
                    {shape.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Género</Label>
            <Select
              value={frameGender}
              onValueChange={(value) =>
                onFieldChange("frame_gender", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar género" />
              </SelectTrigger>
              <SelectContent>
                {(frameGenders as any[]).map((gender: any) => (
                  <SelectItem key={gender.value} value={gender.value}>
                    {gender.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tamaño</Label>
            <Select
              value={frameSize}
              onValueChange={(value) =>
                onFieldChange("frame_size", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tamaño" />
              </SelectTrigger>
              <SelectContent>
                {(frameSizes as any[]).map((size: any) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color Principal</Label>
            <Input
              className="border-black/20"
              placeholder="Ej: Negro"
              value={frameColor}
              onChange={(e) =>
                onFieldChange("frame_color", e.target.value)
              }
            />
          </div>
        </div>

        {/* Frame Measurements */}
        <div>
          <Label className="mb-2 block">Medidas del Armazón (mm)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            <div>
              <Label className="text-xs">Ancho de Lente</Label>
              <Input
                className="border-black/20"
                placeholder="52"
                type="number"
                value={frameMeasurements.lens_width}
                onChange={(e) =>
                  onUpdateFrameMeasurement("lens_width", e.target.value)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Puente</Label>
              <Input
                className="border-black/20"
                placeholder="18"
                type="number"
                value={frameMeasurements.bridge_width}
                onChange={(e) =>
                  onUpdateFrameMeasurement("bridge_width", e.target.value)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Largo de Varilla</Label>
              <Input
                className="border-black/20"
                placeholder="140"
                type="number"
                value={frameMeasurements.temple_length}
                onChange={(e) =>
                  onUpdateFrameMeasurement("temple_length", e.target.value)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Alto de Lente</Label>
              <Input
                className="border-black/20"
                placeholder="40"
                type="number"
                value={frameMeasurements.lens_height}
                onChange={(e) =>
                  onUpdateFrameMeasurement("lens_height", e.target.value)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Ancho Total</Label>
              <Input
                className="border-black/20"
                placeholder="140"
                type="number"
                value={frameMeasurements.total_width}
                onChange={(e) =>
                  onUpdateFrameMeasurement("total_width", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Frame Features */}
        <div>
          <Label>Características del Armazón</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {frameFeatures.map((feature) => (
              <Badge
                className="flex items-center gap-1"
                key={feature}
                variant="secondary"
              >
                {feature.replace(/_/g, " ")}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() =>
                    onRemoveFromArray("frame_features", feature)
                  }
                />
              </Badge>
            ))}
          </div>
          <Select
            onValueChange={(value) => onAddToArray("frame_features", value)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Agregar característica" />
            </SelectTrigger>
            <SelectContent>
              {frameFeaturesOptions
                .filter((f) => !frameFeatures.includes(f))
                .map((feature) => (
                  <SelectItem key={feature} value={feature}>
                    {feature.replace(/_/g, " ")}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
