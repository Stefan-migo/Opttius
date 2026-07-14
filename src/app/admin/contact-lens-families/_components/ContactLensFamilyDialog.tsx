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
import { Textarea } from "@/components/ui/textarea";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const USE_TYPES = [
  { value: "daily", label: "Diario" },
  { value: "bi_weekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "extended_wear", label: "Uso Prolongado" },
];

const MODALITIES = [
  { value: "spherical", label: "Esférico" },
  { value: "toric", label: "Tórico" },
  { value: "multifocal", label: "Multifocal" },
  { value: "cosmetic", label: "Cosmético" },
];

const MATERIALS = [
  { value: "silicone_hydrogel", label: "Hidrogel de Silicona" },
  { value: "hydrogel", label: "Hidrogel" },
  { value: "rigid_gas_permeable", label: "RGP" },
];

const PACKAGING_TYPES = [
  { value: "box_30", label: "Caja de 30 lentes" },
  { value: "box_6", label: "Caja de 6 lentes" },
  { value: "box_3", label: "Caja de 3 lentes" },
  { value: "bottle", label: "Botella" },
];

interface FamilyFormData {
  name: string;
  brand: string;
  category_id: string | null;
  use_type: string;
  modality: string;
  material: string | undefined;
  packaging: string;
  base_curve: string;
  diameter: string;
  description: string;
  is_active: boolean;
}

interface ContactLensFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFamily: unknown;
  formData: FamilyFormData;
  categories: Category[];
  onFormChange: (field: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ContactLensFamilyDialog({
  open,
  onOpenChange,
  editingFamily,
  formData,
  categories,
  onFormChange,
  onSubmit,
  onClose,
}: ContactLensFamilyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingFamily ? "Editar Familia" : "Nueva Familia"}</DialogTitle>
          <DialogDescription>
            {editingFamily
              ? "Modifica los datos de la familia de lentes de contacto"
              : "Completa los datos para crear una nueva familia de lentes de contacto"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
                <Input required id="name" value={formData.name} onChange={(e) => onFormChange("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" value={formData.brand} onChange={(e) => onFormChange("brand", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Categoría</Label>
              <Select value={formData.category_id ?? "__none__"} onValueChange={(value) => onFormChange("category_id", value === "__none__" ? null : value)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin categoría</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="use_type">Tipo de Uso <span className="text-red-500">*</span></Label>
                <Select value={formData.use_type} onValueChange={(value) => onFormChange("use_type", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modality">Modalidad <span className="text-red-500">*</span></Label>
                <Select value={formData.modality} onValueChange={(value) => onFormChange("modality", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODALITIES.map((mod) => (
                      <SelectItem key={mod.value} value={mod.value}>{mod.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Select value={formData.material || "__none__"} onValueChange={(value) => onFormChange("material", value === "__none__" ? undefined : value)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar material" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguno</SelectItem>
                    {MATERIALS.map((mat) => (
                      <SelectItem key={mat.value} value={mat.value}>{mat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="packaging">Embalaje <span className="text-red-500">*</span></Label>
                <Select value={formData.packaging} onValueChange={(value) => onFormChange("packaging", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PACKAGING_TYPES.map((pkg) => (
                      <SelectItem key={pkg.value} value={pkg.value}>{pkg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_curve">Curva Base (BC)</Label>
                <Input id="base_curve" max="10.0" min="7.0" placeholder="Ej: 8.4" step="0.1" type="number" value={formData.base_curve} onChange={(e) => onFormChange("base_curve", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diameter">Diámetro (DIA)</Label>
                <Input id="diameter" max="15.0" min="13.0" placeholder="Ej: 14.0" step="0.1" type="number" value={formData.diameter} onChange={(e) => onFormChange("diameter", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" rows={3} value={formData.description} onChange={(e) => onFormChange("description", e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <input checked={formData.is_active} className="rounded" id="is_active" type="checkbox" onChange={(e) => onFormChange("is_active", e.target.checked)} />
              <Label className="cursor-pointer" htmlFor="is_active">Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{editingFamily ? "Actualizar" : "Crear"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
