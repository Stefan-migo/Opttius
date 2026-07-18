"use client";

import { useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productService } from "@/lib/api/services";

interface ImportResult {
  success: boolean;
  summary: {
    total_processed: number;
    created: number;
    updated: number;
    skipped: number;
    errors_count: number;
  };
  results?: {
    errors: string[];
  };
}

interface ImportProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportProductsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportProductsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"create" | "update" | "skip">(
    "create",
  );
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleImport = async (file: File) => {
    if (!file) return;
    try {
      setProcessing(true);
      const result = await productService.importProductsFile(file, importMode);
      setImportResults(result);
      if (result.success) {
        toast.success(
          `Importación completada: ${result.summary.created} creados, ${result.summary.updated} actualizados`,
        );
        onImportComplete();
      } else {
        toast.error("Error en la importación");
      }
    } catch {
      toast.error("Error al importar productos");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Productos desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV para importar productos masivamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="import_mode">Modo de Importación</Label>
            <Select
              value={importMode}
              onValueChange={(value) =>
                setImportMode(value as "create" | "update" | "skip")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create">
                  Crear - Solo productos nuevos
                </SelectItem>
                <SelectItem value="update">
                  Actualizar - Solo productos existentes
                </SelectItem>
                <SelectItem value="upsert">
                  Crear/Actualizar - Ambos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="csv_file">Archivo CSV</Label>
            <Input
              accept=".csv"
              ref={fileInputRef}
              disabled={processing}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
            <p className="text-sm text-tierra-media mt-1">
              Formatos soportados: nombre, descripción, precio, stock, estado,
              categoría, etc.
            </p>
          </div>

          {importResults && (
            <div className="mt-4 p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Resultados de Importación</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Procesados: {importResults.summary.total_processed}</div>
                <div>Creados: {importResults.summary.created}</div>
                <div>Actualizados: {importResults.summary.updated}</div>
                <div>Omitidos: {importResults.summary.skipped}</div>
              </div>

              {importResults.results?.errors &&
                importResults.results.errors.length > 0 && (
                  <div className="mt-2">
                    <h5 className="font-medium text-red-600">Errores:</h5>
                    <ul className="text-sm text-red-600 list-disc list-inside">
                      {importResults.results.errors
                        .slice(0, 5)
                        .map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      {importResults.results.errors.length > 5 && (
                        <li>
                          ... y {importResults.results.errors.length - 5} más
                        </li>
                      )}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
