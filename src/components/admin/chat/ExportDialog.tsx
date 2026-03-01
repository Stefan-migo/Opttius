"use client";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  FileJson,
  FileText,
  FileCode,
  FileSpreadsheet,
  Copy,
  Check,
} from "lucide-react";
import { exportConversation, copyToClipboard } from "@/lib/utils/chatExport";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  messages: any[];
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
          onValueChange={(value) => setFormat(value as any)}
        >
          <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/60 cursor-pointer transition-colors">
            <RadioGroupItem value="json" id="json" />
            <Label
              htmlFor="json"
              className="flex-1 cursor-pointer flex items-center gap-2 text-foreground"
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
            <RadioGroupItem value="markdown" id="markdown" />
            <Label
              htmlFor="markdown"
              className="flex-1 cursor-pointer flex items-center gap-2 text-foreground"
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
            <RadioGroupItem value="txt" id="txt" />
            <Label
              htmlFor="txt"
              className="flex-1 cursor-pointer flex items-center gap-2 text-foreground"
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
            <RadioGroupItem value="csv" id="csv" />
            <Label
              htmlFor="csv"
              className="flex-1 cursor-pointer flex items-center gap-2 text-foreground"
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
            variant="outline"
            onClick={handleCopyToClipboard}
            className="flex items-center gap-2"
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
