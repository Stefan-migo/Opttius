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

export interface MatrixFormState {
  name: string;
  sphere_min: string;
  sphere_max: string;
  cylinder_min: string;
  cylinder_max: string;
  addition_min: string;
  addition_max: string;
  base_price: string;
  cost: string;
  sourcing_type: "stock" | "surfaced";
  is_active: boolean;
}

interface LensMatrixDialogProps {
  open: boolean;
  editingId: string | null;
  formData: MatrixFormState;
  isMonofocal: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<MatrixFormState>) => void;
}

export function LensMatrixDialog({
  open,
  editingId,
  formData,
  isMonofocal,
  onClose,
  onSubmit,
  onChange,
}: LensMatrixDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingId ? "Editar Matriz" : "Nueva Matriz de Precios"}</DialogTitle>
          <DialogDescription>Define los rangos de graduación y precios para esta matriz.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-4 col-span-2">
              <div>
                <Label htmlFor="matrix_name">Nombre (opcional)</Label>
                <Input id="matrix_name" placeholder="Ej: Rango base, Fallback..."
                  value={formData.name} onChange={(e) => onChange({ name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-500 uppercase">Rangos de Graduación</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="sphere_min">Esfera Min</Label>
                  <Input required id="sphere_min" step="0.25" type="number" value={formData.sphere_min}
                    onChange={(e) => onChange({ sphere_min: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="sphere_max">Esfera Max</Label>
                  <Input required id="sphere_max" step="0.25" type="number" value={formData.sphere_max}
                    onChange={(e) => onChange({ sphere_max: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cylinder_min">Cilindro Min</Label>
                  <Input required id="cylinder_min" step="0.25" type="number" value={formData.cylinder_min}
                    onChange={(e) => onChange({ cylinder_min: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cylinder_max">Cilindro Max</Label>
                  <Input required id="cylinder_max" step="0.25" type="number" value={formData.cylinder_max}
                    onChange={(e) => onChange({ cylinder_max: e.target.value })} />
                </div>
              </div>
              {!isMonofocal && (
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-md">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-purple-900" htmlFor="addition_min">Adición Min</Label>
                      <Input required className="bg-white" id="addition_min" max="4" min="0" step="0.25"
                        type="number" value={formData.addition_min}
                        onChange={(e) => onChange({ addition_min: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-purple-900" htmlFor="addition_max">Adición Max</Label>
                      <Input required className="bg-white" id="addition_max" max="4" min="0" step="0.25"
                        type="number" value={formData.addition_max}
                        onChange={(e) => onChange({ addition_max: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-500 uppercase">Precios y Configuración</h4>
              <div>
                <Label htmlFor="base_price">Precio Venta</Label>
                <Input required id="base_price" min="0" step="0.01" type="number" value={formData.base_price}
                  onChange={(e) => onChange({ base_price: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cost">Costo Compra</Label>
                <Input required id="cost" min="0" step="0.01" type="number" value={formData.cost}
                  onChange={(e) => onChange({ cost: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="sourcing_type">Tipo de Sourcing</Label>
                <Select value={formData.sourcing_type}
                  onValueChange={(v: "stock" | "surfaced") => onChange({ sourcing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock (Inventario)</SelectItem>
                    <SelectItem value="surfaced">Surfaced (Laboratorio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <input checked={formData.is_active} className="h-4 w-4 rounded border-gray-300" id="is_active_matrix"
                  type="checkbox"
                  onChange={(e) => onChange({ is_active: e.target.checked })} />
                <Label className="cursor-pointer" htmlFor="is_active_matrix">Matriz Activa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{editingId ? "Actualizar Matriz" : "Agregar Matriz"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
