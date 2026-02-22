"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import type {
  ContactLensFamily,
  ContactLensUseType,
  ContactLensModality,
  ContactLensPackaging,
} from "@/types/contact-lens";

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

const MATERIALS = [
  { value: "silicone_hydrogel", label: "Hidrogel de Silicona" },
  { value: "hydrogel", label: "Hidrogel" },
  { value: "rigid_gas_permeable", label: "RGP" },
];

const PACKAGING_TYPES = [
  { value: "box_30", label: "Caja de 30 lentes" },
  { value: "box_6", label: "Caja de 6 lentes" },
  { value: "box_3", label: "Caja de 3 lentes" },
  { value: "bottle", label: "Botella" },
];

export default function ContactLensFamiliesPage() {
  const [families, setFamilies] = useState<ContactLensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingFamily, setEditingFamily] = useState<ContactLensFamily | null>(
    null,
  );
  const [includeInactive, setIncludeInactive] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [formData, setFormData] = useState<{
    name: string;
    brand: string;
    category_id: string | null;
    use_type: ContactLensUseType;
    modality: ContactLensModality;
    material: string | undefined;
    packaging: ContactLensPackaging;
    base_curve: string;
    diameter: string;
    description: string;
    is_active: boolean;
  }>({
    name: "",
    brand: "",
    category_id: null,
    use_type: "monthly",
    modality: "spherical",
    material: undefined,
    packaging: "box_6",
    base_curve: "",
    diameter: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchFamilies();
  }, [includeInactive]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        const cats = json.categories || json.data || [];
        setCategories(
          cats.filter((c: { slug?: string }) =>
            [
              "lentes-contacto",
              "monofocales",
              "progresivos",
              "bifocales",
              "lectura",
              "ocupacional",
              "deportivo",
            ].includes(c.slug ?? ""),
          ),
        );
      })
      .catch(() => setCategories([]));
  }, []);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (includeInactive) {
        params.append("include_inactive", "true");
      }
      const response = await fetch(
        `/api/admin/contact-lens-families?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setFamilies(data.data || data.families || []);
      } else {
        toast.error("Error al cargar familias de lentes de contacto");
      }
    } catch (error) {
      console.error("Error fetching families:", error);
      toast.error("Error al cargar familias de lentes de contacto");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (family?: ContactLensFamily) => {
    if (family) {
      setEditingFamily(family);
      setFormData({
        name: family.name,
        brand: family.brand || "",
        category_id: (family as { category_id?: string }).category_id || null,
        use_type: family.use_type,
        modality: family.modality,
        material: family.material || "",
        packaging: family.packaging,
        base_curve: family.base_curve?.toString() || "",
        diameter: family.diameter?.toString() || "",
        description: family.description || "",
        is_active: family.is_active,
      });
    } else {
      setEditingFamily(null);
      setFormData({
        name: "",
        brand: "",
        category_id: null,
        use_type: "monthly",
        modality: "spherical",
        material: "",
        packaging: "box_6",
        base_curve: "",
        diameter: "",
        description: "",
        is_active: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingFamily(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingFamily
        ? `/api/admin/contact-lens-families/${editingFamily.id}`
        : "/api/admin/contact-lens-families";
      const method = editingFamily ? "PUT" : "POST";

      const body: any = {
        name: formData.name,
        brand: formData.brand || null,
        category_id: formData.category_id || null,
        use_type: formData.use_type,
        modality: formData.modality,
        packaging: formData.packaging,
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (formData.material) {
        body.material = formData.material;
      }

      if (formData.base_curve) {
        body.base_curve = parseFloat(formData.base_curve);
      }

      if (formData.diameter) {
        body.diameter = parseFloat(formData.diameter);
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar familia");
      }

      toast.success(
        editingFamily
          ? "Familia actualizada exitosamente"
          : "Familia creada exitosamente",
      );
      handleCloseDialog();
      fetchFamilies();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar familia");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta familia?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/contact-lens-families/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar familia");
      }

      toast.success("Familia eliminada exitosamente");
      fetchFamilies();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar familia");
    }
  };

  // Filter families based on search term
  const filteredFamilies = families.filter(
    (family) =>
      family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (family.brand &&
        family.brand.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Pagination
  const totalPages = Math.ceil(filteredFamilies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFamilies = filteredFamilies.slice(startIndex, endIndex);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary hover:text-epoch-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Productos
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Familias de Lentes de Contacto</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchFamilies()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Button onClick={() => handleOpenDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Familia
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o marca..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeInactive"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeInactive" className="cursor-pointer">
                Incluir inactivas
              </Label>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Uso</TableHead>
                      <TableHead>Modalidad</TableHead>
                      <TableHead>Embalaje</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFamilies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No se encontraron familias
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedFamilies.map((family) => (
                        <TableRow key={family.id}>
                          <TableCell className="font-medium">
                            {family.name}
                          </TableCell>
                          <TableCell>{family.brand || "-"}</TableCell>
                          <TableCell>
                            {
                              USE_TYPES.find((t) => t.value === family.use_type)
                                ?.label
                            }
                          </TableCell>
                          <TableCell>
                            {
                              MODALITIES.find(
                                (m) => m.value === family.modality,
                              )?.label
                            }
                          </TableCell>
                          <TableCell>
                            {
                              PACKAGING_TYPES.find(
                                (p) => p.value === family.packaging,
                              )?.label
                            }
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                family.is_active ? "default" : "secondary"
                              }
                            >
                              {family.is_active ? (
                                <>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Activa
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Inactiva
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(family)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(family.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredFamilies.length}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFamily ? "Editar Familia" : "Nueva Familia"}
            </DialogTitle>
            <DialogDescription>
              {editingFamily
                ? "Modifica los datos de la familia de lentes de contacto"
                : "Completa los datos para crear una nueva familia de lentes de contacto"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Categoría</Label>
                <Select
                  value={formData.category_id ?? "__none__"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category_id: value === "__none__" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="use_type">
                    Tipo de Uso <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.use_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, use_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modality">
                    Modalidad <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.modality}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, modality: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALITIES.map((mod) => (
                        <SelectItem key={mod.value} value={mod.value}>
                          {mod.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <Select
                    value={formData.material || "__none__"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        material: value === "__none__" ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Ninguno</SelectItem>
                      {MATERIALS.map((mat) => (
                        <SelectItem key={mat.value} value={mat.value}>
                          {mat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packaging">
                    Embalaje <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.packaging}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, packaging: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGING_TYPES.map((pkg) => (
                        <SelectItem key={pkg.value} value={pkg.value}>
                          {pkg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_curve">Curva Base (BC)</Label>
                  <Input
                    id="base_curve"
                    type="number"
                    step="0.1"
                    min="7.0"
                    max="10.0"
                    value={formData.base_curve}
                    onChange={(e) =>
                      setFormData({ ...formData, base_curve: e.target.value })
                    }
                    placeholder="Ej: 8.4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diameter">Diámetro (DIA)</Label>
                  <Input
                    id="diameter"
                    type="number"
                    step="0.1"
                    min="13.0"
                    max="15.0"
                    value={formData.diameter}
                    onChange={(e) =>
                      setFormData({ ...formData, diameter: e.target.value })
                    }
                    placeholder="Ej: 14.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
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
                {editingFamily ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
