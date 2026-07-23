"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { ContactLensModality, ContactLensPackaging, ContactLensUseType } from "@/types/contact-lens";

interface FamilyInfoStepProps {
  data: {
    name: string; brand: string; category_id: string | null;
    use_type: ContactLensUseType; modality: ContactLensModality; material: string | undefined;
    packaging: ContactLensPackaging; base_curve: string; diameter: string;
    description: string; is_active: boolean;
  };
  errors: Record<string, string>;
  categories: { id: string; name: string; slug: string }[];
  onChange: (data: FamilyInfoStepProps["data"]) => void;
}

const USE_TYPES = [
  { value: "daily", label: "Diario" }, { value: "bi_weekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" }, { value: "extended_wear", label: "Uso Prolongado" },
];
const MODALITIES = [
  { value: "spherical", label: "Esférico" }, { value: "toric", label: "Tórico" },
  { value: "multifocal", label: "Multifocal" }, { value: "cosmetic", label: "Cosmético" },
];
const MATERIALS = [
  { value: "silicone_hydrogel", label: "Hidrogel de Silicona" },
  { value: "hydrogel", label: "Hidrogel" }, { value: "rigid_gas_permeable", label: "RGP" },
];
const PACKAGING_TYPES = [
  { value: "box_30", label: "Caja de 30 lentes" }, { value: "box_6", label: "Caja de 6 lentes" },
  { value: "box_3", label: "Caja de 3 lentes" }, { value: "bottle", label: "Botella" },
];

export function FamilyInfoStep({ data, errors, categories, onChange }: FamilyInfoStepProps) {
  const update = (partial: Partial<FamilyInfoStepProps["data"]>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input className={errors.name ? "border-red-500" : ""} id="name" placeholder="Ej: Air Optix Aqua" value={data.name} onChange={(e) => update({ name: e.target.value })} />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" placeholder="Ej: Alcon" value={data.brand} onChange={(e) => update({ brand: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Categoría</Label>
        <Select value={data.category_id ?? "__none__"} onValueChange={(v) => update({ category_id: v === "__none__" ? null : v })}>
          <SelectTrigger><SelectValue placeholder="Seleccionar categoría (opcional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin categoría</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Uso *</Label>
          <Select value={data.use_type} onValueChange={(v: ContactLensUseType) => update({ use_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{USE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Modalidad *</Label>
          <Select value={data.modality} onValueChange={(v: ContactLensModality) => update({ modality: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MODALITIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Material</Label>
          <Select value={data.material || "__none__"} onValueChange={(v) => update({ material: v === "__none__" ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar material" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Ninguno</SelectItem>
              {MATERIALS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Embalaje *</Label>
          <Select value={data.packaging} onValueChange={(v: ContactLensPackaging) => update({ packaging: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PACKAGING_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="base_curve">Curva Base (BC)</Label>
          <Input id="base_curve" max="10" min="7" placeholder="Ej: 8.4" step="0.1" type="number" value={data.base_curve} onChange={(e) => update({ base_curve: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="diameter">Diámetro (DIA)</Label>
          <Input id="diameter" max="15" min="13" placeholder="Ej: 14.0" step="0.1" type="number" value={data.diameter} onChange={(e) => update({ diameter: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" placeholder="Descripción opcional" rows={3} value={data.description} onChange={(e) => update({ description: e.target.value })} />
      </div>
      <div className="flex items-center gap-2">
        <input checked={data.is_active} className="rounded" id="is_active" type="checkbox" onChange={(e) => update({ is_active: e.target.checked })} />
        <Label className="cursor-pointer" htmlFor="is_active">Activa</Label>
      </div>
    </div>
  );
}
