"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResetDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  resetting: boolean;
}

export function ResetDemoDialog({
  open,
  onOpenChange,
  onReset,
  resetting,
}: ResetDemoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetear Óptica Demo</DialogTitle>
          <DialogDescription>
            Esto borrará todos los datos de la Óptica Demo y los restaurará al
            estado inicial. Los clientes, productos, órdenes, citas y demás
            datos serán eliminados y reemplazados por datos de prueba.
            ¿Continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={resetting}
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button disabled={resetting} variant="destructive" onClick={onReset}>
            {resetting ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Reseteando...
              </>
            ) : (
              "Resetear Óptica Demo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
