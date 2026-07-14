"use client";

import { RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WorkOrderDeleteDialogProps {
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  handleDelete: () => void;
  deleting: boolean;
  workOrder: { quote?: unknown } | null;
}

export function WorkOrderDeleteDialog({
  deleteDialogOpen,
  setDeleteDialogOpen,
  handleDelete,
  deleting,
  workOrder,
}: WorkOrderDeleteDialogProps) {
  return (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar trabajo?</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. El trabajo será eliminado
            permanentemente de la base de datos.
            {workOrder?.quote ? (
              <span className="block mt-2 text-orange-600 font-medium">
                ⚠️ El presupuesto relacionado también será eliminado.
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleting}
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
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
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
