"use client";

import { Edit, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { BulkOperationForm } from "../BulkOperationForm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleteDialog: boolean;
  selectedProducts: string[];
  categories: { id: string; name: string }[];
  bulkOperation: string;
  bulkUpdates: Record<string, unknown>;
  processing: boolean;
  onBulkOperationChange: (op: string) => void;
  onBulkUpdatesChange: (updates: Record<string, unknown>) => void;
  onExecute: () => void;
  onTriggerClick: () => void;
}

export function BulkActionDialog({
  open, onOpenChange, isDeleteDialog, selectedProducts, categories,
  bulkOperation, bulkUpdates, processing,
  onBulkOperationChange, onBulkUpdatesChange, onExecute, onTriggerClick,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={onTriggerClick}>
          <Edit className="h-4 w-4 mr-2" />
          Operaciones Masivas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {bulkOperation === "delete" ? "Archivar Productos"
              : bulkOperation === "hard_delete" ? "⚠️ Eliminar Permanentemente"
              : "Operación Masiva"}
          </DialogTitle>
          <DialogDescription>
            {bulkOperation === "delete" ? `Archivar ${selectedProducts.length} productos seleccionados`
              : bulkOperation === "hard_delete" ? `ELIMINAR PERMANENTEMENTE ${selectedProducts.length} productos seleccionados`
              : `Aplicar cambios a ${selectedProducts.length} productos seleccionados`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!isDeleteDialog && (
            <div>
              <Label htmlFor="operation">Operación</Label>
              <Select value={bulkOperation} onValueChange={onBulkOperationChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar operación" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="update_status">Cambiar Estado</SelectItem>
                  <SelectItem value="update_category">Cambiar Categoría</SelectItem>
                  <SelectItem value="update_pricing">Ajustar Precios</SelectItem>
                  <SelectItem value="update_inventory">Ajustar Inventario</SelectItem>
                  <SelectItem value="duplicate">Duplicar Productos</SelectItem>
                  <SelectItem value="delete">Archivar Productos (Eliminación Suave)</SelectItem>
                  <SelectItem className="text-red-600 font-medium" value="hard_delete">⚠️ Eliminar Permanentemente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {bulkOperation && (
            <BulkOperationForm
              bulkOperation={bulkOperation}
              bulkUpdates={bulkUpdates}
              categories={categories}
              selectedProducts={selectedProducts}
              onBulkUpdatesChange={onBulkUpdatesChange}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>Cancelar</Button>
          <Button disabled={processing || !bulkOperation}
            variant={bulkOperation === "delete" || bulkOperation === "hard_delete" ? "destructive" : "default"}
            onClick={onExecute}>
            {processing && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {bulkOperation === "delete" ? "Archivar Productos"
              : bulkOperation === "hard_delete" ? "⚠️ ELIMINAR PERMANENTEMENTE"
              : "Aplicar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
