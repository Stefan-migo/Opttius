"use client";

import {
  Check,
  Copy,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { copyToClipboard, exportConversation } from "@/lib/utils/chatExport";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: unknown;
  messages: unknown[];
}

export function ExportDialog({
  open,
  onOpenChange,
  session,
  messages,
}: ExportDialogProps) {
  const [format, setFormat] = useState<"json" | "markdown" | "txt" | "csv">(
    "markdown",
  );
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    if (!session || !messages) return;

    exportConversation(
      {
        session,
        messages,
      },
      format,
    );
    onOpenChange(false);
  };

  const handleCopyToClipboard = async () => {
    if (!session || !messages) return;

    const success = await copyToClipboard(
      {
        session,
        messages,
      },
      format,
    );

    if (success) {
      setCopied(true);
      toast.success("Copiado al portapapeles");
      setTimeout(() => {
        setCopied(false);
        onOpenChange(false);
      }, 1500);
    } else {
      toast.error("Error al copiar al portapapeles");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent elevateZIndex>
        <DialogHeader>
          <DialogTitle>Exportar Conversación</DialogTitle>
          <DialogDescription>
            Selecciona el formato en el que deseas exportar esta conversación.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={format}
          onValueChange={(value) => setFormat(value as unknown)}
        >
          <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/60 cursor-pointer transition-colors">
            <RadioGroupItem id="json" value="json" />
            <Label
              className="flex-1 cursor-pointer flex items-center gap-2 text-foreground"
              htmlFor="json"
            >
              <FileJson className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">JSON</div>
                <div className="text-xs text-muted-foreground">
                  Export completo con metadata
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/60 cursor-pointer transition-colors">
            <RadioGroupItem id="markdown" value="markdown" />
            <Label
              className="flex-1 cursor-pointer flex items-center gap-2 text-foreground"
              htmlFor="markdown"
            >
              <FileCode className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Markdown</div>
                <div className="text-xs text-muted-foreground">
                  Formato legible con timestamps
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/60 cursor-pointer transition-colors">
            <RadioGroupItem id="txt" value="txt" />
            <Label
              className="flex-1 cursor-pointer flex items-center gap-2 text-foreground"
              htmlFor="txt"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Texto Plano</div>
                <div className="text-xs text-muted-foreground">
                  Formato simple de texto
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/60 cursor-pointer transition-colors">
            <RadioGroupItem id="csv" value="csv" />
            <Label
              className="flex-1 cursor-pointer flex items-center gap-2 text-foreground"
              htmlFor="csv"
            >
              <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">CSV</div>
                <div className="text-xs text-muted-foreground">
                  Para análisis (solo mensajes)
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex items-center gap-2"
            variant="outline"
            onClick={handleCopyToClipboard}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar al Portapapeles
              </>
            )}
          </Button>
          <Button onClick={handleExport}>Descargar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
