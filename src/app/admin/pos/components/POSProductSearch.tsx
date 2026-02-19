"use client";

import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { POSProduct } from "../types";

interface POSProductSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  products: POSProduct[];
  loading: boolean;
  selectedIndex: number;
  onSelectProduct: (product: POSProduct) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  suggestionsRef?: React.RefObject<HTMLDivElement | null>;
  placeholder?: string;
}

export function POSProductSearch({
  searchTerm,
  onSearchChange,
  products,
  loading,
  selectedIndex,
  onSelectProduct,
  onKeyDown,
  inputRef,
  suggestionsRef,
  placeholder = "Buscar productos por nombre, SKU o código...",
}: POSProductSearchProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef as React.Ref<HTMLInputElement>}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="pl-10"
          autoComplete="off"
        />
      </div>

      {searchTerm.trim().length > 0 && (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg border">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && products.length > 0 && (
            <div
              ref={suggestionsRef}
              className="max-h-60 overflow-y-auto border rounded-lg bg-white dark:bg-gray-900 shadow-lg z-20"
            >
              {products.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className={`w-full p-3 text-left border-b last:border-b-0 flex justify-between items-center transition-colors ${
                    selectedIndex === index
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.barcode && (
                        <span className="ml-2">Cód: {product.barcode}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold ml-2">
                    {formatCurrency(product.price)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading &&
            searchTerm.trim().length > 0 &&
            products.length === 0 && (
              <div className="border rounded-lg bg-white dark:bg-gray-900 p-3 text-center text-gray-500 text-sm">
                No se encontraron productos
              </div>
            )}
        </div>
      )}
    </div>
  );
}
