"use client";

import { useCallback, useState } from "react";

import { Product } from "./useProducts";

export interface ProductFilters {
  searchTerm: string;
  categoryFilter: string;
  statusFilter: string;
  showLowStockOnly: boolean;
  productTypeFilter: string;
}

const defaultFilters: ProductFilters = {
  searchTerm: "",
  categoryFilter: "all",
  statusFilter: "active",
  showLowStockOnly: false,
  productTypeFilter: "all",
};

export function useProductFilters() {
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);

  const updateFilter = useCallback(
    (key: keyof ProductFilters, value: unknown) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const applyFilters = (products: Product[]): Product[] => {
    return products.filter((product) => {
      const matchesSearch =
        !filters.searchTerm ||
        product.name.toLowerCase().includes(filters.searchTerm.toLowerCase());

      const matchesLowStock =
        !filters.showLowStockOnly || (product.inventory_quantity || 0) <= 5;

      return matchesSearch && matchesLowStock;
    });
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    applyFilters,
  };
}
