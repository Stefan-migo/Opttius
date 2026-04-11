"use client";

import {
  Edit,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/formatting";

interface LensFamily {
  id: string;
  name: string;
  brand: string | null;
  lens_type: string;
  lens_material: string;
}

interface LensPriceMatrix {
  id: string;
  lens_family_id: string;
  sphere_min: number;
  sphere_max: number;
  cylinder_min: number;
  cylinder_max: number;
  base_price: number;
  sourcing_type: string;
  cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lens_families: LensFamily;
}

const LENS_TYPES = [
  { value: "single_vision", label: "Monofocal" },
  { value: "bifocal", label: "Bifocal" },
  { value: "trifocal", label: "Trifocal" },
  { value: "progressive", label: "Progresivo" },
  { value: "reading", label: "Lectura" },
  { value: "computer", label: "Computadora" },
  { value: "sports", label: "Deportivo" },
];

const LENS_MATERIALS = [
  { value: "cr39", label: "CR-39" },
  { value: "polycarbonate", label: "Policarbonato" },
  { value: "high_index_1_67", label: "Alto Índice 1.67" },
  { value: "high_index_1_74", label: "Alto Índice 1.74" },
  { value: "trivex", label: "Trivex" },
  { value: "glass", label: "Vidrio" },
];

export default function LensMatricesPage() {
  const [matrices, setMatrices] = useState<LensPriceMatrix[]>([]);
  const [families, setFamilies] = useState<LensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState<LensPriceMatrix | null>(
    null,
  );
  const [includeInactive, setIncludeInactive] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [formData, setFormData] = useState({
    lens_family_id: "",
    sphere_min: "",
    sphere_max: "",
    cylinder_min: "",
    cylinder_max: "",
    addition_min: "0",
    addition_max: "4.0",
    base_price: "",
    sourcing_type: "surfaced" as "stock" | "surfaced",
    cost: "",
    is_active: true,
  });

  useEffect(() => {
    fetchFamilies();
    fetchMatrices();
  }, [includeInactive, selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const response = await fetch(
        "/api/admin/lens-families?include_inactive=true",
      );
      if (response.ok) {
        const data = await response.json();
        setFamilies(data.families || []);
      }
    } catch (error) {
      console.error("Error fetching families:", error);
    }
  };

  const fetchMatrices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedFamilyId !== "all") {
        params.append("family_id", selectedFamilyId);
      }
      if (includeInactive) {
        params.append("include_inactive", "true");
      }
      const response = await fetch(
        `/api/admin/lens-matrices?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Error al cargar matrices");
      }
      const data = await response.json();
      setMatrices(data.matrices || []);
    } catch (error) {
      console.error("Error fetching matrices:", error);
      toast.error("Error al cargar matrices de precios");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (matrix?: LensPriceMatrix) => {
    if (matrix) {
      setEditingMatrix(matrix);
      setFormData({
        lens_family_id: matrix.lens_family_id,
        sphere_min: matrix.sphere_min.toString(),
        sphere_max: matrix.sphere_max.toString(),
        cylinder_min: matrix.cylinder_min.toString(),
        cylinder_max: matrix.cylinder_max.toString(),
        addition_min: (matrix as unknown).addition_min?.toString() || "0",
        addition_max: (matrix as unknown).addition_max?.toString() || "4.0",
        base_price: matrix.base_price.toString(),
        sourcing_type: matrix.sourcing_type as "stock" | "surfaced",
        cost: matrix.cost.toString(),
        is_active: matrix.is_active,
      });
    } else {
      setEditingMatrix(null);
      setFormData({
        lens_family_id: selectedFamilyId !== "all" ? selectedFamilyId : "",
        sphere_min: "",
        sphere_max: "",
        cylinder_min: "",
        cylinder_max: "",
        addition_min: "0",
        addition_max: "4.0",
        base_price: "",
        sourcing_type: "surfaced",
        cost: "",
        is_active: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingMatrix(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMatrix
        ? `/api/admin/lens-matrices/${editingMatrix.id}`
        : "/api/admin/lens-matrices";
      const method = editingMatrix ? "PUT" : "POST";

      const body: unknown = {
        lens_family_id: formData.lens_family_id,
        sphere_min: parseFloat(formData.sphere_min),
        sphere_max: parseFloat(formData.sphere_max),
        cylinder_min: parseFloat(formData.cylinder_min),
        cylinder_max: parseFloat(formData.cylinder_max),
        addition_min: parseFloat(formData.addition_min),
        addition_max: parseFloat(formData.addition_max),
        base_price: parseFloat(formData.base_price),
        cost: parseFloat(formData.cost),
        sourcing_type: formData.sourcing_type,
        is_active: formData.is_active,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar matriz");
      }

      toast.success(
        editingMatrix
          ? "Matriz actualizada exitosamente"
          : "Matriz creada exitosamente",
      );
      handleCloseDialog();
      fetchMatrices();
    } catch (error: unknown) {
      toast.error(error.message || "Error al guardar matriz");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta matriz?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/lens-matrices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar matriz");
      }

      toast.success("Matriz eliminada exitosamente");
      fetchMatrices();
    } catch (error) {
      toast.error("Error al eliminar matriz");
    }
  };

  const filteredMatrices = matrices.filter((matrix) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      matrix.lens_families.name.toLowerCase().includes(searchLower) ||
      (matrix.lens_families.brand || "").toLowerCase().includes(searchLower) ||
      matrix.sourcing_type.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalMatrices = filteredMatrices.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMatrices = filteredMatrices.slice(startIndex, endIndex);
  const totalPages = Math.ceil(totalMatrices / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFamilyId, includeInactive]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Matrices de Precios de Lentes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las matrices de precios para calcular costos de lentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Matriz
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Matrices</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIncludeInactive(!includeInactive)}
              >
                {includeInactive ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Ocultar Inactivas
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Mostrar Inactivas
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={fetchMatrices}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar por familia, tipo o material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-64">
              <Select
                value={selectedFamilyId}
                onValueChange={setSelectedFamilyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por familia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las familias</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredMatrices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron matrices de precios
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Familia</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Rango Esfera</TableHead>
                    <TableHead>Rango Cilindro</TableHead>
                    <TableHead>Rango Adición</TableHead>
                    <TableHead>Precio Venta</TableHead>
                    <TableHead>Costo Compra</TableHead>
                    <TableHead>Sourcing</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMatrices.map((matrix) => (
                    <TableRow key={matrix.id}>
                      <TableCell className="font-medium">
                        {matrix.lens_families.name}
                      </TableCell>
                      <TableCell>
                        {
                          LENS_TYPES.find(
                            (t) => t.value === matrix.lens_families.lens_type,
                          )?.label
                        }
                      </TableCell>
                      <TableCell>
                        {
                          LENS_MATERIALS.find(
                            (m) =>
                              m.value === matrix.lens_families.lens_material,
                          )?.label
                        }
                      </TableCell>
                      <TableCell>
                        {matrix.sphere_min} a {matrix.sphere_max}
                      </TableCell>
                      <TableCell>
                        {matrix.cylinder_min} a {matrix.cylinder_max}
                      </TableCell>
                      <TableCell>
                        {(matrix as unknown).addition_min !== null &&
                        (matrix as unknown).addition_min !== undefined
                          ? `${(matrix as unknown).addition_min} a ${(matrix as unknown).addition_max || "4.0"}`
                          : "0.00 a 0.00"}
                      </TableCell>
                      <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                      <TableCell>{formatCurrency(matrix.cost)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {matrix.sourcing_type === "stock"
                            ? "Stock"
                            : "Surfaced"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={matrix.is_active ? "default" : "secondary"}
                        >
                          {matrix.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(matrix)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(matrix.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredMatrices.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={[10, 20, 50, 100]}
                totalItems={totalMatrices}
                totalPages={totalPages}
                onItemsPerPageChange={setItemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="max-w-3xl max-h-[95vh] overflow-y-auto"
          key={`dialog-${editingMatrix?.id || "new"}-${Date.now()}`}
        >
          <DialogHeader>
            <DialogTitle>
              {editingMatrix ? "Editar Matriz" : "Nueva Matriz"}
            </DialogTitle>
            <DialogDescription>
              {editingMatrix
                ? "Modifica los datos de la matriz de precios"
                : "Crea una nueva matriz de precios para lentes"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4">
              <div>
                <Label htmlFor="lens_family_id">Familia de Lente *</Label>
                <Select
                  required
                  value={formData.lens_family_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, lens_family_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar familia" />
                  </SelectTrigger>
                  <SelectContent>
                    {families
                      .filter((f) => (f as unknown).is_active !== false)
                      .map((family) => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.name} {family.brand && `(${family.brand})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.lens_family_id && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  {(() => {
                    const fam = families.find(
                      (f) => f.id === formData.lens_family_id,
                    );
                    const typeLabel = fam
                      ? LENS_TYPES.find((t) => t.value === fam.lens_type)?.label
                      : undefined;
                    const materialLabel = fam
                      ? LENS_MATERIALS.find(
                          (m) => m.value === fam.lens_material,
                        )?.label
                      : undefined;
                    return (
                      <p className="text-sm text-blue-800">
                        Esta familia ya define <b>Tipo</b>: {typeLabel || "—"} y{" "}
                        <b>Material</b>: {materialLabel || "—"}.
                      </p>
                    );
                  })()}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sphere_min">Esfera Mínima *</Label>
                  <Input
                    required
                    id="sphere_min"
                    placeholder="-10.00"
                    step="0.25"
                    type="number"
                    value={formData.sphere_min}
                    onChange={(e) =>
                      setFormData({ ...formData, sphere_min: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="sphere_max">Esfera Máxima *</Label>
                  <Input
                    required
                    id="sphere_max"
                    placeholder="+6.00"
                    step="0.25"
                    type="number"
                    value={formData.sphere_max}
                    onChange={(e) =>
                      setFormData({ ...formData, sphere_max: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cylinder_min">Cilindro Mínimo *</Label>
                  <Input
                    required
                    id="cylinder_min"
                    placeholder="-2.00"
                    step="0.25"
                    type="number"
                    value={formData.cylinder_min}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cylinder_min: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cylinder_max">Cilindro Máximo *</Label>
                  <Input
                    required
                    id="cylinder_max"
                    placeholder="0.00"
                    step="0.25"
                    type="number"
                    value={formData.cylinder_max}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cylinder_max: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Campos de Adición para Presbicia - SIEMPRE VISIBLES */}
              <div
                className="border-t-2 border-purple-300 pt-5 mt-5"
                style={{ display: "block" }}
              >
                <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg mb-4">
                  <p className="text-sm font-semibold text-purple-900 mb-2">
                    💡 Campos de Adición (Presbicia):
                  </p>
                  <p className="text-xs text-purple-700">
                    Estos campos definen el rango de adición para cerca.
                    Necesarios para calcular precios de lentes progresivos,
                    bifocales y trifocales.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      className="text-sm font-semibold"
                      htmlFor="addition_min"
                    >
                      Adición Mínima (Dioptrías) *
                      <span className="text-xs text-gray-500 ml-1 font-normal">
                        (0.00 - 4.00)
                      </span>
                    </Label>
                    <Input
                      required
                      className="mt-2"
                      id="addition_min"
                      max="4"
                      min="0"
                      placeholder="0.00"
                      step="0.25"
                      type="number"
                      value={formData.addition_min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          addition_min: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Monofocales:</strong> 0.00 |{" "}
                      <strong>Progresivos/Bifocales:</strong> 0.00
                    </p>
                  </div>
                  <div>
                    <Label
                      className="text-sm font-semibold"
                      htmlFor="addition_max"
                    >
                      Adición Máxima (Dioptrías) *
                      <span className="text-xs text-gray-500 ml-1 font-normal">
                        (0.00 - 4.00)
                      </span>
                    </Label>
                    <Input
                      required
                      className="mt-2"
                      id="addition_max"
                      max="4"
                      min="0"
                      placeholder="4.00"
                      step="0.25"
                      type="number"
                      value={formData.addition_max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          addition_max: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Monofocales:</strong> 0.00 |{" "}
                      <strong>Progresivos/Bifocales:</strong> 4.00
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="base_price">Precio Venta *</Label>
                <Input
                  required
                  id="base_price"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={formData.base_price}
                  onChange={(e) =>
                    setFormData({ ...formData, base_price: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="cost">Costo Compra *</Label>
                <Input
                  required
                  id="cost"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="sourcing_type">Tipo de Sourcing *</Label>
                <Select
                  required
                  value={formData.sourcing_type}
                  onValueChange={(value: "stock" | "surfaced") =>
                    setFormData({ ...formData, sourcing_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock (en bodega)</SelectItem>
                    <SelectItem value="surfaced">
                      Surfaced (fabricar)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* V2: Sin costos duplicados ni multiplicadores. El pricing se define por filas (rangos). */}

              <div className="flex items-center space-x-2">
                <input
                  checked={formData.is_active}
                  className="h-4 w-4 rounded border-gray-300"
                  id="is_active"
                  type="checkbox"
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
                <Label className="cursor-pointer" htmlFor="is_active">
                  Activa
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingMatrix ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Matrices desde CSV</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV con las matrices de precios siguiendo el
              formato especificado abajo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold">
                El formato debe incluir las siguientes columnas:
              </p>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="font-semibold text-sm mb-2 text-blue-900">
                  Columnas Requeridas:
                </p>
                <div className="space-y-1 text-xs font-mono text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-blue-100 px-1 rounded">
                        family_name
                      </code>{" "}
                      - Nombre de la familia de lentes
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-blue-100 px-1 rounded">
                        sphere_min
                      </code>{" "}
                      - Esfera mínima (ej: -10.00)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-blue-100 px-1 rounded">
                        sphere_max
                      </code>{" "}
                      - Esfera máxima (ej: 6.00)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-blue-100 px-1 rounded">
                        cylinder_min
                      </code>{" "}
                      - Cilindro mínimo (ej: -4.00)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-blue-100 px-1 rounded">
                        cylinder_max
                      </code>{" "}
                      - Cilindro máximo (ej: 4.00)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-blue-100 px-1 rounded">price</code> o{" "}
                      <code className="bg-blue-100 px-1 rounded">
                        base_price
                      </code>{" "}
                      - Precio de venta
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-blue-100 px-1 rounded">cost</code> -
                      Costo de compra
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-blue-100 px-1 rounded">
                        sourcing_type
                      </code>{" "}
                      - Tipo:{" "}
                      <code className="bg-blue-100 px-1 rounded">stock</code> o{" "}
                      <code className="bg-blue-100 px-1 rounded">surfaced</code>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <p className="font-semibold text-sm mb-2 text-purple-900">
                  Columnas para Presbicia (Adición):
                </p>
                <div className="space-y-1 text-xs font-mono text-purple-800">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-purple-100 px-1 rounded">
                        addition_min
                      </code>{" "}
                      - Adición mínima (default: 0.00)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-purple-100 px-1 rounded">
                        addition_max
                      </code>{" "}
                      - Adición máxima (default: 4.00)
                    </span>
                  </div>
                </div>
                <p className="text-xs text-purple-700 mt-2">
                  <strong>Importante:</strong> Estos campos son necesarios para
                  calcular precios de lentes progresivos, bifocales y trifocales
                  que requieren adición para cerca.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="font-semibold text-sm mb-2 text-amber-900">
                  Columnas Opcionales:
                </p>
                <div className="space-y-1 text-xs font-mono text-amber-800">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>
                      <code className="bg-amber-100 px-1 rounded">
                        is_active
                      </code>{" "}
                      - Activa (default: true)
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                <p className="font-semibold text-xs mb-2 text-gray-700">
                  📝 Notas importantes sobre Adición:
                </p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>
                    <strong>Lentes Monofocales (single_vision):</strong> Usar{" "}
                    <code className="bg-gray-200 px-1 rounded">
                      addition_min = 0.00
                    </code>{" "}
                    y{" "}
                    <code className="bg-gray-200 px-1 rounded">
                      addition_max = 0.00
                    </code>
                  </li>
                  <li>
                    <strong>Lentes Progresivos/Bifocales/Trifocales:</strong>{" "}
                    Usar{" "}
                    <code className="bg-gray-200 px-1 rounded">
                      addition_min = 0.00
                    </code>{" "}
                    y{" "}
                    <code className="bg-gray-200 px-1 rounded">
                      addition_max = 4.00
                    </code>{" "}
                    (rango completo)
                  </li>
                  <li>
                    <strong>Rango de Adición:</strong> Valores válidos entre
                    0.00 y 4.00 dioptrías
                  </li>
                  <li>
                    Si no se especifican, se usarán los valores por defecto
                    (0.00 y 4.00)
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="font-semibold text-xs mb-2 text-green-800">
                  📄 Ejemplo de formato CSV:
                </p>
                <pre className="text-xs font-mono text-green-700 bg-green-100 p-2 rounded overflow-x-auto">
                  {`family_name,sphere_min,sphere_max,cylinder_min,cylinder_max,price,cost,sourcing_type,addition_min,addition_max
Varilux Comfort,-10.00,6.00,-4.00,4.00,120000,80000,surfaced,0.00,4.00
Poly Blue Single,-10.00,6.00,-4.00,4.00,80000,50000,stock,0.00,0.00`}
                </pre>
              </div>
            </div>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const fileInput = formData.get("file") as File;

              if (!fileInput) {
                toast.error("Por favor selecciona un archivo CSV");
                return;
              }

              try {
                const uploadFormData = new FormData();
                uploadFormData.append("file", fileInput);

                const response = await fetch(
                  "/api/admin/lens-matrices/import",
                  {
                    method: "POST",
                    body: uploadFormData,
                  },
                );

                const result = await response.json();

                if (!response.ok) {
                  throw new Error(result.error || "Error al importar");
                }

                toast.success(
                  `Importación completada: ${result.success} exitosas, ${result.errors} errores`,
                );

                if (result.errors > 0 && result.details?.errors) {
                  console.error(
                    "Errores de importación:",
                    result.details.errors,
                  );
                  // Show first few errors
                  const errorMessages = result.details.errors
                    .slice(0, 5)
                    .map((err: unknown) => `Fila ${err.row}: ${err.error}`)
                    .join("\n");
                  toast.error(
                    `Algunos errores:\n${errorMessages}${
                      result.details.errors.length > 5
                        ? `\n... y ${result.details.errors.length - 5} más`
                        : ""
                    }`,
                    { duration: 10000 },
                  );
                }

                setShowImportDialog(false);
                fetchMatrices();
              } catch (error: unknown) {
                toast.error(error.message || "Error al importar CSV");
              }
            }}
          >
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="file">Archivo CSV</Label>
                <Input
                  required
                  accept=".csv"
                  className="mt-2"
                  id="file"
                  name="file"
                  type="file"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  El archivo debe tener encabezados en la primera fila
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowImportDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Importar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
