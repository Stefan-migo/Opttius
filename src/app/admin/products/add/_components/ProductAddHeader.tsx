"use client";

import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductAddHeaderProps {
  hasChanges: boolean;
  saving: boolean;
  onSave: (e?: React.FormEvent, status?: string) => Promise<void>;
}

export function ProductAddHeader({
  hasChanges,
  saving,
  onSave,
}: ProductAddHeaderProps) {
  const router = useRouter();
  const [showPublishAlert, setShowPublishAlert] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-admin-text-primary">
            Agregar Producto
          </h1>
          {hasChanges && (
            <span className="px-2 py-1 text-[10px] sm:text-xs bg-amber-100 text-amber-800 rounded-full border border-amber-200">
              Cambios sin guardar
            </span>
          )}
        </div>
        <Button
          className="h-10 w-10 sm:h-auto sm:w-auto sm:px-4 shrink-0"
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Volver</span>
        </Button>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4">
        <Button
          className="w-full sm:w-auto"
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button
          className="flex items-center justify-center gap-2 w-full sm:w-auto"
          disabled={saving}
          type="button"
          variant="secondary"
          onClick={() => onSave(undefined, "draft")}
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Borrador"}
        </Button>
        <Button
          className="flex items-center justify-center gap-2 w-full sm:w-auto"
          disabled={saving}
          type="button"
          onClick={() => setShowPublishAlert(true)}
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar Producto"}
        </Button>
      </div>

      <Dialog open={showPublishAlert} onOpenChange={setShowPublishAlert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Confirmar Publicación
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-3">
                <p>
                  <strong>
                    ¿Estás seguro de que deseas publicar este producto?
                  </strong>
                </p>
                <p>
                  Al hacer clic en &quot;Publicar&quot;, el producto será
                  publicado inmediatamente y estará visible para los clientes.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 font-medium">
                    ⚠️ Recomendación de Seguridad:
                  </p>
                  <p className="text-amber-700 text-sm mt-1">
                    Te recomendamos guardar primero como &quot;Borrador&quot;
                    para revisar todos los detalles, especialmente los precios,
                    antes de publicar el producto.
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  ¿Has verificado que todos los precios y detalles son
                  correctos?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={saving}
              variant="outline"
              onClick={() => setShowPublishAlert(false)}
            >
              Cancelar
            </Button>
            <Button
              className="text-white"
              disabled={saving}
              style={{ backgroundColor: "var(--admin-accent-tertiary)" }}
              variant="secondary"
              onClick={() => onSave(undefined, "draft")}
            >
              Guardar como Borrador
            </Button>
            <Button
              disabled={saving}
              onClick={() => {
                setShowPublishAlert(false);
                onSave(undefined, "active");
              }}
            >
              {saving ? "Publicando..." : "Sí, Publicar Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
