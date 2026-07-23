"use client";

import { Edit, Trash2 } from "lucide-react";

import type { Category } from "@/app/admin/products/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CategoryCard({
  category, onEdit, onDelete,
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
                <span className="text-[9px] font-mono text-admin-text-tertiary shrink-0">#{category.sort_order}</span>
              )}
            </div>
            <p className="text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] bg-admin-border-primary/5 px-2 py-0.5 inline-block border border-admin-border-primary/10 rounded">
              {category.slug}
            </p>
          </div>
          <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
            <Button className="h-8 w-8 p-0 rounded-lg hover:bg-admin-accent-primary/10 text-epoch-primary" size="sm" variant="ghost" onClick={() => onEdit(category)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button className="h-8 w-8 p-0 rounded-lg hover:bg-admin-error/10 text-admin-error" size="sm" variant="ghost" onClick={() => onDelete(category)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0">
        {category.description ? (
          <p className="text-[11px] font-serif italic text-admin-text-secondary line-clamp-2 leading-relaxed">{category.description}</p>
        ) : (
          <p className="text-[10px] font-serif italic text-admin-text-tertiary">Sin descripción</p>
        )}
      </CardContent>
    </Card>
  );
}

export function CategorySection({
  title, subtitle, icon: Icon, categories, onEdit, onDelete,
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
          <h3 className="text-sm sm:text-base font-display font-bold text-admin-text-primary uppercase tracking-[0.1em]">{title}</h3>
          <p className="text-[10px] sm:text-xs font-serif italic text-admin-text-tertiary mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {categories.map((c) => (
          <CategoryCard category={c} key={c.id} onDelete={onDelete} onEdit={onEdit} />
        ))}
      </div>
    </section>
  );
}
