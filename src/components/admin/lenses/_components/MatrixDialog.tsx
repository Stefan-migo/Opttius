"use client";


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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MatrixFormData {
  lens_family_id: string;
  name: string;
  sphere_min: string;
  sphere_max: string;
  cylinder_min: string;
  cylinder_max: string;
  base_price: string;
  cost: string;
  is_active: boolean;
}

export interface LensFamily {
  id: string;
  name: string;
  brand?: string;
}

interface MatrixDialogProps {
  open: boolean;
  editingMatrix: boolean;
  formData: MatrixFormData;
  families: LensFamily[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<MatrixFormData>) => void;
}

export function MatrixDialog({
  open,
  editingMatrix,
  formData,
  families,
  onClose,
  onSubmit,
  onChange,
}: MatrixDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingMatrix ? "Editar Matriz" : "Crear Nueva Matriz"}</DialogTitle>
          <DialogDescription>
            {editingMatrix
              ? "Modifica los parámetros de la matriz seleccionada"
              : "Ingresa los detalles para crear una nueva matriz de precios"}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="lens_family_id">Familia de Lente *</Label>
              <Select
                required
                value={formData.lens_family_id}
                onValueChange={(v) => onChange({ lens_family_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar familia" />
                </SelectTrigger>
                <SelectContent>
                  {families.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} {f.brand ? `(${f.brand})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="name">Nombre (opcional)</Label>
              <Input
                id="name"
                placeholder="Ej: Rango base, Fallback..."
                value={formData.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="sphere_min">Esfera Mínima *</Label>
              <Input required step="0.25" type="number" value={formData.sphere_min}
                onChange={(e) => onChange({ sphere_min: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sphere_max">Esfera Máxima *</Label>
              <Input required step="0.25" type="number" value={formData.sphere_max}
                onChange={(e) => onChange({ sphere_max: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cylinder_min">Cilindro Mínimo</Label>
              <Input step="0.25" type="number" value={formData.cylinder_min}
                onChange={(e) => onChange({ cylinder_min: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cylinder_max">Cilindro Máximo</Label>
              <Input step="0.25" type="number" value={formData.cylinder_max}
                onChange={(e) => onChange({ cylinder_max: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="base_price">Precio Base *</Label>
              <Input required step="0.01" type="number" value={formData.base_price}
                onChange={(e) => onChange({ base_price: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cost">Costo *</Label>
              <Input required step="0.01" type="number" value={formData.cost}
                onChange={(e) => onChange({ cost: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <input checked={formData.is_active} id="is_active" type="checkbox"
                onChange={(e) => onChange({ is_active: e.target.checked })} />
              <Label htmlFor="is_active">Matriz Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{editingMatrix ? "Actualizar" : "Crear"} Matriz</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
