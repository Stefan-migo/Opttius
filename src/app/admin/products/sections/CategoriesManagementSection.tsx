"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCategories } from "../hooks/useCategories";
import { Package, Tag, Plus, Edit, Trash2, AlertTriangle, X, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CategoriesManagementSection() {
  const { categories, isLoading: categoriesLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  
  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);

  // Category management functions
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

      if (editingCategory) {
        await updateCategory({
          id: editingCategory.id,
          data: categoryFormData,
        });
      } else {
        await createCategory(categoryFormData);
      }

      setCategoryDialogOpen(false);
      setCategoryFormData({ name: "", slug: "", description: "" });
    } catch (error) {
      console.error("Error saving category:", error);
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
      await deleteCategory(category.id);
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  return (
    <>
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
          {categoriesLoading ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-tierra-media mx-auto mb-4 animate-pulse" />
              <p className="text-tierra-media">Cargando categorías...</p>
            </div>
          ) : categories.length === 0 ? (
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
    </>
  );
}