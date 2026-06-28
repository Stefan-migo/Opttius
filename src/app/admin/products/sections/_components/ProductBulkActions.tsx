"use client";

import { AlertTriangle, Edit, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bulkProductOperations } from "@/lib/api/services";
import { cn } from "@/lib/utils";

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
      console.error("Error performing bulk operation:", error);
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
            {renderBulkOperationForm(
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

function renderBulkOperationForm(
  bulkOperation: string,
  bulkUpdates: unknown,
  setBulkUpdates: (updates: unknown) => void,
  categories: unknown[],
  forceDelete: boolean,
  setForceDelete: (value: boolean) => void,
) {
  switch (bulkOperation) {
    case "update_status":
      return (
        <div className="space-y-2">
          <div>
            <Label
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
              htmlFor="status"
            >
              Nuevo Estado
            </Label>
            <Select
              value={(bulkUpdates as Record<string, string>)?.status ?? ""}
              onValueChange={(value) =>
                setBulkUpdates({ ...(bulkUpdates as object), status: value })
              }
            >
              <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "update_category":
      return (
        <div className="space-y-2">
          <div>
            <Label
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
              htmlFor="category"
            >
              Nueva Categoría
            </Label>
            <Select
              value={(bulkUpdates as Record<string, string>)?.category_id ?? ""}
              onValueChange={(value) =>
                setBulkUpdates({ ...(bulkUpdates as object), category_id: value })
              }
            >
              <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {(categories as Array<{ id: string; name: string }>).map(
                  (category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "update_pricing":
      return (
        <div className="space-y-2">
          <div>
            <Label
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
              htmlFor="adjustment_type"
            >
              Tipo de Ajuste
            </Label>
            <Select
              value={
                (bulkUpdates as Record<string, string>)?.adjustment_type ?? ""
              }
              onValueChange={(value) =>
                setBulkUpdates({ ...(bulkUpdates as object), adjustment_type: value })
              }
            >
              <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                <SelectValue placeholder="Tipo de ajuste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje</SelectItem>
                <SelectItem value="fixed">Monto Fijo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
              htmlFor="price_adjustment"
            >
              Ajuste{" "}
              {(bulkUpdates as Record<string, string>)?.adjustment_type ===
              "percentage"
                ? "(%)"
                : "($)"}
            </Label>
            <Input
              className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest"
              placeholder={
                (bulkUpdates as Record<string, string>)?.adjustment_type ===
                "percentage"
                  ? "ej: 10 para +10%"
                  : "ej: 500 para +$500"
              }
              step="0.01"
              type="number"
              onChange={(e) =>
                setBulkUpdates({
                  ...(bulkUpdates as object),
                  price_adjustment: parseFloat(e.target.value),
                })
              }
            />
          </div>
        </div>
      );

    case "update_inventory":
      return (
        <div className="space-y-2">
          <div>
            <Label
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
              htmlFor="inventory_adjustment_type"
            >
              Tipo de Ajuste
            </Label>
            <Select
              value={
                (bulkUpdates as Record<string, string>)?.adjustment_type ?? ""
              }
              onValueChange={(value) =>
                setBulkUpdates({ ...(bulkUpdates as object), adjustment_type: value })
              }
            >
              <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                <SelectValue placeholder="Tipo de ajuste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set">Establecer cantidad</SelectItem>
                <SelectItem value="add">Agregar/Quitar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
              htmlFor="inventory_adjustment"
            >
              {(bulkUpdates as Record<string, string>)?.adjustment_type === "set"
                ? "Nueva Cantidad"
                : "Ajuste (+/-)"}
            </Label>
            <Input
              className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest"
              placeholder={
                (bulkUpdates as Record<string, string>)?.adjustment_type === "set"
                  ? "ej: 50"
                  : "ej: -10 o +20"
              }
              type="number"
              onChange={(e) =>
                setBulkUpdates({
                  ...(bulkUpdates as object),
                  inventory_adjustment: parseInt(e.target.value),
                })
              }
            />
          </div>
        </div>
      );

    case "delete":
      return (
        <div className="space-y-2">
          <div className="flex items-start space-x-2 p-3 bg-admin-error/5 border border-admin-error/20 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-admin-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-display font-bold text-admin-error text-sm uppercase tracking-wider">
                Confirmar eliminación suave
              </p>
              <p className="text-[11px] font-serif italic text-admin-text-secondary mt-0.5">
                Los productos seleccionados serán archivados. Esta acción se
                puede deshacer.
              </p>
            </div>
          </div>
        </div>
      );

    case "hard_delete":
      return (
        <div className="space-y-2">
          <div className="flex items-start space-x-2 p-3 bg-admin-error/10 border border-admin-error/30 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-admin-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-display font-bold text-admin-error text-sm uppercase tracking-wider">
                ⚠️ ELIMINACIÓN PERMANENTE
              </p>
              <p className="text-[11px] font-serif italic text-admin-text-secondary mt-0.5">
                Los productos seleccionados serán ELIMINADOS PERMANENTEMENTE.
              </p>
              <p className="text-[11px] font-display font-bold text-admin-error mt-1">
                ⚠️ Esta acción NO se puede deshacer.
              </p>
            </div>
          </div>
          <div className="p-2.5 bg-admin-warning/10 border border-admin-warning/30 rounded-xl">
            <p className="text-[11px] font-serif italic text-admin-text-secondary">
              <strong>Recomendación:</strong> Considera usar &quot;Eliminación
              suave&quot; (archivar) en su lugar.
            </p>
          </div>
          <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex items-start space-x-2">
              <input
                checked={forceDelete}
                className="mt-0.5"
                id="force-delete"
                type="checkbox"
                onChange={(e) => setForceDelete(e.target.checked)}
              />
              <label
                className="text-xs text-orange-900 font-medium cursor-pointer leading-tight"
                htmlFor="force-delete"
              >
                Confirmo que entiendo que esta acción es irreversible y deseo
                continuar.
              </label>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
