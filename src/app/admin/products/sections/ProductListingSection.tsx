"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useProducts } from "../hooks/useProducts";
import { useProductStats } from "../hooks/useProductStats";
import { useCategories } from "../hooks/useCategories";
import { useProductFilters } from "../hooks/useProductFilters";
import ProductStats from "../components/ProductStats";
import ProductFilters from "../components/ProductFilters";
import ProductList from "../components/ProductList";
import ProductPagination from "../components/ProductPagination";
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, AlertTriangle, RefreshCw, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { productService, bulkProductOperations } from "@/lib/api/services";

interface ProductListingSectionProps {
  currentBranchId: string | null;
  isSuperAdmin: boolean;
  isGlobalView: boolean;
  branches: any[];
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
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      (product.sku || "").toLowerCase().includes(searchLower) ||
      (product.brand || "").toLowerCase().includes(searchLower) ||
      (product.barcode || "").toLowerCase().includes(searchLower)
    );
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

  // Bulk operation states
  const [bulkOperation, setBulkOperation] = useState("");
  const [bulkUpdates, setBulkUpdates] = useState<any>({});
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [isDeleteDialog, setIsDeleteDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  // Single product delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
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

  // Bulk operations
  const handleBulkOperation = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }

    if (!bulkOperation) {
      toast.error("Selecciona una operación");
      return;
    }

    try {
      setProcessing(true);

      const result = await bulkProductOperations({
        operation: bulkOperation,
        product_ids: selectedProducts,
        updates: {
          ...bulkUpdates,
          force_delete: forceDelete,
        },
      });

      const affectedCount = result?.success?.length ?? selectedProducts.length;
      toast.success(
        `Operación completada: ${affectedCount} productos afectados`,
      );
      setIsDeleteDialog(false);
      setSelectedProducts([]);
      setBulkOperation("");
      setBulkUpdates({});
      setForceDelete(false);
      refetchProducts();
    } catch (error) {
      console.error("Error performing bulk operation:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al realizar la operación masiva";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
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

  const openDeleteDialog = (product: any) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  // Utility functions
  const formatPrice = (price: number | null | undefined): string => {
    return formatCurrency(price || 0);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
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
              key={i}
              className="p-8 border-r border-admin-border-primary/10"
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
              key={i}
              className="border border-admin-border-primary/10 rounded-xl shadow-none bg-white"
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
                onClick={() => refetchProducts()}
                className="px-4 py-2 bg-epoch-primary text-white rounded-xl hover:bg-epoch-surface transition-all font-display font-bold text-[10px] tracking-widest uppercase"
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
        stats={stats}
        statsLabel={statsLabel}
        formatPrice={formatPrice}
      />

      {/* Search and Filters */}
      <ProductFilters
        searchTerm={filters.searchTerm}
        categoryFilter={filters.categoryFilter}
        statusFilter={filters.statusFilter}
        showLowStockOnly={filters.showLowStockOnly}
        viewMode={viewMode}
        categories={categories}
        onSearchChange={(term) => updateFilter("searchTerm", term)}
        onCategoryChange={(category) =>
          updateFilter("categoryFilter", category)
        }
        onStatusChange={(status) => updateFilter("statusFilter", status)}
        onLowStockToggle={() =>
          updateFilter("showLowStockOnly", !filters.showLowStockOnly)
        }
        onViewModeChange={handleViewModeChange}
      />

      {/* Bulk Operations Panel - Shows when products are selected */}
      {selectedProducts.length > 0 && (
        <Card
          data-bulk-panel
          className="w-full bg-admin-bg-tertiary border border-admin-border-primary/20 shadow-premium-xl rounded-xl animate-in slide-in-from-top-4 duration-500 overflow-hidden sticky top-6 z-40"
          style={{ position: "relative" }}
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-admin-accent-primary" />
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-admin-accent-primary/10 border border-admin-accent-primary/20 rounded-xl">
                  <Edit className="h-5 w-5 text-admin-accent-primary" />
                </div>
                <div>
                  <h3 className="text-[10px] font-display font-black text-admin-text-primary tracking-[0.2em] uppercase leading-none mb-1">
                    Operaciones de Archivo
                  </h3>
                  <p className="text-[11px] font-serif italic text-admin-text-tertiary">
                    {selectedProducts.length}{" "}
                    {selectedProducts.length === 1
                      ? "registro seleccionado"
                      : "registros seleccionados"}{" "}
                    en cola técnica
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDeleteDialog(false);
                  setBulkOperation("");
                  setBulkUpdates({});
                  setForceDelete(false);
                  setSelectedProducts([]);
                }}
                className="h-7 w-7 p-0 text-admin-text-tertiary hover:text-admin-text-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>

            {!isDeleteDialog && (
              <div className="mb-4">
                <Label
                  htmlFor="operation"
                  className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
                >
                  Seleccionar Operación
                </Label>
                <Select
                  value={bulkOperation ?? ""}
                  onValueChange={setBulkOperation}
                >
                  <SelectTrigger className="mt-1.5 h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                    <SelectValue placeholder="Seleccionar operación" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-admin-border-primary/20">
                    <SelectItem value="update_status">
                      Cambiar Estado
                    </SelectItem>
                    <SelectItem value="update_category">
                      Cambiar Categoría
                    </SelectItem>
                    <SelectItem value="update_pricing">
                      Ajustar Precios
                    </SelectItem>
                    <SelectItem value="update_inventory">
                      Ajustar Inventario
                    </SelectItem>
                    <SelectItem value="duplicate">
                      Duplicar Productos
                    </SelectItem>
                    <SelectItem value="delete">
                      Archivar Productos (Eliminación Suave)
                    </SelectItem>
                    <SelectItem
                      value="hard_delete"
                      className="text-admin-error font-display font-bold"
                    >
                      ⚠️ Eliminar Permanentemente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkOperation && (
              <div className="pt-2 border-t border-admin-border-primary/20 mb-4">
                {renderBulkOperationForm(
                  bulkOperation,
                  bulkUpdates,
                  setBulkUpdates,
                  categories,
                  forceDelete,
                  setForceDelete,
                )}
              </div>
            )}

            <div className="flex items-center justify-end space-x-4 pt-6 mt-4 border-t border-admin-border-primary/10">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDeleteDialog(false);
                  setBulkOperation("");
                  setBulkUpdates({});
                  setForceDelete(false);
                  setSelectedProducts([]);
                }}
                disabled={processing}
                className="text-admin-text-tertiary hover:text-admin-text-primary uppercase text-[10px] font-bold tracking-widest"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBulkOperation}
                disabled={
                  processing ||
                  !bulkOperation ||
                  (bulkOperation === "hard_delete" && !forceDelete)
                }
                variant={
                  bulkOperation === "delete" || bulkOperation === "hard_delete"
                    ? "destructive"
                    : "default"
                }
                className={cn(
                  "min-w-[180px] h-12 rounded-xl font-display font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-premium-sm",
                  bulkOperation !== "delete" &&
                    bulkOperation !== "hard_delete" &&
                    "bg-admin-accent-primary text-[#1A2B23] hover:bg-admin-accent-secondary",
                )}
              >
                {processing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Procesando Operación...
                  </>
                ) : bulkOperation === "delete" ? (
                  "Archivar Registros"
                ) : bulkOperation === "hard_delete" ? (
                  "⚠️ ELIMINAR PERMANENTEMENTE"
                ) : (
                  "Ejecutar Cambios"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Display */}
      <ProductList
        products={paginatedProducts}
        viewMode={viewMode}
        selectedProducts={selectedProducts}
        onSelectProduct={handleSelectProduct}
        onSelectAll={handleSelectAll}
        onDelete={openDeleteDialog}
        formatPrice={formatPrice}
        getStatusBadge={getStatusBadge}
        onRefresh={handleRefresh}
        isRefreshing={productsLoading}
      />

      {/* Pagination - Show if there are products or if totalPages > 1 */}
      {(filteredProducts.length > 0 || totalPages > 1) && (
        <ProductPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalProducts={filteredProducts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
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
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setProductToDelete(null);
                }}
                disabled={deleteLoading}
                className="h-10 px-6 font-display font-bold text-[10px] tracking-widest uppercase rounded-xl border-admin-border-primary/20"
              >
                CANCELAR
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProduct}
                disabled={deleteLoading}
                className="h-10 px-8 font-display font-bold text-[10px] tracking-widest uppercase rounded-xl bg-admin-error hover:bg-admin-error/90"
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

// Helper function for bulk operation forms
function renderBulkOperationForm(
  bulkOperation: string,
  bulkUpdates: any,
  setBulkUpdates: (updates: any) => void,
  categories: any[],
  forceDelete: boolean,
  setForceDelete: (value: boolean) => void,
) {
  switch (bulkOperation) {
    case "update_status":
      return (
        <div className="space-y-2">
          <div>
            <Label
              htmlFor="status"
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
            >
              Nuevo Estado
            </Label>
            <Select
              value={bulkUpdates?.status ?? ""}
              onValueChange={(value) =>
                setBulkUpdates({ ...bulkUpdates, status: value })
              }
            >
              <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "update_category":
      return (
        <div className="space-y-2">
          <div>
            <Label
              htmlFor="category"
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
            >
              Nueva Categoría
            </Label>
            <Select
              value={bulkUpdates?.category_id ?? ""}
              onValueChange={(value) =>
                setBulkUpdates({ ...bulkUpdates, category_id: value })
              }
            >
              <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "update_pricing":
      return (
        <div className="space-y-2">
          <div>
            <Label
              htmlFor="adjustment_type"
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
            >
              Tipo de Ajuste
            </Label>
            <Select
              value={bulkUpdates?.adjustment_type ?? ""}
              onValueChange={(value) =>
                setBulkUpdates({ ...bulkUpdates, adjustment_type: value })
              }
            >
              <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                <SelectValue placeholder="Tipo de ajuste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje</SelectItem>
                <SelectItem value="fixed">Monto Fijo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              htmlFor="price_adjustment"
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
            >
              Ajuste{" "}
              {bulkUpdates.adjustment_type === "percentage" ? "(%)" : "($)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest"
              placeholder={
                bulkUpdates.adjustment_type === "percentage"
                  ? "ej: 10 para +10%"
                  : "ej: 500 para +$500"
              }
              onChange={(e) =>
                setBulkUpdates({
                  ...bulkUpdates,
                  price_adjustment: parseFloat(e.target.value),
                })
              }
            />
          </div>
        </div>
      );

    case "update_inventory":
      return (
        <div className="space-y-2">
          <div>
            <Label
              htmlFor="inventory_adjustment_type"
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
            >
              Tipo de Ajuste
            </Label>
            <Select
              value={bulkUpdates?.adjustment_type ?? ""}
              onValueChange={(value) =>
                setBulkUpdates({ ...bulkUpdates, adjustment_type: value })
              }
            >
              <SelectTrigger className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest uppercase">
                <SelectValue placeholder="Tipo de ajuste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set">Establecer cantidad</SelectItem>
                <SelectItem value="add">Agregar/Quitar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              htmlFor="inventory_adjustment"
              className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block"
            >
              {bulkUpdates.adjustment_type === "set"
                ? "Nueva Cantidad"
                : "Ajuste (+/-)"}
            </Label>
            <Input
              type="number"
              className="h-11 mt-1 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-[10px] tracking-widest"
              placeholder={
                bulkUpdates.adjustment_type === "set"
                  ? "ej: 50"
                  : "ej: -10 o +20"
              }
              onChange={(e) =>
                setBulkUpdates({
                  ...bulkUpdates,
                  inventory_adjustment: parseInt(e.target.value),
                })
              }
            />
          </div>
        </div>
      );

    case "delete":
      return (
        <div className="space-y-2">
          <div className="flex items-start space-x-2 p-3 bg-admin-error/5 border border-admin-error/20 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-admin-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-display font-bold text-admin-error text-sm uppercase tracking-wider">
                Confirmar eliminación suave
              </p>
              <p className="text-[11px] font-serif italic text-admin-text-secondary mt-0.5">
                Los productos seleccionados serán archivados. Esta acción se
                puede deshacer.
              </p>
            </div>
          </div>
        </div>
      );

    case "hard_delete":
      return (
        <div className="space-y-2">
          <div className="flex items-start space-x-2 p-3 bg-admin-error/10 border border-admin-error/30 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-admin-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-display font-bold text-admin-error text-sm uppercase tracking-wider">
                ⚠️ ELIMINACIÓN PERMANENTE
              </p>
              <p className="text-[11px] font-serif italic text-admin-text-secondary mt-0.5">
                Los productos seleccionados serán ELIMINADOS PERMANENTEMENTE.
              </p>
              <p className="text-[11px] font-display font-bold text-admin-error mt-1">
                ⚠️ Esta acción NO se puede deshacer.
              </p>
            </div>
          </div>
          <div className="p-2.5 bg-admin-warning/10 border border-admin-warning/30 rounded-xl">
            <p className="text-[11px] font-serif italic text-admin-text-secondary">
              <strong>Recomendación:</strong> Considera usar &quot;Eliminación
              suave&quot; (archivar) en su lugar.
            </p>
          </div>
          <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="force-delete"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
                className="mt-0.5"
              />
              <label
                htmlFor="force-delete"
                className="text-xs text-orange-900 font-medium cursor-pointer leading-tight"
              >
                Confirmo que entiendo que esta acción es irreversible y deseo
                continuar.
              </label>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
