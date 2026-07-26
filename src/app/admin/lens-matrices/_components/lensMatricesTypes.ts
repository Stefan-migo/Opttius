export interface LensFamily {
  id: string;
  name: string;
  brand: string | null;
  lens_type: string;
  lens_material: string;
  is_active?: boolean;
}

export interface LensPriceMatrix {
  id: string;
  lens_family_id: string;
  sphere_min: number;
  sphere_max: number;
  cylinder_min: number;
  cylinder_max: number;
  addition_min?: number;
  addition_max?: number;
  base_price: number;
  sourcing_type: string;
  cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lens_families: LensFamily;
}

export interface LensMatrixFormData {
  lens_family_id: string;
  sphere_min: string;
  sphere_max: string;
  cylinder_min: string;
  cylinder_max: string;
  addition_min: string;
  addition_max: string;
  base_price: string;
  sourcing_type: "stock" | "surfaced";
  cost: string;
  is_active: boolean;
}
