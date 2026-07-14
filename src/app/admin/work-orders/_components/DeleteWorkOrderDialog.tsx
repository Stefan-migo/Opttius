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

interface DeleteWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  onDeleteConfirm: () => void;
  onCancel: () => void;
}

export function DeleteWorkOrderDialog({
  open,
  onOpenChange,
  deleting,
  onDeleteConfirm,
  onCancel,
}: DeleteWorkOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar trabajo?</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. El trabajo será eliminado
            permanentemente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleting}
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            disabled={deleting}
            variant="destructive"
            onClick={onDeleteConfirm}
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
