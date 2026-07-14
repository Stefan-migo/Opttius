"use client";

import { Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  formData: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export function PrescriptionFormPupillaryDistance({ formData, onChange }: Props) {
  return (
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
              value={(formData.pd as string) || ""}
              onChange={(e) => onChange("pd", e.target.value)}
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
              value={(formData.near_pd as string) || ""}
              onChange={(e) => onChange("near_pd", e.target.value)}
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
              value={(formData.frame_pd as string) || ""}
              onChange={(e) => onChange("frame_pd", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="block text-sm font-medium" htmlFor="height_segmentation">
              Altura de Segmentación
            </Label>
            <Input
              className="w-full"
              id="height_segmentation"
              placeholder="Para bifocal/progresivo (mm)"
              step="0.1"
              type="number"
              value={(formData.height_segmentation as string) || ""}
              onChange={(e) => onChange("height_segmentation", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
