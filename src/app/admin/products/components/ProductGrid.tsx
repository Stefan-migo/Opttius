"use client";

import { memo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, AlertTriangle, Package, Star } from "lucide-react";
import { Product } from "../hooks/useProducts";

interface ProductGridProps {
  products: Product[];
  selectedProducts: string[];
  onSelectProduct: (id: string) => void;
  onDelete: (product: Product) => void;
  formatPrice: (amount: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

function ProductGridComponent({
  products,
  selectedProducts,
  onSelectProduct,
  onDelete,
  formatPrice,
  getStatusBadge,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-24 border-2 border-dashed border-admin-border-primary/10 bg-admin-bg-tertiary/30">
        <Package className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4 opacity-20" />
        <h3 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-widest">
          Archivo de Inventario Vacío
        </h3>
        <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-wider mt-2">
          No se han encontrado registros que coincidan con los criterios de
          búsqueda
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => {
        const stockQuantity =
          product.total_inventory_quantity !== undefined
            ? product.total_inventory_quantity
            : product.inventory_quantity || 0;
        const isLowStock = stockQuantity <= 5;
        const hasImage =
          (product as any).featured_image || (product as any).gallery?.[0];

        return (
          <Card
            key={product.id}
            className="group relative flex flex-col transition-all duration-300 hover:shadow-premium-lg border border-admin-border-primary/20 bg-white rounded-none overflow-hidden"
          >
            {/* Checkbox - Top Right */}
            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <input
                type="checkbox"
                checked={selectedProducts.includes(product.id)}
                onChange={() => onSelectProduct(product.id)}
                className="w-4 h-4 rounded-none border-admin-border-primary/20 cursor-pointer accent-epoch-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Featured Badge - Top Left */}
            {(product.featured || product.is_featured) && (
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-epoch-primary text-white text-[8px] font-display font-bold px-2 py-1 tracking-widest uppercase flex items-center gap-1">
                  <Star className="h-2 w-2 fill-current" />
                  PREMIUM
                </div>
              </div>
            )}

            {/* Product Image or Placeholder */}
            <div className="relative w-full h-56 bg-admin-bg-tertiary overflow-hidden border-b border-admin-border-primary/10">
              {hasImage ? (
                <img
                  src={
                    (product as any).featured_image ||
                    (product as any).gallery[0]
                  }
                  alt={product.name || product.title || "Producto"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-20">
                  <Package className="h-20 w-20 text-admin-text-tertiary" />
                </div>
              )}
              {/* Status Badge Overlay */}
              <div className="absolute bottom-4 right-4">
                <div className="bg-white/90 backdrop-blur-sm px-3 py-1 border border-admin-border-primary/10 shadow-sm">
                  {getStatusBadge(product.status || "active")}
                </div>
              </div>
            </div>

            <CardHeader className="p-6 pb-2 space-y-1">
              {/* Category Badge */}
              <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-wider">
                {product.categories?.name ||
                  product.category?.name ||
                  (typeof product.category === "string"
                    ? product.category
                    : "") ||
                  "Sin clasificación técnica"}
              </p>

              {/* Product Name */}
              <CardTitle className="text-lg font-display font-bold text-admin-text-primary tracking-tight line-clamp-2 min-h-[3.5rem] uppercase">
                {product.name || product.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Price and Stock Section */}
                <div className="flex items-end justify-between border-t border-admin-border-primary/10 pt-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Valor Unitario
                    </p>
                    <p className="text-2xl font-display font-bold text-epoch-primary tracking-tighter">
                      {formatPrice(product.price || 0)}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Existencias
                    </p>
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className={`text-lg font-display font-bold ${
                          isLowStock
                            ? "text-admin-error"
                            : "text-admin-text-primary"
                        }`}
                      >
                        {stockQuantity}
                      </span>
                      {isLowStock && (
                        <AlertTriangle className="h-3.5 w-3.5 text-admin-error animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Labels */}
                {product.sku && (
                  <p className="text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em]">
                    REF:{" "}
                    <span className="text-admin-text-secondary ml-1">
                      {product.sku}
                    </span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-px bg-admin-border-primary/10 mt-6 border border-admin-border-primary/10">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 bg-white hover:bg-admin-bg-tertiary text-[9px] font-display font-bold tracking-widest uppercase rounded-none transition-all py-6 h-auto border-none"
                  asChild
                >
                  <Link href={`/admin/products/${product.slug}`}>
                    <Eye className="h-3 w-3 mr-2 text-epoch-primary" />
                    ARCHIVO
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 bg-white hover:bg-admin-bg-tertiary text-[9px] font-display font-bold tracking-widest uppercase rounded-none transition-all py-6 h-auto border-none"
                  asChild
                >
                  <Link href={`/admin/products/edit/${product.id}`}>
                    <Edit className="h-3 w-3 mr-2 text-epoch-primary" />
                    EDITAR
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-4 bg-white hover:bg-admin-error/5 text-admin-error rounded-none transition-all py-6 h-auto border-none"
                  onClick={() => onDelete(product)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Memoize ProductGrid to prevent unnecessary re-renders
export default memo(ProductGridComponent);
