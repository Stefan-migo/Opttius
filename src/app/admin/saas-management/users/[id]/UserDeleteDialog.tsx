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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  fullName: string;
  email: string;
  onDelete: () => void;
}

export function UserDeleteDialog({
  open,
  onOpenChange,
  deleting,
  fullName,
  email,
  onDelete,
}: Props) {
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
                <span className="text-red-600">&quot;{fullName}&quot;</span> (
                {email})?
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
                      organización permanecerá (sin owner).
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
