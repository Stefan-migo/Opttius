"use client";

import { Glasses, Layers, Plus, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { appLogger } from '@/lib/logger';

import type { Category } from "../hooks/useCategories";
import { useCategories } from "../hooks/useCategories";
import { CategorySection } from "./_components/_components/CategoryCard";
import { CategoryDialog } from "./_components/_components/CategoryDialog";

const SORT_ORDER_THRESHOLD = 10;

function groupCategories(categories: Category[]) {
  return {
    principales: categories.filter((c) => c.sort_order == null || c.sort_order < SORT_ORDER_THRESHOLD),
    especializadas: categories.filter((c) => c.sort_order != null && c.sort_order >= SORT_ORDER_THRESHOLD),
  };
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
      appLogger.error("Error saving category:", error);
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
      appLogger.error("Error deleting category:", error);
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
                <Skeleton className="h-24 rounded-xl" key={i} />
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="h-5 w-48 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton className="h-24 rounded-xl" key={i} />
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
            className="bg-epoch-primary hover:bg-epoch-primary/90 text-white rounded-xl text-[10px] font-display font-bold tracking-widest uppercase px-8 py-4 h-auto"
            onClick={openCreateCategoryDialog}
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
              className="bg-epoch-primary hover:bg-epoch-primary/90 text-white rounded-xl text-[9px] sm:text-[10px] font-display font-bold tracking-widest uppercase px-4 sm:px-6 py-3 sm:py-4 h-auto border-none shadow-premium-sm shrink-0"
              onClick={openCreateCategoryDialog}
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nueva categoría</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 md:p-8 space-y-10 sm:space-y-12">
          <CategorySection
            categories={principales}
            icon={Layers}
            subtitle="Productos generales: marcos, lentes de sol, accesorios y servicios"
            title="Categorías principales"
            onDelete={handleDeleteCategory}
            onEdit={openEditCategoryDialog}
          />
          <CategorySection
            categories={especializadas}
            icon={Glasses}
            subtitle="Tipos de productos ópticos: lectura, ocupacional, deportivo, lentes de contacto"
            title="Categorías especializadas de lentes"
            onDelete={handleDeleteCategory}
            onEdit={openEditCategoryDialog}
          />
        </CardContent>
      </Card>

      <CategoryDialog
        editingCategory={editingCategory}
        formData={categoryFormData}
        loading={categoryFormLoading}
        open={categoryDialogOpen}
        onFormChange={handleCategoryInputChange}
        onOpenChange={setCategoryDialogOpen}
        onSubmit={handleCategorySubmit}
      />
    </>
  );
}
