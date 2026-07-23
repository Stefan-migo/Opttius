"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditOptionValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  label: string;
  isDefault: boolean;
  editingLabel: string | undefined;
  onLabelChange: (label: string) => void;
  onDefaultChange: (isDefault: boolean) => void;
  onSave: () => void;
}

export function EditOptionValueDialog({
  open, onOpenChange, value, label, isDefault, editingLabel,
  onLabelChange, onDefaultChange, onSave,
}: EditOptionValueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border-admin-border-primary/20 bg-admin-bg-primary">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-admin-text-primary uppercase tracking-tight">Editar Opción</DialogTitle>
          <DialogDescription className="text-[11px] font-serif italic text-admin-text-tertiary">Edita la opción: {editingLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2" htmlFor="edit_value">Valor</Label>
            <Input disabled className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm text-admin-text-tertiary" id="edit_value" value={value} />
            <p className="text-[11px] font-serif italic text-admin-text-tertiary mt-1">El valor no se puede modificar</p>
          </div>
          <div>
            <Label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest block mb-2" htmlFor="edit_label">Etiqueta (mostrar)</Label>
            <Input className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-xl font-display text-sm"
              id="edit_label" placeholder="Ej: Nuevo Tipo"
              value={label} onChange={(e) => onLabelChange(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <input checked={isDefault} className="rounded border-admin-border-primary text-admin-accent-primary focus:ring-admin-accent-primary"
              id="edit_is_default" type="checkbox" onChange={(e) => onDefaultChange(e.target.checked)} />
            <Label className="text-[11px] font-serif italic text-admin-text-secondary" htmlFor="edit_is_default">Marcar como opción por defecto</Label>
          </div>
        </div>
        <DialogFooter>
          <Button className="rounded-xl border-admin-border-primary/20 font-display font-bold text-[10px] tracking-widest uppercase" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-xl bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-bold text-[10px] tracking-widest uppercase" onClick={onSave}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
