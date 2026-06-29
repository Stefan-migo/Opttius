"use client";

import {
  Edit,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
import { formatCurrency } from "@/lib/utils";
import type {
  ContactLensFamily,
  ContactLensPriceMatrix,
} from "@/types/contact-lens";

interface ContactLensPriceMatrixWithFamily extends ContactLensPriceMatrix {
  contact_lens_families: ContactLensFamily;
}

const USE_TYPES = [
  { value: "daily", label: "Diario" },
  { value: "bi_weekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "extended_wear", label: "Uso Prolongado" },
];

const MODALITIES = [
  { value: "spherical", label: "Esférico" },
  { value: "toric", label: "Tórico" },
  { value: "multifocal", label: "Multifocal" },
  { value: "cosmetic", label: "Cosmético" },
];

export default function ContactLensMatricesContent() {
  const [matrices, setMatrices] = useState<ContactLensPriceMatrixWithFamily[]>(
    [],
  );
  const [families, setFamilies] = useState<ContactLensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMatrix, setEditingMatrix] =
    useState<ContactLensPriceMatrixWithFamily | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [formData, setFormData] = useState({
    contact_lens_family_id: "",
    sphere_min: "",
    sphere_max: "",
    cylinder_min: "0",
    cylinder_max: "0",
    axis_min: "0",
    axis_max: "180",
    addition_min: "0",
    addition_max: "4.0",
    base_price: "",
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
        "/api/admin/contact-lens-families?include_inactive=true",
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
        `/api/admin/contact-lens-matrices?${params.toString()}`,
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

  const handleOpenDialog = (matrix?: ContactLensPriceMatrixWithFamily) => {
    if (matrix) {
      setEditingMatrix(matrix);
      setFormData({
        contact_lens_family_id: matrix.contact_lens_family_id,
        sphere_min: matrix.sphere_min.toString(),
        sphere_max: matrix.sphere_max.toString(),
        cylinder_min: matrix.cylinder_min.toString(),
        cylinder_max: matrix.cylinder_max.toString(),
        axis_min: matrix.axis_min.toString(),
        axis_max: matrix.axis_max.toString(),
        addition_min: matrix.addition_min.toString(),
        addition_max: matrix.addition_max.toString(),
        base_price: matrix.base_price.toString(),
        cost: matrix.cost.toString(),
        is_active: matrix.is_active,
      });
    } else {
      setEditingMatrix(null);
      setFormData({
        contact_lens_family_id:
          selectedFamilyId !== "all" ? selectedFamilyId : "",
        sphere_min: "",
        sphere_max: "",
        cylinder_min: "0",
        cylinder_max: "0",
        axis_min: "0",
        axis_max: "180",
        addition_min: "0",
        addition_max: "4.0",
        base_price: "",
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
        ? `/api/admin/contact-lens-matrices/${editingMatrix.id}`
        : "/api/admin/contact-lens-matrices";
      const method = editingMatrix ? "PUT" : "POST";

      const body: unknown = {
        contact_lens_family_id: formData.contact_lens_family_id,
        sphere_min: parseFloat(formData.sphere_min),
        sphere_max: parseFloat(formData.sphere_max),
        cylinder_min: parseFloat(formData.cylinder_min),
        cylinder_max: parseFloat(formData.cylinder_max),
        axis_min: parseInt(formData.axis_min),
        axis_max: parseInt(formData.axis_max),
        addition_min: parseFloat(formData.addition_min),
        addition_max: parseFloat(formData.addition_max),
        base_price: parseFloat(formData.base_price),
        cost: parseFloat(formData.cost),
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
      const response = await fetch(`/api/admin/contact-lens-matrices/${id}`, {
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
      matrix.contact_lens_families.name.toLowerCase().includes(searchLower) ||
      (matrix.contact_lens_families.brand || "")
        .toLowerCase()
        .includes(searchLower) ||
      MODALITIES.find((m) => m.value === matrix.contact_lens_families.modality)
        ?.label.toLowerCase()
        .includes(searchLower)
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
          <h1 className="text-3xl font-bold">
            Matrices de Precios de Lentes de Contacto
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las matrices de precios para calcular costos de lentes de
            contacto
          </p>
        </div>
        <div className="flex gap-2">
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
                  placeholder="Buscar por familia o modalidad..."
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
                    <TableHead>Uso</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead>Rango Esfera</TableHead>
                    <TableHead>Rango Cilindro</TableHead>
                    <TableHead>Rango Eje</TableHead>
                    <TableHead>Rango Adición</TableHead>
                    <TableHead>Precio Venta</TableHead>
                    <TableHead>Costo Compra</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMatrices.map((matrix) => (
                    <TableRow key={matrix.id}>
                      <TableCell className="font-medium">
                        {matrix.contact_lens_families.name}
                      </TableCell>
                      <TableCell>
                        {
                          USE_TYPES.find(
                            (t) =>
                              t.value === matrix.contact_lens_families.use_type,
                          )?.label
                        }
                      </TableCell>
                      <TableCell>
                        {
                          MODALITIES.find(
                            (m) =>
                              m.value === matrix.contact_lens_families.modality,
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
                        {matrix.axis_min}° a {matrix.axis_max}°
                      </TableCell>
                      <TableCell>
                        {matrix.addition_min} a {matrix.addition_max}
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

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredMatrices.length}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMatrix ? "Editar Matriz" : "Nueva Matriz"}
            </DialogTitle>
            <DialogDescription>
              {editingMatrix
                ? "Modifica los datos de la matriz de precios"
                : "Completa los datos para crear una nueva matriz de precios"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="contact_lens_family_id">
                  Familia de Lentes de Contacto{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  required
                  value={formData.contact_lens_family_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contact_lens_family_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar familia" />
                  </SelectTrigger>
                  <SelectContent>
                    {families
                      .filter((f) => f.is_active)
                      .map((family) => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.name} (
                          {
                            USE_TYPES.find((t) => t.value === family.use_type)
                              ?.label
                          }
                          )
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sphere_min">
                    Esfera Mínima <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    id="sphere_min"
                    step="0.25"
                    type="number"
                    value={formData.sphere_min}
                    onChange={(e) =>
                      setFormData({ ...formData, sphere_min: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sphere_max">
                    Esfera Máxima <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    id="sphere_max"
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
                <div className="space-y-2">
                  <Label htmlFor="cylinder_min">Cilindro Mínimo</Label>
                  <Input
                    id="cylinder_min"
                    step="0.25"
                    type="number"
                    value={formData.cylinder_min}
                    onChange={(e) =>
                      setFormData({ ...formData, cylinder_min: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cylinder_max">Cilindro Máximo</Label>
                  <Input
                    id="cylinder_max"
                    step="0.25"
                    type="number"
                    value={formData.cylinder_max}
                    onChange={(e) =>
                      setFormData({ ...formData, cylinder_max: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="axis_min">Eje Mínimo (°)</Label>
                  <Input
                    id="axis_min"
                    max="180"
                    min="0"
                    type="number"
                    value={formData.axis_min}
                    onChange={(e) =>
                      setFormData({ ...formData, axis_min: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="axis_max">Eje Máximo (°)</Label>
                  <Input
                    id="axis_max"
                    max="180"
                    min="0"
                    type="number"
                    value={formData.axis_max}
                    onChange={(e) =>
                      setFormData({ ...formData, axis_max: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addition_min">Adición Mínima</Label>
                  <Input
                    id="addition_min"
                    max="4"
                    min="0"
                    step="0.25"
                    type="number"
                    value={formData.addition_min}
                    onChange={(e) =>
                      setFormData({ ...formData, addition_min: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addition_max">Adición Máxima</Label>
                  <Input
                    id="addition_max"
                    max="4"
                    min="0"
                    step="0.25"
                    type="number"
                    value={formData.addition_max}
                    onChange={(e) =>
                      setFormData({ ...formData, addition_max: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_price">
                    Precio de Venta (por caja){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    id="base_price"
                    min="0"
                    step="0.01"
                    type="number"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">
                    Costo (por caja) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    id="cost"
                    min="0"
                    step="0.01"
                    type="number"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  checked={formData.is_active}
                  className="rounded"
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
    </div>
  );
}
