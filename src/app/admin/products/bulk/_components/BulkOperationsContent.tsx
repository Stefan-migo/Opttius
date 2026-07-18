"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Edit,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/hooks/useBranch";
import { extractDataFromResponse } from "@/lib/api/response-helpers";
import type { Product } from "@/lib/api/services";
import { productService } from "@/lib/api/services";

import { BulkOperationForm } from "./BulkOperationForm";
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
      console.error("Error fetching products:", error);
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
      console.error("Error fetching categories:", error);
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
      console.error("Error exporting products:", error);
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
            onOpenChange={setShowImportDialog}
            onImportComplete={() => {
              setShowImportDialog(false);
              fetchProducts();
            }}
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

                <Dialog
                  open={showBulkDialog}
                  onOpenChange={(open) => {
                    setShowBulkDialog(open);
                    if (!open) {
                      setIsDeleteDialog(false);
                      setBulkOperation("");
                      setBulkUpdates({});
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setIsDeleteDialog(false);
                        setBulkOperation("");
                        setBulkUpdates({});
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Operaciones Masivas
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {bulkOperation === "delete"
                          ? "Archivar Productos"
                          : bulkOperation === "hard_delete"
                            ? "⚠️ Eliminar Permanentemente"
                            : "Operación Masiva"}
                      </DialogTitle>
                      <DialogDescription>
                        {bulkOperation === "delete"
                          ? `Archivar ${selectedProducts.length} productos seleccionados`
                          : bulkOperation === "hard_delete"
                            ? `ELIMINAR PERMANENTEMENTE ${selectedProducts.length} productos seleccionados`
                            : `Aplicar cambios a ${selectedProducts.length} productos seleccionados`}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {!isDeleteDialog && (
                        <div>
                          <Label htmlFor="operation">Operación</Label>
                          <Select
                            value={bulkOperation}
                            onValueChange={setBulkOperation}
                          >
                            <SelectTrigger>
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
                                className="text-red-600 font-medium"
                                value="hard_delete"
                              >
                                ⚠️ Eliminar Permanentemente
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {bulkOperation && (
                        <BulkOperationForm
                          bulkOperation={bulkOperation}
                          selectedProducts={selectedProducts}
                          categories={categories}
                          bulkUpdates={bulkUpdates}
                          onBulkUpdatesChange={setBulkUpdates}
                        />
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBulkDialog(false);
                          setIsDeleteDialog(false);
                          setBulkOperation("");
                          setBulkUpdates({});
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        disabled={processing || !bulkOperation}
                        variant={
                          bulkOperation === "delete" ||
                          bulkOperation === "hard_delete"
                            ? "destructive"
                            : "default"
                        }
                        onClick={handleBulkOperation}
                      >
                        {processing && (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {bulkOperation === "delete"
                          ? "Archivar Productos"
                          : bulkOperation === "hard_delete"
                            ? "⚠️ ELIMINAR PERMANENTEMENTE"
                            : "Aplicar Cambios"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ProductsTable
        products={products}
        selectedProducts={selectedProducts}
        onSelectProduct={handleSelectProduct}
        onSelectAll={handleSelectAll}
      />
    </div>
  );
}
