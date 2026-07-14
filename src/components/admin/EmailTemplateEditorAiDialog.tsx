"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (prompt: string) => void;
}

export function EmailTemplateEditorAiDialog({
  open,
  loading,
  onOpenChange,
  onGenerate,
}: Props) {
  const [aiPrompt, setAiPrompt] = useState("");

  const handleGenerate = () => {
    if (aiPrompt.trim()) {
      onGenerate(aiPrompt.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Asistir con IA
          </DialogTitle>
          <DialogDescription>
            Describe lo que quieres que genere la IA (ej. &quot;Plantilla de
            bienvenida para clientes nuevos&quot;). Usará el tipo de plantilla
            actual y las variables disponibles.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          className="resize-none"
          placeholder="Ej: Plantilla de bienvenida cálida para clientes nuevos que acaban de registrarse..."
          rows={4}
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setAiPrompt("");
            }}
          >
            Cancelar
          </Button>
          <Button disabled={loading} type="button" onClick={handleGenerate}>
            {loading ? "Generando..." : "Generar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
