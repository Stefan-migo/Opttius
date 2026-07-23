"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; email: string; fullName?: string } | null;
  onUserDeleted: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onUserDeleted,
}: DeleteUserDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/users/${user.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.details || "Error al eliminar usuario",
        );
      }

      toast.success("Usuario eliminado correctamente");
      onOpenChange(false);
      onUserDeleted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al eliminar usuario",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Confirmar Eliminación de Usuario
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-4 mt-4">
              <p className="font-semibold text-lg">
                ¿Estás seguro de que deseas eliminar al usuario{" "}
                <span className="text-red-600">
                  &quot;{user?.fullName || user?.email}&quot;
                </span>{" "}
                ({user?.email})?
              </p>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                      Esta acción es IRREVERSIBLE
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                      Se eliminará permanentemente el usuario, su perfil y
                      acceso al sistema.
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      Si el usuario tiene una organización asignada, la
                      organización permanecerá (sin owner). La organización se
                      elimina desde la sección Organizaciones.
                    </p>
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
          <Button
            disabled={deleting}
            variant="destructive"
            onClick={handleDelete}
          >
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
