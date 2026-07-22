"use client";

import { FileText, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PrescriptionsConfigProps {
  localValue: number;
  isUpdating: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  onValueChange: (value: number) => void;
  onSave: () => void;
}

export default function PrescriptionsConfig({
  localValue,
  isUpdating,
  isSaving,
  hasChanges,
  onValueChange,
  onSave,
}: PrescriptionsConfigProps) {
  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="p-4 sm:p-6 pb-0">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
          <div className="flex items-center">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Recetas
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-4">
        <p className="text-xs sm:text-sm text-epoch-primary/80 mb-4">
          Configura el tiempo de expiración por defecto de las recetas
          oftalmológicas.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 w-full sm:max-w-[200px]">
            <Label
              className="text-xs sm:text-sm"
              htmlFor="prescription_expiration_months"
            >
              Tiempo de expiración por defecto (meses)
            </Label>
            <Input
              className="mt-2 rounded-xl"
              disabled={isUpdating || isSaving}
              id="prescription_expiration_months"
              max={24}
              min={1}
              type="number"
              value={localValue}
              onChange={(e) => onValueChange(parseInt(e.target.value, 10) || 6)}
            />
          </div>
          <Button
            className="min-w-[100px] rounded-xl min-h-[44px] w-full sm:w-auto"
            disabled={isSaving || !hasChanges}
            size="sm"
            onClick={onSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" /> Guardar
              </>
            )}
          </Button>
        </div>
        <p className="text-[10px] sm:text-xs text-epoch-primary/70 mt-2">
          Valor por defecto: 6 meses. Ejemplo: receta del 10/02 → vencimiento
          10/08.
        </p>
      </CardContent>
    </Card>
  );
}
