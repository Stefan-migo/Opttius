"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { productService } from "@/lib/api/services";
import { formatCurrency } from "@/lib/utils";

import ProductFilters from "../components/ProductFilters";
import ProductList from "../components/ProductList";
import ProductPagination from "../components/ProductPagination";
import ProductStats from "../components/ProductStats";
import { useCategories } from "../hooks/useCategories";
import { useProductFilters } from "../hooks/useProductFilters";
import { useProducts } from "../hooks/useProducts";
import { useProductStats } from "../hooks/useProductStats";
import { ProductDeleteDialog } from "./_components/_components/ProductDeleteDialog";
import { ProductListingErrorState,ProductListingSkeleton } from "./_components/_components/ProductListingStates";
import ProductBulkActions from "./_components/ProductBulkActions";

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
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
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

  const openDeleteDialog = (product: { id: string; name: string }) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  // Utility functions
  const formatPrice = (price: number | null | undefined): string => {
    return formatCurrency(price || 0);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      active: { variant: "default", label: "Activo" },
      draft: { variant: "secondary", label: "Borrador" },
      archived: { variant: "outline", label: "Archivado" },
    };
    return <Badge variant={(config[status] || config["draft"]).variant}>{(config[status] || config["draft"]).label}</Badge>;
  };

  if (productsLoading && products.length === 0) return <ProductListingSkeleton />;
  if (productsError) return <ProductListingErrorState error={productsError} onRetry={refetchProducts} />;

  // Calculate stats label
  const branchesList = branches as Array<{ id: string; name: string }>;
  const currentBranch = branchesList?.find((b) => b.id === currentBranchId);
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
        productTypeFilter={filters.productTypeFilter}
        searchTerm={filters.searchTerm}
        showLowStockOnly={filters.showLowStockOnly}
        statusFilter={filters.statusFilter}
        viewMode={viewMode}
        onCategoryChange={(category) =>
          updateFilter("categoryFilter", category)
        }
        onLowStockToggle={() =>
          updateFilter("showLowStockOnly", !filters.showLowStockOnly)
        }
        onProductTypeChange={(type) => updateFilter("productTypeFilter", type)}
        onSearchChange={(term) => updateFilter("searchTerm", term)}
        onStatusChange={(status) => updateFilter("statusFilter", status)}
        onViewModeChange={handleViewModeChange}
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

      <ProductDeleteDialog
        deleteLoading={deleteLoading}
        open={deleteDialogOpen}
        productToDelete={productToDelete as { id: string; name: string } | null}
        onConfirm={handleDeleteProduct}
        onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setProductToDelete(null); }}
      />
    </>
  );
}

