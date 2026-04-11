"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HelpDialogProps {
  title: string;
  description: string;
  details?: string[];
  formula?: string;
  example?: string;
}

export function HelpDialog({
  title,
  description,
  details,
  formula,
  example,
}: HelpDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-6 w-6 p-0 hover:bg-azul-profundo/10"
          size="sm"
          title={`Ayuda: ${title}`}
          variant="ghost"
        >
          <HelpCircle className="h-4 w-4 text-tierra-media hover:text-azul-profundo transition-colors" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-azul-profundo">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base text-gray-700 pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {details && details.length > 0 && (
            <div>
              <h4 className="font-semibold text-azul-profundo mb-2">
                ¿Qué muestra?
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {formula && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-azul-profundo mb-2">Fórmula</h4>
              <code className="text-sm text-gray-800 font-mono bg-white px-2 py-1 rounded border">
                {formula}
              </code>
            </div>
          )}

          {example && (
            <div className="bg-verde-suave/10 border border-verde-suave/30 rounded-lg p-4">
              <h4 className="font-semibold text-azul-profundo mb-2">Ejemplo</h4>
              <p className="text-sm text-gray-700">{example}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-azul-profundo mb-2">💡 Nota</h4>
            <p className="text-sm text-gray-700">
              Los datos se calculan en base al período seleccionado (7, 30, 90 o
              365 días). Si no ves datos, puede ser porque aún no hay
              información registrada en el sistema para ese período.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
