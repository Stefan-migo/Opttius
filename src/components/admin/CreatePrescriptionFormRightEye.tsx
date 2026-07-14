"use client";

import { Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  formData: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export function PrescriptionFormRightEye({ formData, onChange }: Props) {
  return (
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
              value={(formData.od_sphere as string) || ""}
              onChange={(e) => onChange("od_sphere", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="block text-sm font-medium" htmlFor="od_cylinder">
              Cilindro (CYL)
            </Label>
            <Input
              className="w-full"
              id="od_cylinder"
              placeholder="Ej: -1.00"
              step="0.25"
              type="number"
              value={(formData.od_cylinder as string) || ""}
              onChange={(e) => onChange("od_cylinder", e.target.value)}
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
              value={(formData.od_axis as string) || ""}
              onChange={(e) => onChange("od_axis", e.target.value)}
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
              value={(formData.od_add as string) || ""}
              onChange={(e) => onChange("od_add", e.target.value)}
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
              value={(formData.prism_od as string) || ""}
              onChange={(e) => onChange("prism_od", e.target.value)}
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
              value={(formData.tint_od as string) || ""}
              onChange={(e) => onChange("tint_od", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
