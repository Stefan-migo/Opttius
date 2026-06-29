"use client";

import { Package, Plus, RefreshCw, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MobileStockItem {
  id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  products?: { id: string; name: string; sku: string | null };
}

interface FieldOpInventorySectionProps {
  mobileStock: MobileStockItem[];
  id: string;
  returningStock: boolean;
  onReturnStock: () => void;
}

export default function FieldOpInventorySection({
  mobileStock,
  id,
  returningStock,
  onReturnStock,
}: FieldOpInventorySectionProps) {
  return (
    <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-admin-border-primary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold">
          <Package className="h-5 w-5 shrink-0" />
          Stock en bodega móvil
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {mobileStock.length > 0 && (
            <Button
              className="min-h-[44px] border-admin-border-primary/30"
              disabled={returningStock}
              size="sm"
              type="button"
              variant="outline"
              onClick={onReturnStock}
            >
              {returningStock ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Devolver stock sobrante
            </Button>
          )}
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-admin-accent-primary hover:text-admin-accent-secondary"
            href={`/admin/field-operations/${id}/prepare`}
          >
            <Plus className="h-4 w-4" />
            Agregar stock
          </Link>
        </div>
      </div>
      <div className="p-4 sm:p-6 pt-0">
        {mobileStock.length === 0 ? (
          <p className="py-4 text-admin-text-tertiary">
            No hay productos en la bodega móvil.{" "}
            <Link
              className="text-admin-accent-primary hover:underline"
              href={`/admin/field-operations/${id}/prepare`}
            >
              Transferir stock
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    Producto
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    SKU
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold text-right">
                    Cantidad
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mobileStock.map((item) => (
                  <TableRow
                    className="hover:bg-[#AE000025]"
                    key={item.id}
                  >
                    <TableCell className="font-medium text-admin-text-primary">
                      {item.products?.name || "—"}
                    </TableCell>
                    <TableCell className="text-admin-text-tertiary">
                      {item.products?.sku || "—"}
                    </TableCell>
                    <TableCell className="text-right text-admin-text-primary">
                      {item.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
