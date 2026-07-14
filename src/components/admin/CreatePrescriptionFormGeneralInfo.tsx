"use client";

import { FileText } from "lucide-react";

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

interface Props {
  formData: Record<string, unknown>;
  prescriptionTypes: { value: string; label: string }[];
  onChange: (field: string, value: unknown) => void;
}

export function PrescriptionFormGeneralInfo({
  formData,
  prescriptionTypes,
  onChange,
}: Props) {
  return (
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
            <Label className="block text-sm font-medium" htmlFor="prescription_date">
              Fecha de Receta *
            </Label>
            <Input
              required
              className="w-full"
              id="prescription_date"
              type="date"
              value={(formData.prescription_date as string) || ""}
              onChange={(e) => onChange("prescription_date", e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className="block text-sm font-medium" htmlFor="expiration_date">
              Fecha de Vencimiento
            </Label>
            <Input
              className="w-full"
              id="expiration_date"
              type="date"
              value={(formData.expiration_date as string) || ""}
              onChange={(e) => onChange("expiration_date", e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className="block text-sm font-medium" htmlFor="prescription_number">
              Número de Receta
            </Label>
            <Input
              className="w-full"
              id="prescription_number"
              placeholder="Número único de receta"
              value={(formData.prescription_number as string) || ""}
              onChange={(e) => onChange("prescription_number", e.target.value)}
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
              value={(formData.issued_by as string) || ""}
              onChange={(e) => onChange("issued_by", e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className="block text-sm font-medium" htmlFor="issued_by_license">
              Licencia Profesional
            </Label>
            <Input
              className="w-full"
              id="issued_by_license"
              placeholder="Número de licencia"
              value={(formData.issued_by_license as string) || ""}
              onChange={(e) => onChange("issued_by_license", e.target.value)}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className="block text-sm font-medium" htmlFor="prescription_type">
              Tipo de Receta
            </Label>
            <Select
              value={(formData.prescription_type as string) || ""}
              onValueChange={(value) => onChange("prescription_type", value)}
            >
              <SelectTrigger className="w-full min-w-0" id="prescription_type">
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
  );
}
