"use client";

import { FileText } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuoteSettings } from "@/lib/api/services";

interface QuoteTermsTabProps {
  termsAndConditions: string;
  notesTemplate: string;
  onUpdateSetting: <K extends keyof QuoteSettings>(
    key: K,
    value: QuoteSettings[K],
  ) => void;
}

export function QuoteTermsTab({
  termsAndConditions,
  notesTemplate,
  onUpdateSetting,
}: QuoteTermsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Términos y Condiciones / Plantilla de Notas
        </CardTitle>
        <CardDescription>
          Configura texto por defecto para términos y condiciones y notas
          en los presupuestos. Estos textos aparecerán automáticamente en
          los nuevos presupuestos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-base font-semibold">
            Términos y Condiciones por Defecto
          </Label>
          <Textarea
            className="mt-1 font-mono text-sm"
            placeholder="Ingresa los términos y condiciones por defecto para los presupuestos..."
            rows={8}
            value={termsAndConditions}
            onChange={(e) =>
              onUpdateSetting("terms_and_conditions", e.target.value)
            }
          />
          <p className="text-xs text-admin-text-tertiary">
            Este texto aparecerá en la sección de términos y condiciones
            de los presupuestos
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold">
            Plantilla de Notas
          </Label>
          <Textarea
            className="mt-1 font-mono text-sm"
            placeholder="Ingresa una plantilla de notas por defecto..."
            rows={6}
            value={notesTemplate}
            onChange={(e) =>
              onUpdateSetting("notes_template", e.target.value)
            }
          />
          <p className="text-xs text-admin-text-tertiary">
            Esta plantilla se usará como base para las notas en los
            presupuestos
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
