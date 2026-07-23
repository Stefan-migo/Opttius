"use client";

import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productToDelete: { id: string; name: string } | null;
  deleteLoading: boolean;
  onConfirm: () => void;
}

export function ProductDeleteDialog({ open, onOpenChange, productToDelete, deleteLoading, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md border-2 border-admin-error/20 bg-white shadow-premium-xl rounded-xl p-0 overflow-hidden">
        <div className="bg-admin-error/5 p-8 border-b border-admin-error/10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-admin-error/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-admin-error" />
              </div>
              <DialogTitle className="text-2xl font-display font-bold text-admin-error tracking-tight uppercase">
                ELIMINAR PRODUCTO
              </DialogTitle>
            </div>
            <DialogDescription className="text-[11px] font-serif italic text-admin-text-tertiary tracking-wide pl-15 mt-1">
              ADVERTENCIA: Esta operación de purga en el archivo técnico es irreversible.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-8">
          <p className="text-sm text-admin-text-secondary leading-relaxed mb-8">
            ¿Confirmar la eliminación permanente de{" "}
            <span className="font-display font-bold text-admin-text-primary px-1 border-b border-admin-text-primary/20">
              &quot;{productToDelete?.name}&quot;
            </span>
            ? Los registros históricos y dependencias asociadas serán removidos del sistema.
          </p>
          <DialogFooter className="flex items-center justify-end gap-3 pt-4">
            <Button className="h-10 px-6 font-display font-bold text-[10px] tracking-widest uppercase rounded-xl border-admin-border-primary/20"
              disabled={deleteLoading} variant="outline"
              onClick={() => { onOpenChange(false); }}>
              CANCELAR
            </Button>
            <Button className="h-10 px-8 font-display font-bold text-[10px] tracking-widest uppercase rounded-xl bg-admin-error hover:bg-admin-error/90"
              disabled={deleteLoading} variant="destructive" onClick={onConfirm}>
              {deleteLoading ? (
                <><RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" /> PURGANDO...</>
              ) : (
                <><Trash2 className="h-3.5 w-3.5 mr-2" /> ELIMINAR REGISTRO</>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
