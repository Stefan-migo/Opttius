"use client";

import { Edit, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { bulkProductOperations } from "@/lib/api/services";
import { appLogger } from '@/lib/logger';
import { cn } from "@/lib/utils";

import { BulkOperationFormRenderer } from "./_components/BulkOperationFormRenderer";

interface ProductBulkActionsProps {
  selectedProducts: string[];
  categories: unknown[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export default function ProductBulkActions({
  selectedProducts,
  categories,
  onClearSelection,
  onSuccess,
}: ProductBulkActionsProps) {
  const [bulkOperation, setBulkOperation] = useState("");
  const [bulkUpdates, setBulkUpdates] = useState<unknown>({});
  const [isDeleteDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  const handleBulkOperation = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }

    if (!bulkOperation) {
      toast.error("Selecciona una operación");
      return;
    }

    try {
      setProcessing(true);

      const result = await bulkProductOperations({
        operation: bulkOperation,
        product_ids: selectedProducts,
        updates: {
          ...(bulkUpdates as Record<string, unknown>),
          force_delete: forceDelete,
        },
      });

      const affectedCount = result?.success?.length ?? selectedProducts.length;
      toast.success(
        `Operación completada: ${affectedCount} productos afectados`,
      );
      setBulkOperation("");
      setBulkUpdates({});
      setForceDelete(false);
      onClearSelection();
      onSuccess();
    } catch (error) {
      appLogger.error("Error performing bulk operation:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al realizar la operación masiva";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setBulkOperation("");
    setBulkUpdates({});
    setForceDelete(false);
    onClearSelection();
  };

  return (
    <Card
      data-bulk-panel
      className="w-full bg-admin-bg-tertiary border border-admin-border-primary/20 shadow-premium-xl rounded-xl animate-in slide-in-from-top-4 duration-500 overflow-hidden sticky top-6 z-40"
      style={{ position: "relative" }}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-admin-accent-primary" />
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-admin-accent-primary/10 border border-admin-accent-primary/20 rounded-xl">
              <Edit className="h-5 w-5 text-admin-accent-primary" />
            </div>
            <div>
              <h3 className="text-[10px] font-display font-black text-admin-text-primary tracking-[0.2em] uppercase leading-none mb-1">
                Operaciones de Archivo
              </h3>
              <p className="text-[11px] font-serif italic text-admin-text-tertiary">
                {selectedProducts.length}{" "}
                {selectedProducts.length === 1
                  ? "registro seleccionado"
                  : "registros seleccionados"}{" "}
                en cola técnica
              </p>
            </div>
          </div>
          <Button
            className="h-7 w-7 p-0 text-admin-text-tertiary hover:text-admin-text-primary"
            size="sm"
            variant="ghost"
            onClick={handleClose}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </Button>
        </div>

        {!isDeleteDialog && (
          <div className="mb-4">
            <Label
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
              htmlFor="operation"
            >
              Seleccionar Operación
            </Label>
            <Select
              value={bulkOperation ?? ""}
              onValueChange={setBulkOperation}
            >
              <SelectTrigger className="mt-1.5 h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                <SelectValue placeholder="Seleccionar operación" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary/20">
                <SelectItem value="update_status">Cambiar Estado</SelectItem>
                <SelectItem value="update_category">
                  Cambiar Categoría
                </SelectItem>
                <SelectItem value="update_pricing">Ajustar Precios</SelectItem>
                <SelectItem value="update_inventory">
                  Ajustar Inventario
                </SelectItem>
                <SelectItem value="duplicate">Duplicar Productos</SelectItem>
                <SelectItem value="delete">
                  Archivar Productos (Eliminación Suave)
                </SelectItem>
                <SelectItem
                  className="text-admin-error font-display font-bold"
                  value="hard_delete"
                >
                  ⚠️ Eliminar Permanentemente
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

          {bulkOperation && (
          <div className="pt-2 border-t border-admin-border-primary/20 mb-4">
            {BulkOperationFormRenderer(
              bulkOperation,
              bulkUpdates,
              setBulkUpdates,
              categories,
              forceDelete,
              setForceDelete,
            )}
          </div>
        )}

        <div className="flex items-center justify-end space-x-4 pt-6 mt-4 border-t border-admin-border-primary/10">
          <Button
            className="text-admin-text-tertiary hover:text-admin-text-primary uppercase text-[10px] font-bold tracking-widest"
            disabled={processing}
            variant="ghost"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button
            className={cn(
              "min-w-[180px] h-12 rounded-xl font-display font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-premium-sm",
              bulkOperation !== "delete" &&
                bulkOperation !== "hard_delete" &&
                "bg-admin-accent-primary text-[#1A2B23] hover:bg-admin-accent-secondary",
            )}
            disabled={
              processing ||
              !bulkOperation ||
              (bulkOperation === "hard_delete" && !forceDelete)
            }
            variant={
              bulkOperation === "delete" || bulkOperation === "hard_delete"
                ? "destructive"
                : "default"
            }
            onClick={handleBulkOperation}
          >
            {processing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Procesando Operación...
              </>
            ) : bulkOperation === "delete" ? (
              "Archivar Registros"
            ) : bulkOperation === "hard_delete" ? (
              "⚠️ ELIMINAR PERMANENTEMENTE"
            ) : (
              "Ejecutar Cambios"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
