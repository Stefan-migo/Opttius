"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/ui/RichTextEditor";

interface ProductWarrantySectionProps {
  warrantyMonths: string;
  requiresPrescription: boolean;
  isCustomizable: boolean;
  warrantyDetails: string;
  onFieldChange: (field: string, value: unknown) => void;
}

export function ProductWarrantySection({
  warrantyMonths,
  requiresPrescription,
  isCustomizable,
  warrantyDetails,
  onFieldChange,
}: ProductWarrantySectionProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Garantía e Información Adicional</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          <div>
            <Label htmlFor="warranty_months">Garantía (meses)</Label>
            <Input
              className="border-black/20"
              id="warranty_months"
              placeholder="Ej: 12"
              type="number"
              value={warrantyMonths}
              onChange={(e) =>
                onFieldChange("warranty_months", e.target.value)
              }
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              checked={requiresPrescription}
              className="rounded"
              id="requires_prescription"
              type="checkbox"
              onChange={(e) =>
                onFieldChange("requires_prescription", e.target.checked)
              }
            />
            <Label htmlFor="requires_prescription">Requiere Receta</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              checked={isCustomizable}
              className="rounded"
              id="is_customizable"
              type="checkbox"
              onChange={(e) =>
                onFieldChange("is_customizable", e.target.checked)
              }
            />
            <Label htmlFor="is_customizable">Personalizable</Label>
          </div>
        </div>
        <div>
          <Label htmlFor="warranty_details">Detalles de Garantía</Label>
          <RichTextEditor
            placeholder="Detalles de la garantía, condiciones, etc."
            rows={3}
            value={warrantyDetails}
            onChange={(value) =>
              onFieldChange("warranty_details", value)
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
