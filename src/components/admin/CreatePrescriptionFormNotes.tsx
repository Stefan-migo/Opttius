"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  formData: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export function PrescriptionFormNotes({ formData, onChange }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="min-w-0 truncate">Notas y Observaciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 min-w-0">
        <div className="space-y-2">
          <Label className="block text-sm font-medium" htmlFor="observations">
            Observaciones Clínicas
          </Label>
          <Textarea
            id="observations"
            placeholder="Observaciones del examen..."
            rows={3}
            value={(formData.observations as string) || ""}
            onChange={(e) => onChange("observations", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="block text-sm font-medium" htmlFor="recommendations">
            Recomendaciones
          </Label>
          <Textarea
            id="recommendations"
            placeholder="Recomendaciones para el paciente..."
            rows={3}
            value={(formData.recommendations as string) || ""}
            onChange={(e) => onChange("recommendations", e.target.value)}
          />
        </div>
        <div>
          <Label>Notas Generales</Label>
          <Textarea
            placeholder="Notas adicionales..."
            rows={3}
            value={(formData.notes as string) || ""}
            onChange={(e) => onChange("notes", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
