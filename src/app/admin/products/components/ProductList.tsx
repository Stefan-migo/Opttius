"use client";

import { memo } from "react";

import { Product } from "../hooks/useProducts";
import ProductGrid from "./ProductGrid";
import ProductTable from "./ProductTable";

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
        formatPrice={formatPrice}
        getStatusBadge={getStatusBadge}
        isRefreshing={isRefreshing}
        products={products}
        selectedProducts={selectedProducts}
        onDelete={onDelete}
        onRefresh={onRefresh}
        onSelectProduct={onSelectProduct}
      />
    );
  }

  return (
    <ProductTable
      formatPrice={formatPrice}
      getStatusBadge={getStatusBadge}
      isRefreshing={isRefreshing}
      products={products}
      selectedProducts={selectedProducts}
      onDelete={onDelete}
      onRefresh={onRefresh}
      onSelectAll={onSelectAll}
      onSelectProduct={onSelectProduct}
    />
  );
}

// Memoize ProductList to prevent unnecessary re-renders
export default memo(ProductListComponent);
