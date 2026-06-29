"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProductInventorySectionProps {
  stockQuantity: string;
  lowStockThreshold: string;
  currentBranchId: string | null;
  onFieldChange: (field: string, value: unknown) => void;
}

export function ProductInventorySection({
  stockQuantity,
  lowStockThreshold,
  currentBranchId,
  onFieldChange,
}: ProductInventorySectionProps) {
  const hasBranch = currentBranchId && currentBranchId !== "global";

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Inventario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
          <div>
            <Label htmlFor="stock_quantity">
              Stock (Sucursal Actual) *
            </Label>
            <Input
              className="border-black/20"
              disabled={!hasBranch}
              id="stock_quantity"
              min="0"
              placeholder="50"
              required={!!hasBranch}
              type="number"
              value={stockQuantity}
              onChange={(e) =>
                onFieldChange("stock_quantity", e.target.value)
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              {hasBranch
                ? "Stock para esta sucursal. Puede gestionar stock por sucursal desde la página de productos."
                : "Selecciona una sucursal para configurar el stock. En vista global el inventario no se modifica."}
            </p>
          </div>
          <div>
            <Label htmlFor="low_stock_threshold">
              Umbral de Stock Bajo
            </Label>
            <Input
              className="border-black/20"
              disabled={!hasBranch}
              id="low_stock_threshold"
              min="0"
              placeholder="5"
              type="number"
              value={lowStockThreshold}
              onChange={(e) =>
                onFieldChange("low_stock_threshold", e.target.value)
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Alerta cuando el stock disponible sea menor o igual a este valor.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
