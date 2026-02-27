"use client";

import { memo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Product } from "../hooks/useProducts";

interface ProductTableProps {
  products: Product[];
  selectedProducts: string[];
  onSelectProduct: (id: string) => void;
  onSelectAll: () => void;
  onDelete: (product: Product) => void;
  formatPrice: (amount: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function ProductTableComponent({
  products,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onDelete,
  formatPrice,
  getStatusBadge,
  onRefresh,
  isRefreshing,
}: ProductTableProps) {
  const allSelected =
    products.length > 0 && selectedProducts.length === products.length;

  if (products.length === 0) {
    return (
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="p-24 text-center">
          <Package className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4 opacity-20" />
          <h3 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-widest">
            Archivo de Inventario Vacío
          </h3>
          <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-wider mt-2">
            No se han encontrado registros que coincidan con los criterios de
            búsqueda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
      <CardHeader className="bg-admin-bg-tertiary/50 border-b border-admin-border-primary/10 py-4 sm:py-6 px-3 sm:px-6">
        <CardTitle className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-xs sm:text-sm font-display font-bold text-admin-text-primary uppercase tracking-widest flex items-center">
              Registros ({products.length})
            </h3>
            <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
              Consulta de Fichas Técnicas Activas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-3 bg-white px-4 py-2 border border-admin-border-primary/10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="w-4 h-4 rounded-xl border-admin-border-primary/20 accent-epoch-primary cursor-pointer"
              />
              <span className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                Seleccionar Todos
              </span>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-9 px-4 rounded-xl border-admin-border-primary/10 font-display font-bold text-[10px] tracking-widest uppercase"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Actualizar
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto -mx-2 sm:-mx-4 px-2 sm:px-4 md:mx-0 md:px-0 min-w-0 [scrollbar-width:thin]">
          <Table>
            <TableHeader className="bg-admin-bg-tertiary/30">
              <TableRow className="hover:bg-transparent border-admin-border-primary/10">
                <TableHead className="w-10 sm:w-12 text-center p-2 sm:p-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded-xl border-admin-border-primary/20 accent-epoch-primary"
                  />
                </TableHead>
                <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-2 sm:p-4 whitespace-nowrap">
                  Archivo / SKU
                </TableHead>
                <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-2 sm:p-4 whitespace-nowrap">
                  Clasificación
                </TableHead>
                <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-2 sm:p-4 whitespace-nowrap">
                  PVP
                </TableHead>
                <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-2 sm:p-4 whitespace-nowrap">
                  Existencias
                </TableHead>
                <TableHead className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-2 sm:p-4 whitespace-nowrap">
                  Estado
                </TableHead>
                <TableHead className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] p-4 text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  className="border-admin-border-primary/10 hover:bg-admin-bg-tertiary/10 transition-colors"
                >
                  <TableCell className="text-center p-2 sm:p-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => onSelectProduct(product.id)}
                      className="w-4 h-4 rounded-xl border-admin-border-primary/20 accent-epoch-primary"
                    />
                  </TableCell>

                  <TableCell className="p-2 sm:p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-tight">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-display font-bold text-admin-text-tertiary tracking-widest uppercase bg-admin-bg-tertiary px-1.5 py-0.5 border border-admin-border-primary/5">
                          {product.sku || "NO-SKU"}
                        </span>
                        {product.is_featured && (
                          <span className="text-[8px] font-display font-bold text-epoch-primary tracking-widest uppercase">
                            • PREMIUM
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="p-2 sm:p-4">
                    <span className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-wider">
                      {product.categories?.name ||
                        product.category?.name ||
                        "Sin Clasificación"}
                    </span>
                  </TableCell>

                  <TableCell className="p-2 sm:p-4">
                    <span className="text-sm font-display font-bold text-epoch-primary">
                      {formatPrice(product.price)}
                    </span>
                  </TableCell>

                  <TableCell className="p-2 sm:p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-display font-bold ${
                          (product.total_inventory_quantity || 0) <= 5
                            ? "text-admin-error"
                            : "text-admin-text-primary"
                        }`}
                      >
                        {product.total_inventory_quantity !== undefined
                          ? product.total_inventory_quantity
                          : product.inventory_quantity || 0}
                      </span>
                      {(product.total_inventory_quantity !== undefined
                        ? product.total_inventory_quantity
                        : product.inventory_quantity || 0) <= 5 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-admin-error animate-pulse" />
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="p-2 sm:p-4">
                    <div className="flex">{getStatusBadge(product.status)}</div>
                  </TableCell>

                  <TableCell className="p-2 sm:p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/products/${product.slug}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-xl hover:bg-admin-bg-tertiary text-epoch-primary"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/products/edit/${product.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-xl hover:bg-admin-bg-tertiary text-epoch-primary"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(product)}
                        className="h-8 w-8 p-0 rounded-xl hover:bg-admin-error/5 text-admin-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Memoize ProductTable to prevent unnecessary re-renders
export default memo(ProductTableComponent);
