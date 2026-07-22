"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData: {
    name: string;
    slug: string;
    subscription_tier: string;
    status: string;
  };
  onEditDataChange: (data: EditDialogProps["editData"]) => void;
  saving: boolean;
  onSave: () => void;
}

export function OrgEditDialog({
  open,
  onOpenChange,
  editData,
  onEditDataChange,
  saving,
  onSave,
}: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Organización</DialogTitle>
          <DialogDescription>
            Modifica los datos de la organización
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-md"
              type="text"
              value={editData.name}
              onChange={(e) =>
                onEditDataChange({ ...editData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-md"
              type="text"
              value={editData.slug}
              onChange={(e) =>
                onEditDataChange({
                  ...editData,
                  slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tier</label>
            <Select
              value={editData.subscription_tier}
              onValueChange={(v) =>
                onEditDataChange({ ...editData, subscription_tier: v })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={editData.status}
              onValueChange={(v) =>
                onEditDataChange({ ...editData, status: v })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="suspended">Suspendida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={saving} onClick={onSave}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  orgName: string;
  stats: {
    totalUsers: number;
    activeUsers: number;
    branches: number;
    orders: number;
    products: number;
  };
  onDelete: () => void;
}

export function OrgDeleteDialog({
  open,
  onOpenChange,
  deleting,
  orgName,
  stats,
  onDelete,
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Confirmar Eliminación de Organización
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-4 mt-4">
              <p className="font-semibold text-lg">
                ¿Estás seguro de que deseas eliminar la organización{" "}
                <span className="text-red-600">&quot;{orgName}&quot;</span>?
              </p>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                      ⚠️ Esta acción es IRREVERSIBLE
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                      Se eliminará <strong>PERMANENTEMENTE</strong>:
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
                      <li>La organización y todos sus datos</li>
                      <li>Todas las sucursales ({stats.branches || 0})</li>
                      <li>
                        Todos los usuarios asociados ({stats.activeUsers || 0})
                      </li>
                      <li>Todas las suscripciones</li>
                      <li>Todos los productos ({stats.products || 0})</li>
                      <li>Todos los clientes</li>
                      <li>Todas las órdenes ({stats.orders || 0})</li>
                      <li>
                        Todos los presupuestos, trabajos de laboratorio, pagos
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleting}
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button disabled={deleting} variant="destructive" onClick={onDelete}>
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Sí, Eliminar Permanentemente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
