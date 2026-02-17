"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCategories } from "../hooks/useCategories";
import {
  Package,
  Tag,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesManagementSection() {
  const {
    categories,
    isLoading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

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
      <Card className="border border-admin-border-primary/20 bg-white rounded-none shadow-none overflow-hidden mb-8">
        <CardHeader className="bg-admin-bg-tertiary/50 border-b border-admin-border-primary/10 py-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-[0.2em] flex items-center">
                Gestión de Clasificaciones
              </h3>
              <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
                Catálogo de Categorías y Estructura Comercial
              </p>
            </div>
            <Button
              onClick={openCreateCategoryDialog}
              className="bg-epoch-primary hover:bg-epoch-primary/90 text-white rounded-none text-[10px] font-display font-bold tracking-widest uppercase px-6 py-4 h-auto border-none shadow-premium-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              NUEVO REGISTRO
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {categoriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {[...Array(6)].map((_, i) => (
                <Card
                  key={i}
                  className="bg-white border border-admin-border-primary/10 rounded-none shadow-none"
                >
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-24 opacity-40" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full opacity-30" />
                      <Skeleton className="h-3 w-[80%] opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-admin-border-primary/10 bg-admin-bg-tertiary/30">
              <Tag className="h-16 w-16 text-admin-text-tertiary mx-auto mb-6 opacity-20" />
              <h3 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-widest">
                Catálogo Vacío
              </h3>
              <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-wider mt-2 mb-8">
                No se han definido categorías técnicas para la organización del
                inventario
              </p>
              <Button
                onClick={openCreateCategoryDialog}
                variant="outline"
                className="rounded-none border-admin-border-primary/30 text-[10px] font-display font-bold tracking-widest uppercase px-8 py-4 h-auto hover:bg-admin-bg-tertiary"
              >
                <Plus className="h-4 w-4 mr-2 text-epoch-primary" />
                DEFINIR PRIMER REGISTRO
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="bg-white border border-admin-border-primary/10 rounded-none shadow-none group hover:border-epoch-primary/30 transition-all duration-300"
                >
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <h4 className="text-base font-display font-bold text-admin-text-primary uppercase tracking-tight group-hover:text-epoch-primary transition-colors">
                          {category.name}
                        </h4>
                        <p className="text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] bg-admin-bg-tertiary px-2 py-0.5 inline-block border border-admin-border-primary/5">
                          ID: {category.slug}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-none hover:bg-admin-bg-tertiary text-epoch-primary"
                          onClick={() => openEditCategoryDialog(category)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-none hover:bg-admin-error/5 text-admin-error"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    {category.description ? (
                      <p className="text-[11px] font-serif italic text-admin-text-secondary line-clamp-2 leading-relaxed">
                        "{category.description}"
                      </p>
                    ) : (
                      <p className="text-[10px] font-serif italic text-admin-text-tertiary">
                        Sin descripción técnica adicional
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
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 rounded-none border-2 border-admin-border-primary/20 bg-white">
          <DialogHeader className="p-8 pb-4 bg-admin-bg-tertiary/50 border-b border-admin-border-primary/10">
            <DialogTitle className="text-xl font-display font-bold text-admin-text-primary uppercase tracking-[0.2em]">
              {editingCategory ? "EDITAR REGISTRO" : "NUEVA CLASIFICACIÓN"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-1">
              Complete los parámetros técnicos del catálogo
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCategorySubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="category-name"
                  className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest"
                >
                  Nombre de Categoría *
                </Label>
                <Input
                  id="category-name"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    handleCategoryInputChange("name", e.target.value)
                  }
                  placeholder="Ej: HIGH-END EYEWEAR"
                  required
                  className="rounded-none border-admin-border-primary/20 focus:border-epoch-primary focus:ring-0 p-6 text-sm font-display"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="category-slug"
                  className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest"
                >
                  Slug (ID de Sistema)
                </Label>
                <div className="relative">
                  <Input
                    id="category-slug"
                    value={categoryFormData.slug}
                    onChange={(e) =>
                      handleCategoryInputChange("slug", e.target.value)
                    }
                    placeholder="lentes-de-lujo"
                    className="rounded-none border-admin-border-primary/20 bg-admin-bg-tertiary/30 focus:border-epoch-primary focus:ring-0 p-6 pl-10 text-xs font-mono lowercase"
                  />
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-text-tertiary opacity-30" />
                </div>
                <p className="text-[9px] font-serif italic text-admin-text-tertiary mt-1">
                  Identificador alfanumérico generado para protocolos de red
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="category-description"
                  className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest text-right block"
                >
                  Resumen Descriptivo
                </Label>
                <Textarea
                  id="category-description"
                  value={categoryFormData.description}
                  onChange={(e) =>
                    handleCategoryInputChange("description", e.target.value)
                  }
                  placeholder="Escriba una breve descripción técnica o comercial..."
                  rows={4}
                  className="rounded-none border-admin-border-primary/20 focus:border-epoch-primary focus:ring-0 p-4 text-xs font-serif italic resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-admin-border-primary/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCategoryDialogOpen(false)}
                disabled={categoryFormLoading}
                className="rounded-none text-[10px] font-display font-bold tracking-widest uppercase hover:bg-admin-bg-tertiary"
              >
                DESCARTAR
              </Button>
              <Button
                type="submit"
                disabled={categoryFormLoading}
                className="bg-epoch-primary hover:bg-epoch-primary/90 text-white rounded-none text-[10px] font-display font-bold tracking-widest uppercase px-8 border-none shadow-premium-sm"
              >
                {categoryFormLoading ? (
                  <Package className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-2" />
                )}
                {editingCategory ? "ACTUALIZAR" : "CREAR REGISTRO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
