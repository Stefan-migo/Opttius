"use client";

import { CheckCircle, Package, Tag } from "lucide-react";

import type { Category } from "@/app/admin/products/hooks/useCategories";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: Category | null;
  formData: { name: string; slug: string; description: string };
  loading: boolean;
  onFormChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CategoryDialog({ open, onOpenChange, editingCategory, formData, loading, onFormChange, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[450px] p-0 rounded-xl border-2 border-admin-border-primary/20 bg-white">
        <DialogHeader className="p-8 pb-4 bg-admin-bg-tertiary/50 border-b border-admin-border-primary/10">
          <DialogTitle className="text-xl font-display font-bold text-admin-text-primary uppercase tracking-[0.2em]">
            {editingCategory ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-1">
            Complete los datos de la categoría
          </DialogDescription>
        </DialogHeader>
        <form className="p-8 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest" htmlFor="category-name">
                Nombre *
              </Label>
              <Input required className="rounded-xl border-admin-border-primary/20 focus:border-epoch-primary focus:ring-0 p-6 text-sm font-display"
                id="category-name" placeholder="Ej: Marcos"
                value={formData.name}
                onChange={(e) => onFormChange("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest" htmlFor="category-slug">
                Slug
              </Label>
              <div className="relative">
                <Input className="rounded-xl border-admin-border-primary/20 bg-admin-bg-tertiary/30 focus:border-epoch-primary focus:ring-0 p-6 pl-10 text-xs font-mono lowercase"
                  id="category-slug" placeholder="marcos"
                  value={formData.slug}
                  onChange={(e) => onFormChange("slug", e.target.value)}
                />
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-text-tertiary opacity-30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-widest" htmlFor="category-description">
                Descripción
              </Label>
              <Textarea className="rounded-xl border-admin-border-primary/20 focus:border-epoch-primary focus:ring-0 p-4 text-xs font-serif italic resize-none"
                id="category-description" placeholder="Descripción opcional..." rows={3}
                value={formData.description}
                onChange={(e) => onFormChange("description", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-admin-border-primary/10">
            <Button className="rounded-xl text-[10px] font-display font-bold tracking-widest uppercase hover:bg-admin-bg-tertiary"
              disabled={loading} type="button" variant="ghost"
              onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="bg-epoch-primary hover:bg-epoch-primary/90 text-white rounded-xl text-[10px] font-display font-bold tracking-widest uppercase px-8 border-none shadow-premium-sm"
              disabled={loading} type="submit">
              {loading ? <Package className="h-3 w-3 mr-2 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-2" />}
              {editingCategory ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
