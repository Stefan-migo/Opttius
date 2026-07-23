"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Family { id: string; name: string; brand?: string | null; }
interface FormData {
  contact_lens_family_id: string; sphere_min: string; sphere_max: string; cylinder_min: string; cylinder_max: string;
  axis_min: string; axis_max: string; addition_min: string; addition_max: string; base_price: string; cost: string; is_active: boolean;
}

interface ContactLensMatrixDialogProps {
  open: boolean;
  editingMatrix: unknown;
  families: Family[];
  formData: FormData;
  onOpenChange: (v: boolean) => void;
  onFormChange: (v: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ContactLensMatrixDialog({ open, editingMatrix, families, formData, onOpenChange, onFormChange, onSubmit }: ContactLensMatrixDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingMatrix ? "Editar Matriz" : "Crear Nueva Matriz"}</DialogTitle>
          <DialogDescription>{editingMatrix ? "Modifica los parámetros de la matriz seleccionada" : "Ingresa los detalles para crear una nueva matriz de precios"}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Familia de Lente *</Label>
              <Select value={formData.contact_lens_family_id} onValueChange={(v) => onFormChange({ ...formData, contact_lens_family_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar familia" /></SelectTrigger>
                <SelectContent>{families.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} {f.brand ? `(${f.brand})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Esfera Mínima *</Label><Input required step="0.25" type="number" value={formData.sphere_min} onChange={(e) => onFormChange({ ...formData, sphere_min: e.target.value })} /></div>
            <div><Label>Esfera Máxima *</Label><Input required step="0.25" type="number" value={formData.sphere_max} onChange={(e) => onFormChange({ ...formData, sphere_max: e.target.value })} /></div>
            <div><Label>Cilindro Mínimo</Label><Input step="0.25" type="number" value={formData.cylinder_min} onChange={(e) => onFormChange({ ...formData, cylinder_min: e.target.value })} /></div>
            <div><Label>Cilindro Máximo</Label><Input step="0.25" type="number" value={formData.cylinder_max} onChange={(e) => onFormChange({ ...formData, cylinder_max: e.target.value })} /></div>
            <div><Label>Precio Base *</Label><Input required step="0.01" type="number" value={formData.base_price} onChange={(e) => onFormChange({ ...formData, base_price: e.target.value })} /></div>
            <div><Label>Costo *</Label><Input required step="0.01" type="number" value={formData.cost} onChange={(e) => onFormChange({ ...formData, cost: e.target.value })} /></div>
            <div className="flex items-center space-x-2 pt-4">
              <input checked={formData.is_active} className="h-4 w-4" id="is_active" type="checkbox" onChange={(e) => onFormChange({ ...formData, is_active: e.target.checked })} />
              <Label htmlFor="is_active">Matriz Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); }}>Cancelar</Button>
            <Button type="submit">{editingMatrix ? "Actualizar" : "Crear"} Matriz</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
