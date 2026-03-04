"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency } from "@/lib/utils";
import { isOpticalFallbackMatrix } from "@/lib/lens-matrices/constants";

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
  name?: string | null;
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

export default function LensMatricesList() {
  const [matrices, setMatrices] = useState<LensPriceMatrix[]>([]);
  const [families, setFamilies] = useState<LensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState<LensPriceMatrix | null>(
    null,
  );
  const [includeInactive, setIncludeInactive] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [formData, setFormData] = useState({
    lens_family_id: "",
    name: "",
    sphere_min: "",
    sphere_max: "",
    cylinder_min: "0",
    cylinder_max: "0",
    base_price: "",
    cost: "",
    is_active: true,
  });

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    fetchMatrices();
  }, [includeInactive, selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const params = new URLSearchParams();
      if (includeInactive) {
        params.append("include_inactive", "true");
      }
      const response = await fetch(`/api/admin/lens-families?${params}`);
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
      if (includeInactive) {
        params.append("include_inactive", "true");
      }
      if (selectedFamilyId !== "all") {
        params.append("family_id", selectedFamilyId);
      }
      const response = await fetch(`/api/admin/lens-matrices?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMatrices(data.matrices || []);
      } else {
        toast.error("Error al cargar matrices de lentes");
      }
    } catch (error) {
      console.error("Error fetching matrices:", error);
      toast.error("Error al cargar matrices de lentes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingMatrix
        ? `/api/admin/lens-matrices/${editingMatrix.id}`
        : "/api/admin/lens-matrices";

      const method = editingMatrix ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar matriz");
      }

      toast.success(editingMatrix ? "Matriz actualizada" : "Matriz creada");
      setShowDialog(false);
      resetForm();
      fetchMatrices();
    } catch (error: any) {
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

  const resetForm = () => {
    setFormData({
      lens_family_id: "",
      name: "",
      sphere_min: "",
      sphere_max: "",
      cylinder_min: "0",
      cylinder_max: "0",
      base_price: "",
      cost: "",
      is_active: true,
    });
    setEditingMatrix(null);
  };

  const openEditDialog = (matrix: LensPriceMatrix) => {
    setEditingMatrix(matrix);
    setFormData({
      lens_family_id: matrix.lens_family_id,
      name: matrix.name ?? "",
      sphere_min: matrix.sphere_min.toString(),
      sphere_max: matrix.sphere_max.toString(),
      cylinder_min: matrix.cylinder_min.toString(),
      cylinder_max: matrix.cylinder_max.toString(),
      base_price: matrix.base_price.toString(),
      cost: matrix.cost.toString(),
      is_active: matrix.is_active,
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const filteredMatrices = matrices.filter((matrix) => {
    const searchLower = searchTerm.toLowerCase();
    const family = matrix.lens_families;

    return (
      family.name.toLowerCase().includes(searchLower) ||
      (family.brand || "").toLowerCase().includes(searchLower) ||
      matrix.sphere_min.toString().includes(searchLower) ||
      matrix.sphere_max.toString().includes(searchLower)
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Matrices de Precios de Lentes Ópticos</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
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
            <Button variant="outline" size="sm" onClick={fetchMatrices}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Matriz
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por familia, marca o rango de esfera..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={selectedFamilyId}
              onValueChange={setSelectedFamilyId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las familias" />
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Tipo de Lente</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Rango Esfera</TableHead>
                  <TableHead>Rango Cilindro</TableHead>
                  <TableHead>Precio Base</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMatrices.map((matrix) => {
                  const family = matrix.lens_families;
                  const isFallback = isOpticalFallbackMatrix(
                    matrix.sphere_min,
                    matrix.sphere_max,
                    matrix.cylinder_min,
                    matrix.cylinder_max,
                  );
                  return (
                    <TableRow key={matrix.id}>
                      <TableCell className="font-medium">
                        {family.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {matrix.name ||
                            `${matrix.sphere_min} a ${matrix.sphere_max}`}
                          {isFallback && (
                            <Badge variant="secondary" className="text-xs">
                              Fallback
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{family.brand || "-"}</TableCell>
                      <TableCell>
                        {LENS_TYPES.find((t) => t.value === family.lens_type)
                          ?.label || family.lens_type}
                      </TableCell>
                      <TableCell>
                        {LENS_MATERIALS.find(
                          (m) => m.value === family.lens_material,
                        )?.label || family.lens_material}
                      </TableCell>
                      <TableCell>
                        {matrix.sphere_min} a {matrix.sphere_max}
                      </TableCell>
                      <TableCell>
                        {matrix.cylinder_min} a {matrix.cylinder_max}
                      </TableCell>
                      <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                      <TableCell>{formatCurrency(matrix.cost)}</TableCell>
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
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(matrix)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(matrix.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredMatrices.length > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={totalMatrices}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemsPerPageOptions={[10, 20, 50, 100]}
            />
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMatrix ? "Editar Matriz" : "Crear Nueva Matriz"}
              </DialogTitle>
              <DialogDescription>
                {editingMatrix
                  ? "Modifica los parámetros de la matriz seleccionada"
                  : "Ingresa los detalles para crear una nueva matriz de precios"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="lens_family_id">Familia de Lente *</Label>
                  <Select
                    value={formData.lens_family_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, lens_family_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar familia" />
                    </SelectTrigger>
                    <SelectContent>
                      {families.map((family) => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.name}{" "}
                          {family.brand ? `(${family.brand})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="name">Nombre (opcional)</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Rango base, Fallback..."
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="sphere_min">Esfera Mínima *</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={formData.sphere_min}
                    onChange={(e) =>
                      setFormData({ ...formData, sphere_min: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sphere_max">Esfera Máxima *</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={formData.sphere_max}
                    onChange={(e) =>
                      setFormData({ ...formData, sphere_max: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cylinder_min">Cilindro Mínimo</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={formData.cylinder_min}
                    onChange={(e) =>
                      setFormData({ ...formData, cylinder_min: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="cylinder_max">Cilindro Máximo</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={formData.cylinder_max}
                    onChange={(e) =>
                      setFormData({ ...formData, cylinder_max: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="base_price">Precio Base *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cost">Costo *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_active">Matriz Activa</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMatrix ? "Actualizar" : "Crear"} Matriz
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
