"use client";

import { Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  formData: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export function PrescriptionFormLeftEye({ formData, onChange }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2 min-w-0 truncate">
          <Eye className="h-5 w-5 shrink-0" />
          <span className="truncate">Ojo Izquierdo (OS - Oculus Sinister)</span>
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
              value={(formData.os_sphere as string) || ""}
              onChange={(e) => onChange("os_sphere", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="block text-sm font-medium" htmlFor="os_cylinder">
              Cilindro (CYL)
            </Label>
            <Input
              className="w-full"
              id="os_cylinder"
              placeholder="Ej: -1.00"
              step="0.25"
              type="number"
              value={(formData.os_cylinder as string) || ""}
              onChange={(e) => onChange("os_cylinder", e.target.value)}
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
              value={(formData.os_axis as string) || ""}
              onChange={(e) => onChange("os_axis", e.target.value)}
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
              value={(formData.os_add as string) || ""}
              onChange={(e) => onChange("os_add", e.target.value)}
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
              value={(formData.prism_os as string) || ""}
              onChange={(e) => onChange("prism_os", e.target.value)}
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
              value={(formData.tint_os as string) || ""}
              onChange={(e) => onChange("tint_os", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
