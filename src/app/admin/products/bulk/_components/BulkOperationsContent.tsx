"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBranch } from "@/hooks/useBranch";
import { extractDataFromResponse } from "@/lib/api/response-helpers";
import type { Product } from "@/lib/api/services";
import { productService } from "@/lib/api/services";
import { appLogger } from '@/lib/logger';

import { BulkActionDialog } from "./_components/BulkActionDialog";
import { BulkFiltersBar } from "./_components/BulkFiltersBar";
import { ImportProductsDialog } from "./ImportProductsDialog";
import { ProductsTable } from "./ProductsTable";

export default function BulkOperationsContent() {
  const { currentBranchId, isSuperAdmin } = useBranch();
  const queryClient = useQueryClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Bulk operation states
  const [bulkOperation, setBulkOperation] = useState("");
  const [bulkUpdates, setBulkUpdates] = useState<Record<string, unknown>>({});
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isDeleteDialog, setIsDeleteDialog] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [searchTerm, categoryFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const result = await productService.getProducts({
        search: searchTerm || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setProducts(result.data);
    } catch (error) {
      appLogger.error("Error fetching products:", error);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(extractDataFromResponse(data));
      }
    } catch (error) {
      appLogger.error("Error fetching categories:", error);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const handleSelectAll = () => {
    setSelectedProducts(
      selectedProducts.length === products.length
        ? []
        : products.map((p) => p.id),
    );
  };

  const handleBulkOperation = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }

    if (!bulkOperation) {
      toast.error("Selecciona una operación");
      return;
    }

    // Validate inventory update specific fields
    if (bulkOperation === "update_inventory") {
      if (!bulkUpdates.adjustment_type) {
        toast.error(
          "Selecciona un tipo de ajuste (Establecer cantidad o Agregar/Quitar)",
        );
        return;
      }
      if (
        bulkUpdates.inventory_adjustment === undefined ||
        bulkUpdates.inventory_adjustment === null ||
        isNaN(Number(bulkUpdates.inventory_adjustment))
      ) {
        toast.error("Ingresa un valor válido para el ajuste de inventario");
        return;
      }
    }

    try {
      setProcessing(true);

      const result = await productService.bulkProducts({
        products: selectedProducts.map((id) => ({ id, ...bulkUpdates })),
        action: bulkOperation as "create" | "update" | "delete",
      });

      // Invalidate React Query cache to refresh the products list
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productStats"] });

      toast.success(
        `Operación completada: ${result.success.length} productos afectados`,
      );
      setShowBulkDialog(false);
      setIsDeleteDialog(false);
      setSelectedProducts([]);
      setBulkOperation("");
      setBulkUpdates({});
      fetchProducts();
    } catch (error) {
      appLogger.error("Error performing bulk operation:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al realizar la operación masiva";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await productService.exportProducts("csv", {
        category: categoryFilter,
        status: statusFilter,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `productos-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Productos exportados exitosamente");
    } catch (error) {
      appLogger.error("Error exporting products:", error);
      toast.error("Error al exportar productos");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">
              Operaciones Masivas
            </h1>
            <p className="text-tierra-media">Cargando productos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/products">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">
              Operaciones Masivas
            </h1>
            <p className="text-tierra-media">
              Gestiona múltiples productos de forma eficiente
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <ImportProductsDialog
            open={showImportDialog}
            onImportComplete={() => {
              setShowImportDialog(false);
              fetchProducts();
            }}
            onOpenChange={setShowImportDialog}
          />
        </div>
      </div>

      {/* Selection Actions */}
      {selectedProducts.length > 0 && (
        <Card className="border-dorado">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">
                  {selectedProducts.length} productos seleccionados
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedProducts([])}
                >
                  Limpiar selección
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setBulkOperation("delete");
                    setIsDeleteDialog(true);
                    setShowBulkDialog(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>

                <BulkActionDialog
                  bulkOperation={bulkOperation}
                  bulkUpdates={bulkUpdates}
                  categories={categories}
                  isDeleteDialog={isDeleteDialog}
                  open={showBulkDialog}
                  processing={processing}
                  selectedProducts={selectedProducts}
                  onBulkOperationChange={(op) => { setIsDeleteDialog(false); setBulkOperation(op); }}
                  onBulkUpdatesChange={setBulkUpdates}
                  onExecute={handleBulkOperation}
                  onOpenChange={(open) => { setShowBulkDialog(open); if (!open) { setIsDeleteDialog(false); setBulkOperation(""); setBulkUpdates({}); } }}
                  onTriggerClick={() => { setIsDeleteDialog(false); setBulkOperation(""); setBulkUpdates({}); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <BulkFiltersBar
        categories={categories} categoryFilter={categoryFilter} searchTerm={searchTerm}
        statusFilter={statusFilter}
        onCategoryChange={setCategoryFilter} onSearchChange={setSearchTerm} onStatusChange={setStatusFilter}
      />

      <ProductsTable
        products={products}
        selectedProducts={selectedProducts}
        onSelectAll={handleSelectAll}
        onSelectProduct={handleSelectProduct}
      />
    </div>
  );
}
