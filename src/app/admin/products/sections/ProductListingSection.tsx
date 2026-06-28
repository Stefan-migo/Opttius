"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { productService } from "@/lib/api/services";
import { formatCurrency } from "@/lib/utils";

import ProductFilters from "../components/ProductFilters";
import ProductList from "../components/ProductList";
import ProductPagination from "../components/ProductPagination";
import ProductStats from "../components/ProductStats";
import ProductBulkActions from "./_components/ProductBulkActions";
import { useCategories } from "../hooks/useCategories";
import { useProductFilters } from "../hooks/useProductFilters";
import { useProducts } from "../hooks/useProducts";
import { useProductStats } from "../hooks/useProductStats";

interface ProductListingSectionProps {
  currentBranchId: string | null;
  isSuperAdmin: boolean;
  isGlobalView: boolean;
  branches: unknown[];
}

export default function ProductListingSection({
  currentBranchId,
  isSuperAdmin,
  isGlobalView,
  branches,
}: ProductListingSectionProps) {
  const queryClient = useQueryClient();

  // View state
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Filters - MUST be declared before any effects that use it
  const { filters, updateFilter, resetFilters, applyFilters } =
    useProductFilters();

  // Load view mode from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem("admin-products-view-mode");
    if (savedViewMode === "grid" || savedViewMode === "table") {
      setViewMode(savedViewMode);
    }
    const savedItemsPerPage = localStorage.getItem(
      "admin-products-items-per-page",
    );
    if (savedItemsPerPage) {
      setItemsPerPage(parseInt(savedItemsPerPage));
    }
  }, []);

  // Categories
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Product stats
  const { stats, isLoading: statsLoading } = useProductStats({
    currentBranchId,
    isGlobalView,
    isSuperAdmin,
  });

  // Products with React Query - NO searchTerm, fetch all for client-side filtering
  const {
    products,
    total,
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts({
    page: 1, // Always fetch from page 1
    itemsPerPage: 1000, // Fetch all products for client-side filtering
    categoryFilter: filters.categoryFilter,
    statusFilter: filters.statusFilter,
    searchTerm: "", // No server-side search
    showLowStockOnly: filters.showLowStockOnly,
    currentBranchId,
    isGlobalView,
    isSuperAdmin,
  });

  // Client-side filtering for search (instant, no reload)
  const filteredProducts = products.filter((product) => {
    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (
        !product.name.toLowerCase().includes(searchLower) &&
        !(product.sku || "").toLowerCase().includes(searchLower) &&
        !(product.brand || "").toLowerCase().includes(searchLower) &&
        !(product.barcode || "").toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Product type filter
    if (filters.productTypeFilter !== "all") {
      if (product.product_type !== filters.productTypeFilter) {
        return false;
      }
    }

    return true;
  });

  // Calculate total pages based on filtered results
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Paginate the filtered products
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Selection for bulk operations
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Single product delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<unknown>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // URL state: apply filter=low_stock when coming from QuickActions (run once on mount)
  const searchParams = useSearchParams();
  const hasAppliedLowStockFilter = useRef(false);
  useEffect(() => {
    if (
      searchParams.get("filter") === "low_stock" &&
      !hasAppliedLowStockFilter.current
    ) {
      hasAppliedLowStockFilter.current = true;
      updateFilter("showLowStockOnly", true);
      setCurrentPage(1);
    }
  }, [searchParams.get("filter"), updateFilter]);

  // Reset page when filters change (including search)
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.searchTerm,
    filters.categoryFilter,
    filters.statusFilter,
    filters.showLowStockOnly,
  ]);

  // Save view mode to localStorage
  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    localStorage.setItem("admin-products-view-mode", mode);
  };

  // Save items per page to localStorage
  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    localStorage.setItem("admin-products-items-per-page", items.toString());
    setCurrentPage(1);
  };

  // Selection handlers
  const handleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const handleSelectAll = () => {
    setSelectedProducts(
      selectedProducts.length === paginatedProducts.length
        ? []
        : paginatedProducts.map((p) => p.id),
    );
  };

  // Single product delete
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      setDeleteLoading(true);
      await productService.deleteProduct(productToDelete.id);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      toast.success("Producto eliminado exitosamente");
      refetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Error al eliminar el producto");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteDialog = (product: unknown) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  // Utility functions
  const formatPrice = (price: number | null | undefined): string => {
    return formatCurrency(price || 0);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: unknown; label: string }> = {
      active: { variant: "default", label: "Activo" },
      draft: { variant: "secondary", label: "Borrador" },
      archived: { variant: "outline", label: "Archivado" },
    };

    const statusConfig = config[status] || config["draft"];
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  // Loading state
  if (productsLoading && products.length === 0) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-admin-border-primary/20 bg-white">
          {[...Array(4)].map((_, i) => (
            <div
              className="p-8 border-r border-admin-border-primary/10"
              key={i}
            >
              <Skeleton className="h-3 w-24 mb-3 opacity-50" />
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-2 w-20 opacity-30" />
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <Skeleton className="h-12 flex-1 max-w-md" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card
              className="border border-admin-border-primary/10 rounded-xl shadow-none bg-white"
              key={i}
            >
              <div className="aspect-square bg-admin-bg-tertiary/20 relative overflow-hidden">
                <Skeleton className="absolute inset-0" />
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2 opacity-50" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (productsError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Error al cargar productos
              </h3>
              <p className="text-gray-600 mb-4">
                {productsError instanceof Error
                  ? productsError.message
                  : "Error desconocido"}
              </p>
              <button
                className="px-4 py-2 bg-epoch-primary text-white rounded-xl hover:bg-epoch-surface transition-all font-display font-bold text-[10px] tracking-widest uppercase"
                onClick={() => refetchProducts()}
              >
                Reintentar
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats label
  const currentBranch = branches?.find((b) => b.id === currentBranchId);
  const statsLabel = isGlobalView
    ? "Todas las sucursales"
    : currentBranch
      ? `Sucursal: ${currentBranch.name}`
      : "Sucursal seleccionada";

  const handleRefresh = () => {
    refetchProducts();
    queryClient.invalidateQueries({ queryKey: ["productStats"] });
    toast.success("Datos actualizados");
  };

  return (
    <>
      {/* Stats Cards */}
      <ProductStats
        formatPrice={formatPrice}
        stats={stats}
        statsLabel={statsLabel}
      />

      {/* Search and Filters */}
      <ProductFilters
        categories={categories}
        categoryFilter={filters.categoryFilter}
        searchTerm={filters.searchTerm}
        showLowStockOnly={filters.showLowStockOnly}
        statusFilter={filters.statusFilter}
        viewMode={viewMode}
        productTypeFilter={filters.productTypeFilter}
        onCategoryChange={(category) =>
          updateFilter("categoryFilter", category)
        }
        onLowStockToggle={() =>
          updateFilter("showLowStockOnly", !filters.showLowStockOnly)
        }
        onSearchChange={(term) => updateFilter("searchTerm", term)}
        onStatusChange={(status) => updateFilter("statusFilter", status)}
        onViewModeChange={handleViewModeChange}
        onProductTypeChange={(type) => updateFilter("productTypeFilter", type)}
      />

      {/* Bulk Operations Panel */}
      {selectedProducts.length > 0 && (
        <ProductBulkActions
          categories={categories}
          selectedProducts={selectedProducts}
          onClearSelection={() => {
            setSelectedProducts([]);
            refetchProducts();
          }}
          onSuccess={refetchProducts}
        />
      )}

      {/* Products Display */}
      <ProductList
        formatPrice={formatPrice}
        getStatusBadge={getStatusBadge}
        isRefreshing={productsLoading}
        products={paginatedProducts}
        selectedProducts={selectedProducts}
        viewMode={viewMode}
        onDelete={openDeleteDialog}
        onRefresh={handleRefresh}
        onSelectAll={handleSelectAll}
        onSelectProduct={handleSelectProduct}
      />

      {/* Pagination - Show if there are products or if totalPages > 1 */}
      {(filteredProducts.length > 0 || totalPages > 1) && (
        <ProductPagination
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalPages={totalPages}
          totalProducts={filteredProducts.length}
          onItemsPerPageChange={handleItemsPerPageChange}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Single Product Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md border-2 border-admin-error/20 bg-white shadow-premium-xl rounded-xl p-0 overflow-hidden">
          <div className="bg-admin-error/5 p-8 border-b border-admin-error/10">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-admin-error/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-admin-error" />
                </div>
                <DialogTitle className="text-2xl font-display font-bold text-admin-error tracking-tight uppercase">
                  ELIMINAR PRODUCTO
                </DialogTitle>
              </div>
              <DialogDescription className="text-[11px] font-serif italic text-admin-text-tertiary tracking-wide pl-15 mt-1">
                ADVERTENCIA: Esta operación de purga en el archivo técnico es
                irreversible.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8">
            <p className="text-sm text-admin-text-secondary leading-relaxed mb-8">
              ¿Confirmar la eliminación permanente de{" "}
              <span className="font-display font-bold text-admin-text-primary px-1 border-b border-admin-text-primary/20">
                &quot;{productToDelete?.name}&quot;
              </span>
              ? Los registros históricos y dependencias asociadas serán
              removidos del sistema.
            </p>
            <DialogFooter className="flex items-center justify-end gap-3 pt-4">
              <Button
                className="h-10 px-6 font-display font-bold text-[10px] tracking-widest uppercase rounded-xl border-admin-border-primary/20"
                disabled={deleteLoading}
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setProductToDelete(null);
                }}
              >
                CANCELAR
              </Button>
              <Button
                className="h-10 px-8 font-display font-bold text-[10px] tracking-widest uppercase rounded-xl bg-admin-error hover:bg-admin-error/90"
                disabled={deleteLoading}
                variant="destructive"
                onClick={handleDeleteProduct}
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                    PURGANDO...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    ELIMINAR REGISTRO
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

