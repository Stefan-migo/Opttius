"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddOptionValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldLabel: string | undefined;
  value: string;
  label: string;
  isDefault: boolean;
  onValueChange: (value: string) => void;
  onLabelChange: (label: string) => void;
  onDefaultChange: (isDefault: boolean) => void;
  onSave: () => void;
}

export function AddOptionValueDialog({
  open, onOpenChange, fieldLabel, value, label, isDefault,
  onValueChange, onLabelChange, onDefaultChange, onSave,
}: AddOptionValueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border-admin-border-primary/20 bg-admin-bg-primary">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-admin-text-primary uppercase tracking-tight">
            Agregar Nueva Opción
          </DialogTitle>
          <DialogDescription className="text-[11px] font-serif italic text-admin-text-tertiary">
            Agrega una nueva opción para: {fieldLabel}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2" htmlFor="new_value">Valor</Label>
            <p className="text-[11px] font-serif italic text-admin-text-tertiary mb-1">Código interno utilizado por el sistema</p>
            <Input className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm"
              id="new_value" placeholder="Ej: nuevo_tipo"
              value={value} onChange={(e) => onValueChange(e.target.value.toLowerCase().replace(/\s+/g, "_"))} />
          </div>
          <div>
            <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2" htmlFor="new_label">Etiqueta (mostrar)</Label>
            <Input className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm"
              id="new_label" placeholder="Ej: Nuevo Tipo"
              value={label} onChange={(e) => onLabelChange(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <input checked={isDefault} className="rounded border-admin-border-primary text-admin-accent-primary focus:ring-admin-accent-primary"
              id="is_default" type="checkbox" onChange={(e) => onDefaultChange(e.target.checked)} />
            <Label className="text-[11px] font-serif italic text-admin-text-secondary" htmlFor="is_default">Marcar como opción por defecto</Label>
          </div>
        </div>
        <DialogFooter>
          <Button className="rounded-xl border-admin-border-primary/20 font-display font-bold text-[10px] tracking-widest uppercase" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-xl bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-bold text-[10px] tracking-widest uppercase" onClick={onSave}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
