"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OptionValue {
  id: string;
  field_id: string;
  value: string;
  label: string;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingValue: OptionValue | null;
  newValue: { value: string; label: string; is_default: boolean };
  onNewValueChange: (v: { value: string; label: string; is_default: boolean }) => void;
  onSave: () => void;
}

export function EditOptionValueDialog({
  open, onOpenChange, editingValue, newValue, onNewValueChange, onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Opción</DialogTitle>
          <DialogDescription>
            Edita la opción: {editingValue?.label}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit_value">Valor</Label>
            <p className="text-xs text-gray-500 mb-1">Código interno utilizado por el sistema</p>
            <Input disabled className="bg-gray-100" id="edit_value" value={newValue.value} />
            <p className="text-xs text-gray-500 mt-1">El valor no se puede modificar</p>
          </div>
          <div>
            <Label htmlFor="edit_label">Etiqueta (mostrar)</Label>
            <Input id="edit_label" placeholder="Ej: Nuevo Tipo"
              value={newValue.label}
              onChange={(e) => onNewValueChange({ ...newValue, label: e.target.value })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              checked={newValue.is_default}
              className="rounded" id="edit_is_default" type="checkbox"
              onChange={(e) => onNewValueChange({ ...newValue, is_default: e.target.checked })}
            />
            <Label htmlFor="edit_is_default">Marcar como opción por defecto</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
