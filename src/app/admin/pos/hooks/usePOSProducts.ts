/**
 * usePOSProducts - Hook para gestión de productos en el POS
 * Maneja búsqueda, código de barras, y resultados
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { searchProducts } from "@/lib/api/services";

import type { POSProduct } from "../types";

interface UsePOSProductsProps {
  branchId?: string | null;
  onProductSelect?: (product: POSProduct) => void;
}

export function usePOSProducts({
  branchId,
  onProductSelect,
}: UsePOSProductsProps = {}) {
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<POSProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [barcode, setBarcode] = useState("");

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search products with debounce
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchProducts(
          searchTerm,
          branchId || undefined,
        );
        // Map Product to POSProduct
        const mappedResults: POSProduct[] = (searchResults || []).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          price_includes_tax: p.price_includes_tax,
          inventory_quantity: p.inventory_quantity ?? 0,
          sku: p.sku,
          barcode: p.barcode,
          featured_image: p.featured_image,
          brand: p.brand,
          product_type: p.product_type,
          category: p.category,
        }));
        setResults(mappedResults);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error searching products:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, branchId]);

  // Search by barcode (uses search with barcode as query)
  const searchByBarcode = useCallback(
    async (barcodeValue: string) => {
      if (!barcodeValue.trim()) return null;

      try {
        setLoading(true);
        // Search by barcode using searchProducts
        const products = await searchProducts(
          barcodeValue,
          branchId || undefined,
        );
        const found = products.find((p) => p.barcode === barcodeValue);
        if (found) {
          // Map to POSProduct
          const product: POSProduct = {
            id: found.id,
            name: found.name,
            price: found.price,
            price_includes_tax: found.price_includes_tax,
            inventory_quantity: found.inventory_quantity ?? 0,
            sku: found.sku,
            barcode: found.barcode,
            featured_image: found.featured_image,
            brand: found.brand,
            product_type: found.product_type,
            category: found.category,
          };
          onProductSelect?.(product);
          return product;
        }
        return null;
      } catch (error) {
        console.error("Error searching by barcode:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [branchId, onProductSelect],
  );

  // Handle barcode change
  const handleBarcodeChange = useCallback(
    (value: string) => {
      setBarcode(value);
      if (value.endsWith("\n") || value.endsWith("\r")) {
        // Enter pressed in barcode scanner
        const cleanBarcode = value.trim();
        if (cleanBarcode) {
          searchByBarcode(cleanBarcode);
          setBarcode("");
        }
      }
    },
    [searchByBarcode],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          onProductSelect?.(results[selectedIndex]);
          setSearchTerm("");
          setResults([]);
          setSelectedIndex(-1);
        } else if (results.length > 0) {
          onProductSelect?.(results[0]);
          setSearchTerm("");
          setResults([]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Escape") {
        setResults([]);
        setSearchTerm("");
        setSelectedIndex(-1);
      }
    },
    [selectedIndex, results, onProductSelect],
  );

  // Select product
  const handleSelectProduct = useCallback(
    (product: POSProduct) => {
      onProductSelect?.(product);
      setSearchTerm("");
      setResults([]);
      setSelectedIndex(-1);
    },
    [onProductSelect],
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setResults([]);
    setSelectedIndex(-1);
  }, []);

  // Update search term
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setSelectedIndex(-1);
  }, []);

  return {
    // States
    searchTerm,
    setSearchTerm: handleSearchChange,
    results,
    loading,
    selectedIndex,
    barcode,

    // Refs
    searchInputRef,
    suggestionsRef,

    // Methods
    handleSelectProduct,
    handleKeyDown,
    handleBarcodeChange,
    searchByBarcode,
    clearSearch,

    // Helpers
    hasResults: results.length > 0,
    isSearching: loading && searchTerm.trim().length >= 2,
  };
}
