"use client";

import { RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  onConfirm: () => void;
}

export function DeleteQuoteDialog({ open, onOpenChange, deleting, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar presupuesto?</DialogTitle>
          <DialogDescription>Esta acción no se puede deshacer. El presupuesto será eliminado permanentemente.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={deleting} variant="outline" onClick={() => { onOpenChange(false); }}>Cancelar</Button>
          <Button disabled={deleting} variant="destructive" onClick={onConfirm}>
            {deleting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Eliminando...</> : <><Trash2 className="h-4 w-4 mr-2" /> Eliminar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
