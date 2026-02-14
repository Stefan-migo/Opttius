"use client";

import { useState, useEffect } from "react";
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
import QuickActions from "../components/QuickActions";
import ProductActions from "../components/ProductActions";
import { formatCurrency } from "@/lib/utils";
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

  // Import/Export states
  const [showJsonImportDialog, setShowJsonImportDialog] = useState(false);
  const [jsonImportResults, setJsonImportResults] = useState<any>(null);
  const [jsonImportMode, setJsonImportMode] = useState("create");

  // Single product delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

      toast.success(
        `Operación completada: ${result.success.length} productos afectados`,
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

  // Import/Export functions
  const handleJsonExport = async () => {
    try {
      const params = new URLSearchParams({
        format: "json",
        ...(filters.categoryFilter !== "all" && {
          category_id: filters.categoryFilter,
        }),
        ...(filters.statusFilter !== "all" && { status: filters.statusFilter }),
      });

      const response = await fetch(`/api/admin/products/bulk?${params}`);
      if (!response.ok) {
        throw new Error("Failed to export products");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `productos-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Productos exportados exitosamente");
    } catch (error) {
      console.error("Error exporting products:", error);
      toast.error("Error al exportar productos");
    }
  };

  const handleJsonImport = async (file: File) => {
    if (!file) return;

    try {
      setProcessing(true);

      const text = await file.text();
      const products = JSON.parse(text);

      const result = await productService.importProductsJson(products, {
        updateExisting: jsonImportMode === "update",
      });

      setJsonImportResults(result);

      let message = `Importación JSON completada: `;
      if (result.imported > 0) message += `${result.imported} creados `;
      if (result.updated > 0) message += `${result.updated} actualizados `;
      if (result.errors.length > 0)
        message += `${result.errors.length} errores `;
      toast.success(message);
      refetchProducts();
    } catch (error) {
      console.error("Error importing JSON products:", error);
      toast.error("Error al importar productos JSON");
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 text-tierra-media mx-auto mb-4 animate-pulse" />
          <p className="text-tierra-media">Cargando productos...</p>
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
                className="px-4 py-2 bg-azul-profundo text-white rounded hover:bg-azul-profundo/90"
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
          className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-lg animate-in slide-in-from-top-2 duration-300"
          style={{ position: "relative", zIndex: 1 }}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base text-blue-900 dark:text-blue-100 font-semibold">
                    Operaciones Masivas
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {selectedProducts.length} producto
                    {selectedProducts.length > 1 ? "s" : ""} seleccionado
                    {selectedProducts.length > 1 ? "s" : ""}
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
                className="h-7 w-7 p-0"
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
                <Label htmlFor="operation" className="text-xs font-semibold">
                  Seleccionar Operación
                </Label>
                <Select value={bulkOperation} onValueChange={setBulkOperation}>
                  <SelectTrigger className="mt-1.5 h-9">
                    <SelectValue placeholder="Seleccionar operación" />
                  </SelectTrigger>
                  <SelectContent>
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
                      className="text-red-600 font-medium"
                    >
                      ⚠️ Eliminar Permanentemente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkOperation && (
              <div className="pt-2 border-t border-blue-200 dark:border-blue-800 mb-4">
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

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-blue-200 dark:border-blue-800">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialog(false);
                  setBulkOperation("");
                  setBulkUpdates({});
                  setForceDelete(false);
                  setSelectedProducts([]);
                }}
                disabled={processing}
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
                className="min-w-[140px]"
              >
                {processing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : bulkOperation === "delete" ? (
                  "Archivar Productos"
                ) : bulkOperation === "hard_delete" ? (
                  "⚠️ ELIMINAR PERMANENTEMENTE"
                ) : (
                  "Aplicar Cambios"
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

      {/* Quick Actions */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-azul-profundo mb-4">
            Acciones Rápidas
          </h3>
          <QuickActions
            onShowLowStock={() => {
              updateFilter("showLowStockOnly", true);
              setCurrentPage(1);
            }}
            onJsonExport={handleJsonExport}
            onJsonImport={() => setShowJsonImportDialog(true)}
            onShowCategories={() => {}}
            hasLowStock={stats.lowStockCount > 0}
            lowStockCount={stats.lowStockCount}
          />
        </div>
      </div>

      {/* Single Product Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Eliminar Producto
            </DialogTitle>
            <DialogDescription className="py-3">
              ¿Estás seguro de que deseas eliminar el producto{" "}
              <span className="font-bold">
                &quot;{productToDelete?.name}&quot;
              </span>
              ?
              <br />
              <br />
              Esta acción eliminará el producto permanentemente de la base de
              datos y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProductToDelete(null);
              }}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={deleteLoading}
              className="min-w-[100px]"
            >
              {deleteLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
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
            <Label htmlFor="status" className="text-xs">
              Nuevo Estado
            </Label>
            <Select
              onValueChange={(value) =>
                setBulkUpdates({ ...bulkUpdates, status: value })
              }
            >
              <SelectTrigger className="h-9 mt-1">
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
            <Label htmlFor="category" className="text-xs">
              Nueva Categoría
            </Label>
            <Select
              onValueChange={(value) =>
                setBulkUpdates({ ...bulkUpdates, category_id: value })
              }
            >
              <SelectTrigger className="h-9 mt-1">
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
            <Label htmlFor="adjustment_type" className="text-xs">
              Tipo de Ajuste
            </Label>
            <Select
              value={bulkUpdates.adjustment_type || ""}
              onValueChange={(value) =>
                setBulkUpdates({ ...bulkUpdates, adjustment_type: value })
              }
            >
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Tipo de ajuste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje</SelectItem>
                <SelectItem value="fixed">Monto Fijo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="price_adjustment" className="text-xs">
              Ajuste{" "}
              {bulkUpdates.adjustment_type === "percentage" ? "(%)" : "($)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              className="h-9 mt-1"
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
            <Label htmlFor="inventory_adjustment_type" className="text-xs">
              Tipo de Ajuste
            </Label>
            <Select
              value={bulkUpdates.adjustment_type || ""}
              onValueChange={(value) =>
                setBulkUpdates({ ...bulkUpdates, adjustment_type: value })
              }
            >
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Tipo de ajuste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set">Establecer cantidad</SelectItem>
                <SelectItem value="add">Agregar/Quitar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="inventory_adjustment" className="text-xs">
              {bulkUpdates.adjustment_type === "set"
                ? "Nueva Cantidad"
                : "Ajuste (+/-)"}
            </Label>
            <Input
              type="number"
              className="h-9 mt-1"
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
          <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800 text-sm">
                Confirmar eliminación suave
              </p>
              <p className="text-xs text-red-600 mt-0.5">
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
          <div className="flex items-start space-x-2 p-3 bg-red-100 border border-red-300 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-900 text-sm">
                ⚠️ ELIMINACIÓN PERMANENTE
              </p>
              <p className="text-xs text-red-700 font-medium mt-0.5">
                Los productos seleccionados serán ELIMINADOS PERMANENTEMENTE.
              </p>
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Esta acción NO se puede deshacer.
              </p>
            </div>
          </div>
          <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Recomendación:</strong> Considera usar &quot;Eliminación
              suave&quot; (archivar) en su lugar.
            </p>
          </div>
          <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
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
