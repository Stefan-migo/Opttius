"use client";

import { AlertTriangle, Edit, Plus, Save, Tag, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { extractDataFromResponse } from "@/lib/api/response-helpers";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export default function CategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      setCategories(extractDataFromResponse<Category>(data));
      setError(null);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate slug when name changes
    if (field === "name") {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: generateSlug(value),
      }));
    }
  };

  const openCreateDialog = () => {
    setIsEditing(false);
    setEditingCategory(null);
    setFormData({ name: "", slug: "", description: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setIsEditing(true);
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    try {
      setFormLoading(true);

      const url = isEditing
        ? `/api/categories/${editingCategory?.id}`
        : "/api/categories";

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save category");
      }

      const result = await response.json();

      if (isEditing) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === editingCategory?.id ? result.category : cat,
          ),
        );
        toast.success("Categoría actualizada exitosamente");
      } else {
        setCategories((prev) => [...prev, result.category]);
        toast.success("Categoría creada exitosamente");
      }

      setIsDialogOpen(false);
      setFormData({ name: "", slug: "", description: "" });
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al guardar la categoría",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteDialog = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    // Double check - prevent deletion of default categories
    if (categoryToDelete.is_default === true) {
      toast.error("No se puede eliminar una categoría por defecto del sistema");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      return;
    }

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete category");
      }

      setCategories((prev) =>
        prev.filter((cat) => cat.id !== categoryToDelete.id),
      );

      toast.success("Categoría eliminada exitosamente");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al eliminar la categoría",
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div className="animate-pulse" key={i}>
              <div className="bg-gray-200 h-32 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo">
            Gestión de Categorías
          </h1>
          <p className="text-tierra-media">
            Administra las categorías de productos
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Error al cargar categorías
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchCategories}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo">
            Gestión de Categorías
          </h1>
          <p className="text-tierra-media">
            Administra las categorías de productos
          </p>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card
            className="transition-all duration-200 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            key={category.id}
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
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={category.is_default === true}
                    size="sm"
                    title={
                      category.is_default === true
                        ? "Esta categoría por defecto no puede eliminarse"
                        : "Eliminar categoría"
                    }
                    variant="outline"
                    onClick={() => openDeleteDialog(category)}
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
                {new Date(category.created_at).toLocaleDateString("es-ES")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Tag className="h-16 w-16 text-tierra-media mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-azul-profundo mb-2">
              No hay categorías
            </h3>
            <p className="text-tierra-media mb-6">
              Aún no hay categorías para mostrar
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Categoría
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modifica los datos de la categoría"
                : "Crea una nueva categoría para organizar tus productos"}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                required
                id="name"
                placeholder="Ej: Cuidado Facial"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="cuidado-facial"
                value={formData.slug}
                onChange={(e) => handleInputChange("slug", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                URL amigable (se genera automáticamente)
              </p>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción opcional de la categoría"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
              />
            </div>

            <DialogFooter>
              <Button
                disabled={formLoading}
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button disabled={formLoading} type="submit">
                <Save className="h-4 w-4 mr-2" />
                {formLoading
                  ? "Guardando..."
                  : isEditing
                    ? "Actualizar"
                    : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              {categoryToDelete?.is_default === true ? (
                <>
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">
                      Categoría por defecto protegida
                    </span>
                  </div>
                  <p>
                    La categoría &quot;{categoryToDelete?.name}&quot; es una
                    categoría por defecto del sistema y no puede eliminarse. Las
                    categorías por defecto son necesarias para el funcionamiento
                    correcto del sistema.
                  </p>
                </>
              ) : (
                <>
                  ¿Estás seguro de que deseas eliminar la categoría &quot;
                  {categoryToDelete?.name}&quot;?
                  <br />
                  Esta acción no se puede deshacer y puede afectar los productos
                  asociados.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setCategoryToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={categoryToDelete?.is_default === true}
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
