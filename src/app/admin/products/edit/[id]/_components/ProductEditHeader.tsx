"use client";

import { ArrowLeft, Package, Save } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface ProductEditHeaderProps {
  name: string;
  hasChanges: boolean;
  saving: boolean;
  onSave: (e?: React.FormEvent, status?: string) => Promise<void>;
}

export function ProductEditHeader({
  name,
  hasChanges,
  saving,
  onSave,
}: ProductEditHeaderProps) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 mb-6">
        <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="h-5 w-5 shrink-0 text-epoch-primary" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-epoch-primary truncate sm:text-2xl">
                Editar Producto
              </h1>
              {name && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {name}
                </p>
              )}
            </div>
          </div>
          {hasChanges && (
            <span className="inline-flex w-fit px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">
              Cambios sin guardar
            </span>
          )}
        </div>
        <Link className="w-full sm:w-auto" href="/admin/products">
          <Button
            className="w-full sm:w-auto min-h-[44px] px-4 sm:px-6 font-medium shrink-0"
            size="default"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
            Volver a Productos
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 min-w-0">
        <Link className="w-full sm:w-auto sm:order-1" href="/admin/products">
          <Button
            className="w-full sm:w-auto min-h-[44px]"
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
        </Link>
        <Button
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 text-white sm:order-2"
          disabled={saving}
          style={{ backgroundColor: "var(--admin-accent-tertiary)" }}
          type="button"
          variant="secondary"
          onClick={() => onSave(undefined, "draft")}
        >
          <Save className="h-4 w-4 shrink-0" />
          {saving ? "Guardando..." : "Guardar como Borrador"}
        </Button>
        <Button
          className="w-full sm:flex-1 min-h-[44px] flex items-center justify-center gap-2 sm:order-3 sm:min-w-[140px]"
          disabled={saving}
          type="submit"
        >
          <Save className="h-4 w-4 shrink-0" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </>
  );
}
