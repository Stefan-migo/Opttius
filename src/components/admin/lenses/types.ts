export interface LensFamily {
  id: string;
  name: string;
  brand: string | null;
  lens_type: string;
  lens_material: string;
}

export interface LensPriceMatrix {
  id: string;
  lens_family_id: string;
  name?: string | null;
  sphere_min: number;
  sphere_max: number;
  cylinder_min: number;
  cylinder_max: number;
  base_price: number;
  sourcing_type: string;
  cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lens_families: LensFamily;
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

export interface LensMatrixFormData {
  id: string;
  name?: string | null;
  sphere_min: number;
  sphere_max: number;
  cylinder_min: number;
  cylinder_max: number;
  addition_min: number;
  addition_max: number;
  base_price: number;
  cost: number;
  sourcing_type: "stock" | "surfaced";
  is_active: boolean;
}

export const LENS_MATERIALS = [
  { value: "cr39", label: "CR-39" },
  { value: "polycarbonate", label: "Policarbonato" },
  { value: "high_index_1_67", label: "Alto Índice 1.67" },
  { value: "high_index_1_74", label: "Alto Índice 1.74" },
  { value: "trivex", label: "Trivex" },
  { value: "glass", label: "Vidrio" },
];
