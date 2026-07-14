"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BranchDeleteDialogProps {
  open: boolean;
  branchName: string;
  branchCode: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void>;
}

export function BranchDeleteDialog({
  open,
  branchName,
  branchCode,
  isSubmitting,
  onOpenChange,
  onDelete,
}: BranchDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-epoch-primary">
            ¿Eliminar sucursal?
          </DialogTitle>
          <DialogDescription className="text-epoch-primary/80">
            Esta acción no se puede deshacer. Se eliminará la sucursal{" "}
            <strong>{branchName}</strong> y todos sus datos
            asociados.
            {branchCode === "MAIN" && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <strong>Advertencia:</strong> No se puede eliminar la sucursal
                principal.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            className="rounded-xl border-epoch-primary/20 w-full sm:w-auto min-h-[44px]"
            disabled={isSubmitting}
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl w-full sm:w-auto min-h-[44px]"
            disabled={isSubmitting || branchCode === "MAIN"}
            variant="destructive"
            onClick={onDelete}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
