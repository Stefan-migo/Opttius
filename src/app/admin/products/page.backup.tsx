"use client";

import { useState, useEffect, useRef } from "react";
import { extractDataFromResponse, extractTotalFromResponse } from "@/lib/api/response-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Settings,
  Download,
  Upload,
  Copy,
  FileText,
  CheckCircle,
  RefreshCw,
  Grid3X3,
  List,
  X,
  ChevronDown,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useBranch } from "@/hooks/useBranch";
import { BranchSelector } from "@/components/admin/BranchSelector";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  status: string;
  inventory_quantity: number;
  category?: { name: string };
  categories?: { name: string };
  is_featured: boolean;
  featured?: boolean;
  title?: string;
  created_at: string;
}

interface BulkOperationResult {
  success: boolean;
  operation: string;
  affected_count: number;
  results: any[];
}

export default function ProductsPage() {
  // Branch context
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  // View state
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Product customization settings
  const [productSettings, setProductSettings] = useState({
    visibleColumns: {
      name: true,
      price: true,
      stock: true,
      category: true,
      status: true,
      featured: true,
      createdAt: false,
    },
    itemsPerPage: 12,
    defaultView: "grid" as "grid" | "table",
    showLowStockWarning: true,
    autoRefresh: false,
  });

  // Load preferences from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem("admin-products-view-mode");
    if (savedViewMode === "grid" || savedViewMode === "table") {
      setViewMode(savedViewMode);
    }

    const savedSettings = localStorage.getItem("admin-products-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setProductSettings((prev) => ({ ...prev, ...parsed }));
        if (parsed.itemsPerPage) {
          setItemsPerPage(parsed.itemsPerPage);
        }
        if (parsed.defaultView) {
          setViewMode(parsed.defaultView);
        }
      } catch (e) {
        console.error("Error loading product settings:", e);
      }
    }
  }, []);

  // Save view preference to localStorage
  const handleViewModeChange = (mode: "grid" | "table") => {
    setViewMode(mode);
    localStorage.setItem("admin-products-view-mode", mode);
    const updatedSettings = { ...productSettings, defaultView: mode };
    setProductSettings(updatedSettings);
    localStorage.setItem(
      "admin-products-settings",
      JSON.stringify(updatedSettings),
    );
  };

  // Save settings
  const handleSaveSettings = () => {
    const updatedSettings = {
      ...productSettings,
      itemsPerPage,
      defaultView: viewMode,
    };
    setProductSettings(updatedSettings);
    localStorage.setItem(
      "admin-products-settings",
      JSON.stringify(updatedSettings),
    );
    setItemsPerPage(updatedSettings.itemsPerPage);
    toast.success("Configuración guardada exitosamente");
    setShowSettingsDialog(false);
  };

  // Toggle column visibility
  const toggleColumnVisibility = (column: string) => {
    setProductSettings((prev) => ({
      ...prev,
      visibleColumns: {
        ...prev.visibleColumns,
        [column]:
          !prev.visibleColumns[column as keyof typeof prev.visibleColumns],
      },
    }));
  };

  // Product data
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Global stats (unaffected by filters)
  const [globalStats, setGlobalStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    lowStockCount: 0,
    totalValue: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active"); // Show active products by default in admin
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

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
  const [jsonImportMode, setJsonImportMode] = useState("create"); // 'create', 'update', 'upsert', 'skip_duplicates'

  // Single product delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Categories management state (must be before early returns)
  const [categoriesTabActive, setCategoriesTabActive] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);

  useEffect(() => {
    console.log("🚀 ProductsPage component mounted");
    fetchGlobalStats(); // Fetch stats on mount
    fetchCategories();
  }, []);

  // Refetch stats when branch changes
  useEffect(() => {
    fetchGlobalStats();
  }, [currentBranchId, isGlobalView]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [
    currentPage,
    itemsPerPage,
    categoryFilter,
    statusFilter,
    currentBranchId,
  ]);

  const fetchProducts = async () => {
    try {
      console.log("📦 Fetching products...");
      setLoading(true);
      setError(null); // Clear any previous errors

      // Calculate offset for pagination
      const offset = (currentPage - 1) * itemsPerPage;

      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });

      // Fix: Only send status param when filtering, otherwise use include_archived
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      } else {
        params.append("include_archived", "true");
      }

      // Fix: Send category ID, not name
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }

      console.log("🔗 API URL:", `/api/admin/products?${params}`);

      // Add branch header if branch is selected
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (currentBranchId) {
        headers["x-branch-id"] = currentBranchId;
      } else if (isGlobalView && isSuperAdmin) {
        headers["x-branch-id"] = "global";
      }

      const response = await fetch(`/api/admin/products?${params}`, {
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("✅ API Response:", data);

      // Calculate pagination
      const total = extractTotalFromResponse(data);
      const calculatedTotalPages = Math.ceil(total / itemsPerPage);

      setProducts(extractDataFromResponse<Product>(data));
      setTotalProducts(total);
      setTotalPages(calculatedTotalPages);
    } catch (error) {
      console.error("❌ Error fetching products:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
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

  const fetchGlobalStats = async () => {
    try {
      // Fetch products to calculate stats - filter by branch if selected, or get all if global view
      const params = new URLSearchParams({
        limit: "10000", // Large limit to get all products
        include_archived: "true", // Include all statuses
      });

      // Add branch header if branch is selected, or 'global' if in global view
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (currentBranchId) {
        headers["x-branch-id"] = currentBranchId;
      } else if (isGlobalView && isSuperAdmin) {
        headers["x-branch-id"] = "global";
      }

      const response = await fetch(`/api/admin/products?${params}`, {
        headers,
      });
      if (!response.ok) {
        console.error("Failed to fetch stats");
        return;
      }

      const data = await response.json();
      const allProducts = extractDataFromResponse<Product>(data);

      // Calculate stats (branch-specific or global depending on currentBranchId)
      const stats = {
        totalProducts: allProducts.length,
        activeProducts: allProducts.filter(
          (p: Product) => p.status === "active" || !p.status,
        ).length,
        lowStockCount: allProducts.filter(
          (p: Product) => (p.inventory_quantity || 0) <= 5,
        ).length,
        totalValue: allProducts.reduce(
          (sum: number, p: Product) =>
            sum + (p.price || 0) * (p.inventory_quantity || 0),
          0,
        ),
      };

      setGlobalStats(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
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
      selectedProducts.length === filteredProducts.length
        ? []
        : filteredProducts.map((p) => p.id),
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

      const response = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: bulkOperation,
          product_ids: selectedProducts,
          updates: {
            ...bulkUpdates,
            force_delete: forceDelete,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || "Failed to perform bulk operation";
        toast.error(errorMessage);
        return; // Don't throw error, just show toast and return
      }

      const result: BulkOperationResult = await response.json();

      toast.success(
        `Operación completada: ${result.affected_count} productos afectados`,
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

  // Import/Export functions
  const handleJsonExport = async () => {
    try {
      const params = new URLSearchParams({
        format: "json",
        ...(categoryFilter !== "all" && { category_id: categoryFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
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

      const response = await fetch("/api/admin/products/import-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products,
          mode: jsonImportMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to import JSON products");
      }

      const result = await response.json();
      setJsonImportResults(result);

      if (result.success) {
        const summary = result.summary || {};
        let message = `Importación JSON completada: `;
        if (summary.created > 0) message += `${summary.created} creados `;
        if (summary.updated > 0) message += `${summary.updated} actualizados `;
        if (summary.skipped > 0) message += `${summary.skipped} omitidos `;
        toast.success(message);
        fetchProducts();
      } else {
        toast.error("Error en la importación JSON");
      }
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

      const response = await fetch(
        `/api/admin/products/${productToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete product");
      }

      const result = await response.json();

      setProducts((prevProducts) =>
        prevProducts.filter((p) => p.id !== productToDelete.id),
      );

      setDeleteDialogOpen(false);
      setProductToDelete(null);

      toast.success("Producto eliminado exitosamente");
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
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Activo" },
      draft: { variant: "secondary", label: "Borrador" },
      archived: { variant: "outline", label: "Archivado" },
    };

    const statusConfig = config[status] || config["draft"];
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  // Filter products (client-side filtering for search and low stock toggle)
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLowStock =
      !showLowStockOnly || (product.inventory_quantity || 0) <= 5;

    return matchesSearch && matchesLowStock;
  });

  // Bulk operation form renderer
  const renderBulkOperationForm = () => {
    switch (bulkOperation) {
      case "update_status":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Nuevo Estado</Label>
              <Select
                onValueChange={(value) =>
                  setBulkUpdates({ ...bulkUpdates, status: value })
                }
              >
                <SelectTrigger>
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Nueva Categoría</Label>
              <Select
                onValueChange={(value) =>
                  setBulkUpdates({ ...bulkUpdates, category_id: value })
                }
              >
                <SelectTrigger>
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="adjustment_type">Tipo de Ajuste</Label>
              <Select
                onValueChange={(value) =>
                  setBulkUpdates({ ...bulkUpdates, adjustment_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de ajuste" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje</SelectItem>
                  <SelectItem value="fixed">Monto Fijo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price_adjustment">
                Ajuste{" "}
                {bulkUpdates.adjustment_type === "percentage" ? "(%)" : "($)"}
              </Label>
              <Input
                type="number"
                step="0.01"
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="inventory_adjustment_type">Tipo de Ajuste</Label>
              <Select
                onValueChange={(value) =>
                  setBulkUpdates({ ...bulkUpdates, adjustment_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de ajuste" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Establecer cantidad</SelectItem>
                  <SelectItem value="add">Agregar/Quitar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="inventory_adjustment">
                {bulkUpdates.adjustment_type === "set"
                  ? "Nueva Cantidad"
                  : "Ajuste (+/-)"}
              </Label>
              <Input
                type="number"
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
          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  Confirmar eliminación suave
                </p>
                <p className="text-sm text-red-600">
                  Los {selectedProducts.length} productos seleccionados serán
                  archivados (eliminación suave). Esta acción se puede deshacer
                  cambiando el estado a &quot;Activo&quot;.
                </p>
              </div>
            </div>
          </div>
        );

      case "hard_delete":
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-4 bg-red-100 border border-red-300 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-700" />
              <div>
                <p className="font-medium text-red-900">
                  ⚠️ ELIMINACIÓN PERMANENTE
                </p>
                <p className="text-sm text-red-700 font-medium">
                  Los {selectedProducts.length} productos seleccionados serán
                  ELIMINADOS PERMANENTEMENTE de la base de datos.
                </p>
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ Esta acción NO se puede deshacer. Todos los datos del
                  producto se perderán para siempre.
                </p>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Recomendación:</strong> Considera usar &quot;Eliminación
                suave&quot; (archivar) en su lugar, que permite recuperar los
                productos si es necesario.
              </p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="force_delete"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.target.checked)}
                  className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-orange-300 rounded"
                />
                <div>
                  <label
                    htmlFor="force_delete"
                    className="text-sm font-medium text-orange-900"
                  >
                    Forzar eliminación (incluye productos con órdenes)
                  </label>
                  <p className="text-xs text-orange-700 mt-1">
                    ⚠️ Marca esta opción si quieres eliminar productos que
                    tienen órdenes asociadas. Esto eliminará también los
                    elementos de las órdenes relacionadas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">
              Gestión de Productos
            </h1>
            <p className="text-tierra-media">
              Administra tu catálogo de productos biocosmética
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Error al cargar productos
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log("🎨 ProductsPage rendering, loading:", loading, "error:", error);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleCategoryInputChange = (field: string, value: string) => {
    setCategoryFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "name") {
      setCategoryFormData((prev) => ({
        ...prev,
        name: value,
        slug: generateSlug(value),
      }));
    }
  };

  const openCreateCategoryDialog = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: "", slug: "", description: "" });
    setCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category: any) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
    });
    setCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryFormData.name.trim()) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    try {
      setCategoryFormLoading(true);

      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";

      const method = editingCategory ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save category");
      }

      const result = await response.json();

      if (editingCategory) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === editingCategory.id ? result.category : cat,
          ),
        );
        toast.success("Categoría actualizada exitosamente");
      } else {
        setCategories((prev) => [...prev, result.category]);
        toast.success("Categoría creada exitosamente");
      }

      setCategoryDialogOpen(false);
      setCategoryFormData({ name: "", slug: "", description: "" });
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al guardar la categoría",
      );
    } finally {
      setCategoryFormLoading(false);
    }
  };

  const handleDeleteCategory = async (category: any) => {
    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar la categoría "${category.name}"?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete category");
      }

      setCategories((prev) => prev.filter((cat) => cat.id !== category.id));
      toast.success("Categoría eliminada exitosamente");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al eliminar la categoría",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo">
            Gestión de Productos
          </h1>
          <p className="text-tierra-media">
            Administra tu catálogo de productos y categorías
          </p>
        </div>

        <div className="flex space-x-2">
          <Link href="/admin/products/options">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Opciones
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                JSON
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleJsonExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Productos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open("/api/admin/products/json-template", "_blank")
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowJsonImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Productos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/admin/products/add">
            <Button className="group btn-enhanced px-6 py-3 lg:px-8 lg:py-4 text-white font-semibold text-sm lg:text-base w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Agregar Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* Branch Selector - Only show for super admins or when multiple branches available */}
      {(isSuperAdmin || (branches && branches.length > 1)) && (
        <Card className="bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  Sucursal de Trabajo
                </Label>
                <p className="text-xs text-tierra-media mt-1">
                  {isSuperAdmin
                    ? "Selecciona la sucursal para ver y gestionar productos"
                    : "Selecciona la sucursal para gestionar productos"}
                </p>
              </div>
              <BranchSelector />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning if no branch selected (for non-super admins) */}
      {!currentBranchId && !isSuperAdmin && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-800">
                Debes seleccionar una sucursal para ver y gestionar productos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Products and Categories */}
      <Tabs
        value={categoriesTabActive ? "categories" : "products"}
        onValueChange={(value) =>
          setCategoriesTabActive(value === "categories")
        }
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="h-4 w-4 mr-2" />
            Categorías
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6 mt-6">
          {/* Stats Cards - Show branch-specific stats or global stats */}
          {(() => {
            const currentBranch = branches?.find(
              (b) => b.id === currentBranchId,
            );
            const statsLabel = isGlobalView
              ? "Todas las sucursales"
              : currentBranch
                ? `Sucursal: ${currentBranch.name}`
                : "Sucursal seleccionada";

            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Package className="h-8 w-8 text-azul-profundo" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-tierra-media">
                          Total Productos
                        </p>
                        <p className="text-2xl font-bold text-azul-profundo">
                          {globalStats.totalProducts}
                        </p>
                        <p className="text-xs text-tierra-media mt-1">
                          {statsLabel}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8 text-verde-suave" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-tierra-media">
                          Productos Activos
                        </p>
                        <p className="text-2xl font-bold text-verde-suave">
                          {globalStats.activeProducts}
                        </p>
                        <p className="text-xs text-tierra-media mt-1">
                          {statsLabel}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-tierra-media">
                          Stock Bajo
                        </p>
                        <p className="text-2xl font-bold text-red-500">
                          {globalStats.lowStockCount}
                        </p>
                        <p className="text-xs text-tierra-media mt-1">
                          {statsLabel}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <BarChart3 className="h-8 w-8 text-dorado" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-tierra-media">
                          Valor Total
                        </p>
                        <p className="text-2xl font-bold text-dorado">
                          {formatPrice(globalStats.totalValue)}
                        </p>
                        <p className="text-xs text-tierra-media mt-1">
                          {statsLabel}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Search and Filters */}
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            <CardHeader>
              <CardTitle className="flex items-center text-azul-profundo">
                <Filter className="h-5 w-5 mr-2" />
                Filtros y Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar productos por nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="w-full sm:w-48">
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las categorías" />
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
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
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

                {/* Low Stock Toggle */}
                <div className="w-full sm:w-auto">
                  <Button
                    variant={showLowStockOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowLowStockOnly(!showLowStockOnly);
                      setSearchTerm("");
                      setCategoryFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    {showLowStockOnly ? "Ver Todos" : "Ver"}
                    <AlertTriangle className="h-4 w-4 ml-2" />
                    Stock Bajo
                  </Button>
                </div>

                {/* View Mode Toggle */}
                <div className="w-full sm:w-auto flex items-center gap-2 border rounded-md p-1 bg-background">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewModeChange("grid")}
                    className="flex-1"
                    title="Vista de cartas"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewModeChange("table")}
                    className="flex-1"
                    title="Vista de lista"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selection Actions */}
          {selectedProducts.length > 0 && (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge variant="secondary">
                      {selectedProducts.length} productos seleccionados
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
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
                          setForceDelete(false);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setIsDeleteDialog(false);
                            setBulkOperation("");
                            setBulkUpdates({});
                            setForceDelete(false);
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
                                    value="hard_delete"
                                    className="text-red-600 font-medium"
                                  >
                                    ⚠️ Eliminar Permanentemente
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {bulkOperation && renderBulkOperationForm()}
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowBulkDialog(false);
                              setIsDeleteDialog(false);
                              setBulkOperation("");
                              setBulkUpdates({});
                              setForceDelete(false);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleBulkOperation}
                            disabled={processing || !bulkOperation}
                            variant={
                              bulkOperation === "delete" ||
                              bulkOperation === "hard_delete"
                                ? "destructive"
                                : "default"
                            }
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

          {/* Products Display */}
          {viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="transition-all duration-200 hover:shadow-md"
                  style={{ backgroundColor: "var(--admin-bg-tertiary)" }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                            className="rounded border-gray-300"
                          />
                          <CardTitle className="text-lg text-azul-profundo line-clamp-2">
                            {product.name || product.title}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {product.categories?.name ||
                              product.category?.name ||
                              (typeof product.category === "string"
                                ? product.category
                                : "") ||
                              "Sin categoría"}
                          </Badge>
                        </div>
                      </div>
                      {(product.featured || product.is_featured) && (
                        <Badge className="bg-dorado text-azul-profundo ml-2">
                          Destacado
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-verde-suave">
                        {formatPrice(product.price || 0)}
                      </p>
                      {getStatusBadge(product.status || "active")}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-tierra-media">Stock:</span>
                      <span
                        className={`font-medium ${(product.inventory_quantity || 0) <= 5 ? "text-red-500" : "text-verde-suave"}`}
                      >
                        {product.inventory_quantity || 0} unidades
                        {(product.inventory_quantity || 0) <= 5 && (
                          <AlertTriangle className="h-4 w-4 inline ml-1" />
                        )}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <Link href={`/admin/products/${product.slug}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <Link href={`/admin/products/edit/${product.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Table View */
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Productos ({filteredProducts.length})
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedProducts.length === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-tierra-media">
                      Seleccionar todos
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedProducts.length ===
                              filteredProducts.length &&
                            filteredProducts.length > 0
                          }
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-tierra-media">
                              {product.slug}
                            </div>
                            {product.is_featured && (
                              <Badge variant="outline" className="text-xs">
                                Destacado
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {product.categories?.name ||
                          product.category?.name ? (
                            <Badge variant="outline">
                              {product.categories?.name ||
                                product.category?.name}
                            </Badge>
                          ) : (
                            <span className="text-tierra-media">
                              Sin categoría
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="font-medium">
                          {formatPrice(product.price)}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{product.inventory_quantity}</span>
                            {product.inventory_quantity <= 5 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(product.status)}</TableCell>

                        <TableCell className="text-sm text-tierra-media">
                          {new Date(product.created_at).toLocaleDateString(
                            "es-AR",
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex space-x-2">
                            <Link href={`/admin/products/${product.slug}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </Link>
                            <Link href={`/admin/products/edit/${product.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(product)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-tierra-media mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-azul-profundo mb-2">
                      No se encontraron productos
                    </h3>
                    <p className="text-tierra-media">
                      Ajusta los filtros o agrega nuevos productos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-tierra-media">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(currentPage * itemsPerPage, totalProducts)} de{" "}
                    {totalProducts} productos
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>

                    <div className="flex items-center space-x-1">
                      {/* First page */}
                      {currentPage > 3 && (
                        <>
                          <Button
                            variant={currentPage === 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                          >
                            1
                          </Button>
                          {currentPage > 4 && <span className="px-2">...</span>}
                        </>
                      )}

                      {/* Pages around current */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          return (
                            page === currentPage ||
                            page === currentPage - 1 ||
                            page === currentPage + 1 ||
                            (page === currentPage - 2 && currentPage <= 3) ||
                            (page === currentPage + 2 &&
                              currentPage >= totalPages - 2)
                          );
                        })
                        .map((page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ))}

                      {/* Last page */}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && (
                            <span className="px-2">...</span>
                          )}
                          <Button
                            variant={
                              currentPage === totalPages ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>

                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 / pág</SelectItem>
                        <SelectItem value="24">24 / pág</SelectItem>
                        <SelectItem value="48">48 / pág</SelectItem>
                        <SelectItem value="100">100 / pág</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 mt-6">
          {/* Categories Management */}
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-azul-profundo">
                  Gestión de Categorías
                </CardTitle>
                <Button onClick={openCreateCategoryDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Categoría
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="h-16 w-16 text-tierra-media mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-azul-profundo mb-2">
                    No hay categorías
                  </h3>
                  <p className="text-tierra-media mb-6">
                    Crea categorías para organizar tus productos
                  </p>
                  <Button onClick={openCreateCategoryDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Categoría
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <Card
                      key={category.id}
                      className="bg-admin-bg-secondary"
                      style={{ backgroundColor: "var(--admin-border-primary)" }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg text-azul-profundo">
                              {category.name}
                            </CardTitle>
                            <p className="text-sm text-tierra-media mt-1">
                              {category.slug}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditCategoryDialog(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCategory(category)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {category.description && (
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {category.description}
                          </p>
                        )}
                        <div className="mt-4 text-xs text-gray-500">
                          Creada:{" "}
                          {new Date(category.created_at).toLocaleDateString(
                            "es-ES",
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Create/Edit Dialog */}
          <Dialog
            open={categoryDialogOpen}
            onOpenChange={setCategoryDialogOpen}
          >
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory
                    ? "Modifica los datos de la categoría"
                    : "Crea una nueva categoría para organizar tus productos"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Nombre *</Label>
                  <Input
                    id="category-name"
                    value={categoryFormData.name}
                    onChange={(e) =>
                      handleCategoryInputChange("name", e.target.value)
                    }
                    placeholder="Ej: Lentes de Sol"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category-slug">Slug</Label>
                  <Input
                    id="category-slug"
                    value={categoryFormData.slug}
                    onChange={(e) =>
                      handleCategoryInputChange("slug", e.target.value)
                    }
                    placeholder="lentes-de-sol"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL amigable (se genera automáticamente)
                  </p>
                </div>

                <div>
                  <Label htmlFor="category-description">Descripción</Label>
                  <Textarea
                    id="category-description"
                    value={categoryFormData.description}
                    onChange={(e) =>
                      handleCategoryInputChange("description", e.target.value)
                    }
                    placeholder="Descripción opcional de la categoría"
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCategoryDialogOpen(false)}
                    disabled={categoryFormLoading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={categoryFormLoading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {categoryFormLoading
                      ? "Guardando..."
                      : editingCategory
                        ? "Actualizar"
                        : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-dorado/20 rounded-lg">
                <Plus className="h-6 w-6 text-dorado" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-azul-profundo">
                  Agregar Producto
                </h3>
                <p className="text-sm text-tierra-media">
                  Crear nuevo producto
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/products/add">Crear</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-azul-profundo">Stock Bajo</h3>
                <p className="text-sm text-tierra-media">
                  {globalStats.lowStockCount} productos necesitan restock
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowLowStockOnly(!showLowStockOnly);
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}
              >
                {showLowStockOnly ? "Ver Todos" : "Ver"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-azul-profundo/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-azul-profundo" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-azul-profundo">Analíticas</h3>
                <p className="text-sm text-tierra-media">
                  Ver rendimiento de productos
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/admin/analytics")}
              >
                Ver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el producto &quot;
              {productToDelete?.name}&quot;?
              <br />
              <strong>Esta es una eliminación suave:</strong> El producto será
              archivado (cambio de estado a &quot;Archivado&quot;) y se puede
              restaurar cambiando su estado a &quot;Activo&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
            >
              {deleteLoading ? "Eliminando..." : "Eliminar Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Import Dialog */}
      <Dialog
        open={showJsonImportDialog}
        onOpenChange={setShowJsonImportDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Productos desde JSON</DialogTitle>
            <DialogDescription>
              Sube un archivo JSON para importar productos masivamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Modo de Importación
              </label>
              <select
                value={jsonImportMode}
                onChange={(e) => setJsonImportMode(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="create">
                  Solo productos nuevos - Crear únicamente productos que no
                  existen
                </option>
                <option value="update">
                  Solo productos existentes - Actualizar únicamente productos
                  que ya existen
                </option>
                <option value="upsert">
                  Crear/Actualizar - Crear nuevos y actualizar existentes
                </option>
                <option value="skip_duplicates">
                  Omitir duplicados - Crear solo si no existe, omitir duplicados
                </option>
              </select>
              <p className="text-sm text-tierra-media mt-1">
                Elige cómo manejar productos duplicados o existentes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Archivo JSON
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleJsonImport(file);
                  }
                }}
              />
              <p className="text-sm text-tierra-media mt-1">
                Formato JSON con array de productos. Descarga la plantilla para
                ver el formato correcto.
              </p>
            </div>

            {jsonImportResults && (
              <div className="mt-4 p-4 border rounded-lg">
                <h4 className="font-medium mb-2">
                  Resultados de Importación JSON
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Total: {jsonImportResults.total}</div>
                  <div>Exitosos: {jsonImportResults.successful}</div>
                  <div>Fallidos: {jsonImportResults.failed}</div>
                </div>

                {jsonImportResults.errors &&
                  jsonImportResults.errors.length > 0 && (
                    <div className="mt-2">
                      <h5 className="font-medium text-red-600">Errores:</h5>
                      <ul className="text-sm text-red-600 max-h-32 overflow-y-auto">
                        {jsonImportResults.errors.map(
                          (error: any, index: number) => (
                            <li key={index}>
                              Producto {error.index + 1} ({error.product}):{" "}
                              {error.error}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowJsonImportDialog(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
