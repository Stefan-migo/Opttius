"use client";

import { memo } from "react";
import ProductGrid from "./ProductGrid";
import ProductTable from "./ProductTable";
import { Product } from "../hooks/useProducts";

interface ProductListProps {
  products: Product[];
  viewMode: "grid" | "table";
  selectedProducts: string[];
  onSelectProduct: (id: string) => void;
  onSelectAll: () => void;
  onDelete: (product: Product) => void;
  formatPrice: (amount: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function ProductListComponent({
  products,
  viewMode,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onDelete,
  formatPrice,
  getStatusBadge,
  onRefresh,
  isRefreshing,
}: ProductListProps) {
  if (viewMode === "grid") {
    return (
      <ProductGrid
        products={products}
        selectedProducts={selectedProducts}
        onSelectProduct={onSelectProduct}
        onDelete={onDelete}
        formatPrice={formatPrice}
        getStatusBadge={getStatusBadge}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />
    );
  }

  return (
    <ProductTable
      products={products}
      selectedProducts={selectedProducts}
      onSelectProduct={onSelectProduct}
      onSelectAll={onSelectAll}
      onDelete={onDelete}
      formatPrice={formatPrice}
      getStatusBadge={getStatusBadge}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
    />
  );
}

// Memoize ProductList to prevent unnecessary re-renders
export default memo(ProductListComponent);
