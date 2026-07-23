"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuoteNotesCard({
  notes, customerNotes, termsAndConditions,
}: {
  notes?: string | null;
  customerNotes?: string | null;
  termsAndConditions?: string | null;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Notas y Observaciones</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {notes && (
          <div>
            <p className="text-sm text-admin-text-tertiary mb-1">Notas Internas</p>
            <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary border border-admin-border-secondary/50 p-3 rounded-lg">{notes}</p>
          </div>
        )}
        {customerNotes && (
          <div>
            <p className="text-sm text-admin-text-tertiary mb-1">Notas para el Cliente</p>
            <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary border border-admin-border-secondary/50 p-3 rounded-lg">{customerNotes}</p>
          </div>
        )}
        {termsAndConditions && (
          <div>
            <p className="text-sm text-admin-text-tertiary mb-1">Términos y Condiciones</p>
            <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary border border-admin-border-secondary/50 p-3 rounded-lg">{termsAndConditions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
