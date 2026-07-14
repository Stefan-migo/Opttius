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

interface ContactLensFamily {
  id: string;
  name: string;
  use_type: string;
  is_active: boolean;
}

const USE_TYPES = [
  { value: "daily", label: "Diario" },
  { value: "bi_weekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "extended_wear", label: "Uso Prolongado" },
];

interface MatrixFormData {
  contact_lens_family_id: string;
  sphere_min: string;
  sphere_max: string;
  cylinder_min: string;
  cylinder_max: string;
  axis_min: string;
  axis_max: string;
  addition_min: string;
  addition_max: string;
  base_price: string;
  cost: string;
  is_active: boolean;
}

interface ContactLensMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMatrix: unknown;
  formData: MatrixFormData;
  families: ContactLensFamily[];
  onFormChange: (field: keyof MatrixFormData, value: string | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ContactLensMatrixDialog({
  open,
  onOpenChange,
  editingMatrix,
  formData,
  families,
  onFormChange,
  onSubmit,
  onClose,
}: ContactLensMatrixDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingMatrix ? "Editar Matriz" : "Nueva Matriz"}
          </DialogTitle>
          <DialogDescription>
            {editingMatrix
              ? "Modifica los datos de la matriz de precios"
              : "Completa los datos para crear una nueva matriz de precios"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contact_lens_family_id">
                Familia de Lentes de Contacto <span className="text-red-500">*</span>
              </Label>
              <Select
                required
                value={formData.contact_lens_family_id}
                onValueChange={(value) => onFormChange("contact_lens_family_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar familia" />
                </SelectTrigger>
                <SelectContent>
                  {families
                    .filter((f) => f.is_active)
                    .map((family) => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.name} ({USE_TYPES.find((t) => t.value === family.use_type)?.label})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sphere_min">Esfera Mínima <span className="text-red-500">*</span></Label>
                <Input required id="sphere_min" step="0.25" type="number" value={formData.sphere_min} onChange={(e) => onFormChange("sphere_min", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sphere_max">Esfera Máxima <span className="text-red-500">*</span></Label>
                <Input required id="sphere_max" step="0.25" type="number" value={formData.sphere_max} onChange={(e) => onFormChange("sphere_max", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cylinder_min">Cilindro Mínimo</Label>
                <Input id="cylinder_min" step="0.25" type="number" value={formData.cylinder_min} onChange={(e) => onFormChange("cylinder_min", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cylinder_max">Cilindro Máximo</Label>
                <Input id="cylinder_max" step="0.25" type="number" value={formData.cylinder_max} onChange={(e) => onFormChange("cylinder_max", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="axis_min">Eje Mínimo (°)</Label>
                <Input id="axis_min" max="180" min="0" type="number" value={formData.axis_min} onChange={(e) => onFormChange("axis_min", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="axis_max">Eje Máximo (°)</Label>
                <Input id="axis_max" max="180" min="0" type="number" value={formData.axis_max} onChange={(e) => onFormChange("axis_max", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addition_min">Adición Mínima</Label>
                <Input id="addition_min" max="4" min="0" step="0.25" type="number" value={formData.addition_min} onChange={(e) => onFormChange("addition_min", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addition_max">Adición Máxima</Label>
                <Input id="addition_max" max="4" min="0" step="0.25" type="number" value={formData.addition_max} onChange={(e) => onFormChange("addition_max", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_price">Precio de Venta (por caja) <span className="text-red-500">*</span></Label>
                <Input required id="base_price" min="0" step="0.01" type="number" value={formData.base_price} onChange={(e) => onFormChange("base_price", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Costo (por caja) <span className="text-red-500">*</span></Label>
                <Input required id="cost" min="0" step="0.01" type="number" value={formData.cost} onChange={(e) => onFormChange("cost", e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input checked={formData.is_active} className="rounded" id="is_active" type="checkbox" onChange={(e) => onFormChange("is_active", e.target.checked)} />
              <Label className="cursor-pointer" htmlFor="is_active">Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{editingMatrix ? "Actualizar" : "Crear"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
