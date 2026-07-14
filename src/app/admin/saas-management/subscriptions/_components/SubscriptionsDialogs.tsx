"use client";

import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubscriptionsDialogsProps {
  // Cancel
  cancelConfirmId: string | null;
  // Delete
  deleteConfirmId: string | null;
  deleteId: string | null;
  deleteLoading: boolean;

  onCancelConfirmIdChange: (id: string | null) => void;
  onCancel: (id: string) => Promise<void>;
  onDeleteConfirmIdChange: (id: string | null) => void;
  onDelete: (id: string) => Promise<void>;
}

export function SubscriptionsDialogs({
  cancelConfirmId,
  deleteConfirmId,
  deleteId,
  deleteLoading,
  onCancelConfirmIdChange,
  onCancel,
  onDeleteConfirmIdChange,
  onDelete,
}: SubscriptionsDialogsProps) {
  return (
    <>
      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelConfirmId !== null}
        onOpenChange={(open) => !open && onCancelConfirmIdChange(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-red-100 dark:bg-red-500/20 p-4 rounded-3xl w-fit mb-4">
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
            </div>
            <DialogTitle>¿Cancelar suscripción?</DialogTitle>
            <DialogDescription>
              La organización mantendrá el acceso hasta el final del periodo
              actual. Después la suscripción quedará cancelada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onCancelConfirmIdChange(null)}>
              Volver
            </Button>
            <Button
              disabled={!cancelConfirmId}
              variant="destructive"
              onClick={() =>
                cancelConfirmId && onCancel(cancelConfirmId)
              }
            >
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && onDeleteConfirmIdChange(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-red-100 dark:bg-red-500/20 p-4 rounded-3xl w-fit mb-4">
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
            </div>
            <DialogTitle>¿Eliminar esta suscripción?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará el registro de
              suscripción.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onDeleteConfirmIdChange(null)}>
              Volver
            </Button>
            <Button
              disabled={!deleteConfirmId || deleteLoading}
              variant="destructive"
              onClick={() => deleteConfirmId && onDelete(deleteConfirmId)}
            >
              {deleteLoading && deleteId === deleteConfirmId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
