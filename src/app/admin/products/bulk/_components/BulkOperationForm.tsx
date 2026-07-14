"use client";

import { AlertTriangle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkOperationFormProps {
  bulkOperation: string;
  selectedProducts: string[];
  categories: { id: string; name: string }[];
  bulkUpdates: Record<string, unknown>;
  onBulkUpdatesChange: (updates: Record<string, unknown>) => void;
}

export function BulkOperationForm({
  bulkOperation,
  selectedProducts,
  categories,
  bulkUpdates,
  onBulkUpdatesChange,
}: BulkOperationFormProps) {
  switch (bulkOperation) {
    case "update_status":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="status">Nuevo Estado</Label>
            <Select
              onValueChange={(value) =>
                onBulkUpdatesChange({ ...bulkUpdates, status: value })
              }
            >
              <SelectTrigger>
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
        <div className="space-y-4">
          <div>
            <Label htmlFor="category">Nueva Categoría</Label>
            <Select
              onValueChange={(value) =>
                onBulkUpdatesChange({ ...bulkUpdates, category_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "update_pricing":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="adjustment_type">Tipo de Ajuste</Label>
            <Select
              onValueChange={(value) =>
                onBulkUpdatesChange({ ...bulkUpdates, adjustment_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de ajuste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje</SelectItem>
                <SelectItem value="fixed">Monto Fijo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="price_adjustment">
              Ajuste{" "}
              {bulkUpdates.adjustment_type === "percentage" ? "(%)" : "($)"}
            </Label>
            <Input
              placeholder={
                bulkUpdates.adjustment_type === "percentage"
                  ? "ej: 10 para +10%"
                  : "ej: 500 para +$500"
              }
              step="0.01"
              type="number"
              onChange={(e) =>
                onBulkUpdatesChange({
                  ...bulkUpdates,
                  price_adjustment: parseFloat(e.target.value),
                })
              }
            />
          </div>
        </div>
      );

    case "update_inventory":
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="inventory_adjustment_type">Tipo de Ajuste</Label>
            <Select
              onValueChange={(value) =>
                onBulkUpdatesChange({ ...bulkUpdates, adjustment_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de ajuste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set">Establecer cantidad</SelectItem>
                <SelectItem value="add">Agregar/Quitar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="inventory_adjustment">
              {bulkUpdates.adjustment_type === "set"
                ? "Nueva Cantidad"
                : "Ajuste (+/-)"}
            </Label>
            <Input
              placeholder={
                bulkUpdates.adjustment_type === "set"
                  ? "ej: 50"
                  : "ej: -10 o +20"
              }
              type="number"
              value={(bulkUpdates.inventory_adjustment as string) ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  onBulkUpdatesChange({
                    ...bulkUpdates,
                    inventory_adjustment: undefined,
                  });
                } else {
                  const numValue = parseInt(value, 10);
                  if (!isNaN(numValue)) {
                    onBulkUpdatesChange({
                      ...bulkUpdates,
                      inventory_adjustment: numValue,
                    });
                  }
                }
              }}
            />
          </div>
        </div>
      );

    case "delete":
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">
                Confirmar eliminación suave
              </p>
              <p className="text-sm text-red-600">
                Los {selectedProducts.length} productos seleccionados serán
                archivados (eliminación suave). Esta acción se puede deshacer
                cambiando el estado a &quot;Activo&quot;.
              </p>
            </div>
          </div>
        </div>
      );

    case "hard_delete":
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 p-4 bg-red-100 border border-red-300 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-700" />
            <div>
              <p className="font-medium text-red-900">
                {"\u26A0\uFE0F"} ELIMINACIÓN PERMANENTE
              </p>
              <p className="text-sm text-red-700 font-medium">
                Los {selectedProducts.length} productos seleccionados serán
                ELIMINADOS PERMANENTEMENTE de la base de datos.
              </p>
              <p className="text-sm text-red-600 mt-2">
                {"\u26A0\uFE0F"} Esta acción NO se puede deshacer. Todos los
                datos del producto se perderán para siempre.
              </p>
            </div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Recomendación:</strong> Considera usar &quot;Eliminación
              suave&quot; (archivar) en su lugar, que permite recuperar los
              productos si es necesario.
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
