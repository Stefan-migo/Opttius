"use client";

import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Props {
  formData: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  saving: boolean;
  isEdit: boolean;
  onCancel: () => void;
}

export function PrescriptionFormStatus({
  formData,
  onChange,
  saving,
  isEdit,
  onCancel,
}: Props) {
  return (
    <>
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
              checked={!!formData.is_active}
              onCheckedChange={(checked) => onChange("is_active", checked)}
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
              checked={!!formData.is_current}
              onCheckedChange={(checked) => onChange("is_current", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={saving} type="submit">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              {isEdit ? "Actualizar Receta" : "Crear Receta"}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
