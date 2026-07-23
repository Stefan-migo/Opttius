"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormData {
  name: string; sphere_min: string; sphere_max: string; cylinder_min: string; cylinder_max: string;
  axis_min: string; axis_max: string; addition_min: string; addition_max: string;
  base_price: string; cost: string; is_active: boolean;
}

interface MatrixEditDialogProps {
  open: boolean;
  editingId: string | null;
  formData: FormData;
  onOpenChange: (v: boolean) => void;
  onFormChange: (v: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function MatrixEditDialog({ open, editingId, formData, onOpenChange, onFormChange, onSubmit }: MatrixEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? "Editar Matriz" : "Nueva Matriz de Precios"}</DialogTitle>
          <DialogDescription>Define los rangos de graduación y precios para lentes de contacto.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-4 col-span-2">
              <div><Label htmlFor="matrix_name">Nombre (opcional)</Label><Input id="matrix_name" placeholder="Ej: Rango base, Fallback..." value={formData.name} onChange={(e) => onFormChange({ ...formData, name: e.target.value })} /></div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-500 uppercase">Rangos de Graduación</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Esfera Min</Label><Input required step="0.25" type="number" value={formData.sphere_min} onChange={(e) => onFormChange({ ...formData, sphere_min: e.target.value })} /></div>
                <div><Label>Esfera Max</Label><Input required step="0.25" type="number" value={formData.sphere_max} onChange={(e) => onFormChange({ ...formData, sphere_max: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Cilindro Min</Label><Input required step="0.25" type="number" value={formData.cylinder_min} onChange={(e) => onFormChange({ ...formData, cylinder_min: e.target.value })} /></div>
                <div><Label>Cilindro Max</Label><Input required step="0.25" type="number" value={formData.cylinder_max} onChange={(e) => onFormChange({ ...formData, cylinder_max: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Eje Min</Label><Input required max="180" min="0" type="number" value={formData.axis_min} onChange={(e) => onFormChange({ ...formData, axis_min: e.target.value })} /></div>
                <div><Label>Eje Max</Label><Input required max="180" min="0" type="number" value={formData.axis_max} onChange={(e) => onFormChange({ ...formData, axis_max: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Adición Min</Label><Input required step="0.25" type="number" value={formData.addition_min} onChange={(e) => onFormChange({ ...formData, addition_min: e.target.value })} /></div>
                <div><Label>Adición Max</Label><Input required step="0.25" type="number" value={formData.addition_max} onChange={(e) => onFormChange({ ...formData, addition_max: e.target.value })} /></div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-500 uppercase">Precios</h4>
              <div><Label>Precio Base</Label><Input required min="0" step="0.01" type="number" value={formData.base_price} onChange={(e) => onFormChange({ ...formData, base_price: e.target.value })} /></div>
              <div><Label>Costo</Label><Input required min="0" step="0.01" type="number" value={formData.cost} onChange={(e) => onFormChange({ ...formData, cost: e.target.value })} /></div>
              <div className="flex items-center gap-2">
                <input checked={formData.is_active} className="rounded" id="mat_is_active" type="checkbox" onChange={(e) => onFormChange({ ...formData, is_active: e.target.checked })} />
                <Label className="cursor-pointer" htmlFor="mat_is_active">Activa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{editingId ? "Actualizar" : "Agregar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
