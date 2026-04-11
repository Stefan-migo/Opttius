"use client";

import { useEffect, useState } from "react";

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

export interface LensFamilyFormData {
  name: string;
  brand: string;
  category_id: string | null;
  lens_type: string;
  lens_material: string;
  description: string;
  is_active: boolean;
}

interface LensFamilyBasicFormProps {
  data: LensFamilyFormData;
  onChange: (data: LensFamilyFormData) => void;
  errors?: Record<string, string>;
}

export const LENS_TYPES = [
  { value: "single_vision", label: "Monofocal" },
  { value: "bifocal", label: "Bifocal" },
  { value: "trifocal", label: "Trifocal" },
  { value: "progressive", label: "Progresivo" },
  { value: "reading", label: "Lectura" },
  { value: "computer", label: "Computadora" },
  { value: "sports", label: "Deportivo" },
];

export const LENS_MATERIALS = [
  { value: "cr39", label: "CR-39" },
  { value: "polycarbonate", label: "Policarbonato" },
  { value: "high_index_1_67", label: "Alto Índice 1.67" },
  { value: "high_index_1_74", label: "Alto Índice 1.74" },
  { value: "trivex", label: "Trivex" },
  { value: "glass", label: "Vidrio" },
];

const CATEGORY_NONE_VALUE = "__none__";

const LENS_CATEGORY_SLUGS = [
  "lectura",
  "ocupacional",
  "deportivo",
  "lentes-contacto",
];

export function LensFamilyBasicForm({
  data,
  onChange,
  errors = {},
}: LensFamilyBasicFormProps) {
  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        const cats = json.categories || json.data || [];
        setCategories(
          cats.filter((c: { slug?: string }) =>
            LENS_CATEGORY_SLUGS.includes(c.slug ?? ""),
          ),
        );
      })
      .catch(() => setCategories([]));
  }, []);

  const handleChange = (field: keyof LensFamilyFormData, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la Familia *</Label>
          <Input
            className={errors.name ? "border-red-500" : ""}
            id="name"
            placeholder="Ej: Varilux Comfort"
            value={data.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">Marca</Label>
          <Input
            id="brand"
            placeholder="Ej: Essilor"
            value={data.brand}
            onChange={(e) => handleChange("brand", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Categoría deprecada: oculta por defecto, priorizar lens_type como selector de tipo */}
        <div className="space-y-2 hidden">
          <Label htmlFor="category_id">Categoría</Label>
          <Select
            value={data.category_id ?? CATEGORY_NONE_VALUE}
            onValueChange={(value) =>
              handleChange(
                "category_id",
                value === CATEGORY_NONE_VALUE ? null : value,
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CATEGORY_NONE_VALUE}>Sin categoría</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="lens_type">Tipo de Lente *</Label>
          <p className="text-xs text-muted-foreground">
            Clasificación técnica del diseño óptico: monofocal, bifocal,
            progresivo, lectura, etc. Usado para sugerir familias en
            presupuestos.
          </p>
          <Select
            value={data.lens_type}
            onValueChange={(value) => handleChange("lens_type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {LENS_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lens_material">Material *</Label>
          <Select
            value={data.lens_material}
            onValueChange={(value) => handleChange("lens_material", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar material" />
            </SelectTrigger>
            <SelectContent>
              {LENS_MATERIALS.map((material) => (
                <SelectItem key={material.value} value={material.value}>
                  {material.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Descripción detallada de la familia de lentes..."
          rows={3}
          value={data.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          checked={data.is_active}
          className="h-4 w-4 rounded border-gray-300"
          id="is_active_family"
          type="checkbox"
          onChange={(e) => handleChange("is_active", e.target.checked)}
        />
        <Label className="cursor-pointer" htmlFor="is_active_family">
          Familia Activa
        </Label>
      </div>
    </div>
  );
}
