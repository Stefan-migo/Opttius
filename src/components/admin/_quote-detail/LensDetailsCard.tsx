"use client";

import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLensTypeLabel } from "@/lib/lens-type-labels";
import { formatCurrency } from "@/lib/utils";

interface LensData {
  lens_type?: string | null;
  lens_material?: string | null;
  lens_index?: string | null;
  lens_treatments?: string[] | null;
  lens_tint_color?: string | null;
  lens_tint_percentage?: number | null;
  presbyopia_solution?: string | null;
}

export function LensDetailsCard({
  lens,
  familyName,
  cost,
  title = "Detalles del Lente",
  badgeText,
  family,
}: {
  lens: LensData;
  familyName?: string | null;
  cost?: number | null;
  title?: string;
  badgeText?: string;
  family?: { name: string } | null;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center"><Eye className="h-5 w-5 mr-2" />{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lens.lens_type && <div><p className="text-xs text-admin-text-tertiary">Tipo de Lente</p><p className="font-medium">{getLensTypeLabel(lens.lens_type)}</p></div>}
          {(familyName || family) && (
            <div>
              <p className="text-xs text-admin-text-tertiary">Familia de lente</p>
              <p className="font-medium">{(familyName) || family?.name || "—"}</p>
            </div>
          )}
          {lens.lens_material && <div><p className="text-xs text-admin-text-tertiary">Material</p><p className="font-medium">{lens.lens_material}</p></div>}
          {lens.lens_index && <div><p className="text-xs text-admin-text-tertiary">Índice de Refracción</p><p className="font-medium">{lens.lens_index}</p></div>}
          {lens.lens_treatments && lens.lens_treatments.length > 0 && (
            <div><p className="text-xs text-admin-text-tertiary">Tratamientos</p><div className="flex flex-wrap gap-1 mt-1">{lens.lens_treatments.map((t, i) => <Badge key={i} variant="outline">{t}</Badge>)}</div></div>
          )}
          {lens.lens_tint_color && <div><p className="text-xs text-admin-text-tertiary">Color del Tinte</p><p className="font-medium">{lens.lens_tint_color}</p></div>}
          {lens.lens_tint_percentage && <div><p className="text-xs text-admin-text-tertiary">Porcentaje de Tinte</p><p className="font-medium">{lens.lens_tint_percentage}%</p></div>}
          {cost !== undefined && cost !== null && <div><p className="text-xs text-admin-text-tertiary">Costo del Lente</p><p className="font-semibold text-admin-success">{formatCurrency(cost)}</p></div>}
          {lens.presbyopia_solution && lens.presbyopia_solution !== "none" && (
            <div>
              <p className="text-xs text-admin-text-tertiary">Solución para Presbicia</p>
              <Badge variant="outline">
                {lens.presbyopia_solution === "progressive" ? "Progresivo" : lens.presbyopia_solution === "bifocal" ? "Bifocal" : lens.presbyopia_solution === "trifocal" ? "Trifocal" : lens.presbyopia_solution}
              </Badge>
            </div>
          )}
          {badgeText && <div className="text-xs text-admin-text-tertiary"><p className="mb-1">Solución para Presbicia:</p><Badge variant="outline">{badgeText}</Badge></div>}
        </div>
      </CardContent>
    </Card>
  );
}
