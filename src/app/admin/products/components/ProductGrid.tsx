"use client";

import {
  AlertTriangle,
  Edit,
  Eye,
  Package,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Product } from "../hooks/useProducts";

interface ProductGridProps {
  products: Product[];
  selectedProducts: string[];
  onSelectProduct: (id: string) => void;
  onDelete: (product: Product) => void;
  formatPrice: (amount: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function ProductGridComponent({
  products,
  selectedProducts,
  onSelectProduct,
  onDelete,
  formatPrice,
  getStatusBadge,
  onRefresh,
  isRefreshing,
}: ProductGridProps) {
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
    <div className="space-y-4">
      {onRefresh && (
        <div className="flex justify-end">
          <Button
            className="h-9 px-4 rounded-xl border-admin-border-primary/10 font-display font-bold text-[10px] tracking-widest uppercase"
            disabled={isRefreshing}
            size="sm"
            variant="outline"
            onClick={onRefresh}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
        {products.map((product) => {
          const stockQuantity =
            product.total_inventory_quantity !== undefined
              ? product.total_inventory_quantity
              : product.inventory_quantity || 0;
          const p = product as {
            low_stock_threshold?: number;
            total_low_stock_threshold?: number;
          };
          const threshold =
            p.total_low_stock_threshold ?? p.low_stock_threshold ?? 5;
          const isLowStock = stockQuantity <= threshold;
          const hasImage =
            (product as unknown).featured_image ||
            (product as unknown).gallery?.[0];

          return (
            <Card
              className="group relative flex flex-col transition-all duration-300 border border-admin-border-primary/20 bg-admin-bg-tertiary rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-lg transition-shadow duration-300 overflow-hidden"
              key={product.id}
            >
              {/* Checkbox - Top Right */}
              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <input
                  checked={selectedProducts.includes(product.id)}
                  className="w-4 h-4 rounded-xl border-admin-border-primary/20 cursor-pointer accent-epoch-primary"
                  type="checkbox"
                  onChange={() => onSelectProduct(product.id)}
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
              <div className="relative w-full h-28 sm:h-40 md:h-48 lg:h-56 bg-admin-border-primary/5 overflow-hidden border-b border-admin-border-primary/10 shrink-0">
                {hasImage ? (
                  <img
                    alt={product.name || product.title || "Producto"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                    src={
                      (product as unknown).featured_image ||
                      (product as unknown).gallery[0]
                    }
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-20 w-20 text-admin-text-tertiary/30" />
                  </div>
                )}
                {/* Status Badge Overlay */}
                <div className="absolute bottom-4 right-4">
                  <div className="bg-admin-bg-tertiary/95 backdrop-blur-sm px-3 py-1 border border-admin-border-primary/20 shadow-sm">
                    {getStatusBadge(product.status || "active")}
                  </div>
                </div>
              </div>

              <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 space-y-1 bg-transparent">
                {/* Product Type Badge */}
                {product.product_type && product.product_type !== "frame" && (
                  <p className="text-[9px] font-display font-bold uppercase tracking-wider">
                    {product.product_type === "contact_lens" && (
                      <span className="text-blue-600">Lentes de Contacto</span>
                    )}
                    {product.product_type === "accessory" && (
                      <span className="text-green-600">Accesorio</span>
                    )}
                    {product.product_type === "service" && (
                      <span className="text-purple-600">Servicio</span>
                    )}
                    {product.product_type === "lens" && (
                      <span className="text-orange-600">Cristal</span>
                    )}
                  </p>
                )}

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
                <CardTitle className="text-xs sm:text-sm md:text-lg font-display font-bold text-admin-text-primary tracking-tight line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] md:min-h-[3.5rem] uppercase">
                  {product.name || product.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 flex-1 flex flex-col justify-between bg-transparent min-h-0">
                <div className="space-y-2 sm:space-y-4">
                  {/* Price and Stock Section */}
                  <div className="flex items-end justify-between border-t border-admin-border-primary/10 pt-2 sm:pt-4 gap-2">
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-[8px] sm:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                        Valor Unitario
                      </p>
                      <p className="text-xs sm:text-base md:text-lg lg:text-2xl font-display font-bold text-epoch-primary tracking-tighter truncate">
                        {formatPrice(product.price || 0)}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5 sm:space-y-1 shrink-0">
                      <p className="text-[8px] sm:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                        Existencias
                      </p>
                      <div className="flex items-center justify-end gap-1">
                        <span
                          className={`text-sm sm:text-lg font-display font-bold ${
                            isLowStock
                              ? "text-admin-error"
                              : "text-admin-text-primary"
                          }`}
                        >
                          {stockQuantity}
                        </span>
                        {isLowStock && (
                          <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-admin-error animate-pulse" />
                        )}
                      </div>
                      <p className="text-[8px] sm:text-[9px] text-admin-text-tertiary">
                        Umbral: {threshold}
                      </p>
                    </div>
                  </div>

                  {/* Info Labels */}
                  {product.sku && (
                    <p className="text-[8px] sm:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] truncate">
                      REF:{" "}
                      <span className="text-admin-text-secondary ml-1">
                        {product.sku}
                      </span>
                    </p>
                  )}
                </div>

                {/* Action Buttons - fondo claro cuando tarjeta en hover para contraste */}
                <div className="product-grid-actions flex flex-wrap items-center gap-1.5 sm:gap-2 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-admin-border-primary/10">
                  <Link
                    className="flex-1"
                    href={`/admin/products/${product.slug}`}
                  >
                    <Button
                      className="product-grid-card-btn w-full h-8 sm:h-9 rounded-lg sm:rounded-xl border-admin-border-primary/20 text-[8px] sm:text-[10px] font-display font-bold tracking-widest uppercase hover:bg-epoch-primary/10 hover:border-epoch-primary/30 text-epoch-primary transition-all"
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-2" />
                      <span className="hidden sm:inline">ARCHIVO</span>
                    </Button>
                  </Link>
                  <Link
                    className="flex-1"
                    href={`/admin/products/edit/${product.id}`}
                  >
                    <Button
                      className="product-grid-card-btn w-full h-8 sm:h-9 rounded-lg sm:rounded-xl border-admin-border-primary/20 text-[8px] sm:text-[10px] font-display font-bold tracking-widest uppercase hover:bg-epoch-primary/10 hover:border-epoch-primary/30 text-epoch-primary transition-all"
                      size="sm"
                      variant="outline"
                    >
                      <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-2" />
                      <span className="hidden sm:inline">EDITAR</span>
                    </Button>
                  </Link>
                  <Button
                    className="product-grid-card-btn product-grid-card-btn-delete h-8 sm:h-9 px-2 sm:px-4 rounded-lg sm:rounded-xl border-admin-error/30 text-admin-error hover:bg-admin-error/10 hover:border-admin-error/50 transition-all shrink-0"
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(product)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Memoize ProductGrid to prevent unnecessary re-renders
export default memo(ProductGridComponent);
