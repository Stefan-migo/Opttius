"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCategories } from "../hooks/useCategories";
import type { Category } from "../hooks/useCategories";
import {
  Package,
  Tag,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Layers,
  Glasses,
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

const SORT_ORDER_THRESHOLD = 10;

function groupCategories(categories: Category[]) {
  const principales = categories.filter(
    (c) => c.sort_order == null || c.sort_order < SORT_ORDER_THRESHOLD,
  );
  const especializadas = categories.filter(
    (c) => c.sort_order != null && c.sort_order >= SORT_ORDER_THRESHOLD,
  );
  return { principales, especializadas };
}

function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  return (
    <Card className="bg-admin-bg-tertiary border border-admin-border-primary/10 rounded-xl shadow-none group hover:shadow-lg hover:border-admin-accent-primary/20 transition-all duration-300">
      <CardHeader className="p-4 sm:p-5 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-display font-bold text-admin-text-primary uppercase tracking-tight truncate">
                {category.name}
              </h4>
              {category.sort_order != null && (
                <span className="text-[9px] font-mono text-admin-text-tertiary shrink-0">
                  #{category.sort_order}
                </span>
              )}
            </div>
            <p className="text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] bg-admin-border-primary/5 px-2 py-0.5 inline-block border border-admin-border-primary/10 rounded">
              {category.slug}
            </p>
          </div>
          <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg hover:bg-admin-accent-primary/10 text-epoch-primary"
              onClick={() => onEdit(category)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg hover:bg-admin-error/10 text-admin-error"
              onClick={() => onDelete(category)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0">
        {category.description ? (
          <p className="text-[11px] font-serif italic text-admin-text-secondary line-clamp-2 leading-relaxed">
            {category.description}
          </p>
        ) : (
          <p className="text-[10px] font-serif italic text-admin-text-tertiary">
            Sin descripción
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CategorySection({
  title,
  subtitle,
  icon: Icon,
  categories,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  categories: Category[];
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-admin-accent-primary/10 text-admin-accent-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-display font-bold text-admin-text-primary uppercase tracking-[0.1em]">
            {title}
          </h3>
          <p className="text-[10px] sm:text-xs font-serif italic text-admin-text-tertiary mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

export default function CategoriesManagementSection() {
  const {
    categories,
    isLoading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);

  const { principales, especializadas } = useMemo(
    () => groupCategories(categories),
    [categories],
  );

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

  const openEditCategoryDialog = (category: Category) => {
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

  const handleDeleteCategory = async (category: Category) => {
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

  if (categoriesLoading) {
    return (
      <Card className="border border-admin-border-primary/20 bg-admin-bg-tertiary rounded-xl shadow-none overflow-hidden">
        <CardHeader className="p-6 border-b border-admin-border-primary/10">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div>
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="h-5 w-48 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="border border-admin-border-primary/20 bg-admin-bg-tertiary rounded-xl shadow-none overflow-hidden">
        <CardHeader className="p-6 border-b border-admin-border-primary/10">
          <h3 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-[0.15em]">
            Organización de Categorías
          </h3>
          <p className="text-[10px] font-serif italic text-admin-text-tertiary mt-1">
            Estructura tu catálogo en categorías principales y especializadas
          </p>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <Tag className="h-16 w-16 text-admin-text-tertiary mx-auto mb-6 opacity-20" />
          <h4 className="text-sm font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2">
            Sin categorías definidas
          </h4>
          <p className="text-[10px] font-serif italic text-admin-text-tertiary mb-8 max-w-sm mx-auto">
            Crea categorías principales (Marcos, Lentes de sol, Accesorios,
            Servicios) y especializadas (Monofocales, Progresivos, etc.) para
            organizar tu inventario.
          </p>
          <Button
            onClick={openCreateCategoryDialog}
            className="bg-epoch-primary hover:bg-epoch-primary/90 text-white rounded-xl text-[10px] font-display font-bold tracking-widest uppercase px-8 py-4 h-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear primera categoría
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-admin-border-primary/20 bg-admin-bg-tertiary rounded-xl shadow-none overflow-hidden">
        <CardHeader className="bg-admin-bg-tertiary/50 border-b border-admin-border-primary/10 py-4 sm:py-6 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs sm:text-sm font-display font-bold text-admin-text-primary uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                Organización de Categorías
              </h3>
              <p className="text-[9px] sm:text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
                Estructura visual: principales (productos) y especializadas
                (lentes)
              </p>
            </div>
            <Button
              onClick={openCreateCategoryDialog}
              className="bg-epoch-primary hover:bg-epoch-primary/90 text-white rounded-xl text-[9px] sm:text-[10px] font-display font-bold tracking-widest uppercase px-4 sm:px-6 py-3 sm:py-4 h-auto border-none shadow-premium-sm shrink-0"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nueva categoría</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 md:p-8 space-y-10 sm:space-y-12">
          <CategorySection
            title="Categorías principales"
            subtitle="Productos generales: marcos, lentes de sol, accesorios y servicios"
            icon={Layers}
            categories={principales}
            onEdit={openEditCategoryDialog}
            onDelete={handleDeleteCategory}
          />
          <CategorySection
            title="Categorías especializadas de lentes"
            subtitle="Tipos específicos de lentes ópticos: monofocales, progresivos, bifocales, etc."
            icon={Glasses}
            categories={especializadas}
            onEdit={openEditCategoryDialog}
            onDelete={handleDeleteCategory}
          />
        </CardContent>
      </Card>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[450px] p-0 rounded-xl border-2 border-admin-border-primary/20 bg-white">
          <DialogHeader className="p-8 pb-4 bg-admin-bg-tertiary/50 border-b border-admin-border-primary/10">
            <DialogTitle className="text-xl font-display font-bold text-admin-text-primary uppercase tracking-[0.2em]">
              {editingCategory ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-1">
              Complete los datos de la categoría
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCategorySubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="category-name"
                  className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest"
                >
                  Nombre *
                </Label>
                <Input
                  id="category-name"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    handleCategoryInputChange("name", e.target.value)
                  }
                  placeholder="Ej: Marcos"
                  required
                  className="rounded-xl border-admin-border-primary/20 focus:border-epoch-primary focus:ring-0 p-6 text-sm font-display"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="category-slug"
                  className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest"
                >
                  Slug
                </Label>
                <div className="relative">
                  <Input
                    id="category-slug"
                    value={categoryFormData.slug}
                    onChange={(e) =>
                      handleCategoryInputChange("slug", e.target.value)
                    }
                    placeholder="marcos"
                    className="rounded-xl border-admin-border-primary/20 bg-admin-bg-tertiary/30 focus:border-epoch-primary focus:ring-0 p-6 pl-10 text-xs font-mono lowercase"
                  />
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-text-tertiary opacity-30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="category-description"
                  className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest"
                >
                  Descripción
                </Label>
                <Textarea
                  id="category-description"
                  value={categoryFormData.description}
                  onChange={(e) =>
                    handleCategoryInputChange("description", e.target.value)
                  }
                  placeholder="Descripción opcional..."
                  rows={3}
                  className="rounded-xl border-admin-border-primary/20 focus:border-epoch-primary focus:ring-0 p-4 text-xs font-serif italic resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-admin-border-primary/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCategoryDialogOpen(false)}
                disabled={categoryFormLoading}
                className="rounded-xl text-[10px] font-display font-bold tracking-widest uppercase hover:bg-admin-bg-tertiary"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={categoryFormLoading}
                className="bg-epoch-primary hover:bg-epoch-primary/90 text-white rounded-xl text-[10px] font-display font-bold tracking-widest uppercase px-8 border-none shadow-premium-sm"
              >
                {categoryFormLoading ? (
                  <Package className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-2" />
                )}
                {editingCategory ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
