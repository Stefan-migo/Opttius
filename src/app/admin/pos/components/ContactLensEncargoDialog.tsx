"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContactLensFamily } from "@/lib/api/services/contactLensFamilyService";

interface Props {
  open: boolean;
  family: ContactLensFamily | null;
  quantity: number;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string) => void;
}

export function ContactLensEncargoDialog({
  open,
  family,
  quantity,
  submitting,
  onOpenChange,
  onConfirm,
}: Props) {
  const [encargoNotes, setEncargoNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Encargo</DialogTitle>
          <DialogDescription>
            Crear orden de compra para este producto
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="font-medium">{family?.name}</div>
            <div className="text-sm text-muted-foreground">
              {family?.brand}
            </div>
            <div className="text-sm mt-1">Cantidad: {quantity} caja(s)</div>
          </div>
          <div>
            <Label>Notas adicionales</Label>
            <Input
              value={encargoNotes}
              onChange={(e) => setEncargoNotes(e.target.value)}
              placeholder="Instrucciones..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(encargoNotes)}
            disabled={submitting}
          >
            {submitting ? "Enviando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
