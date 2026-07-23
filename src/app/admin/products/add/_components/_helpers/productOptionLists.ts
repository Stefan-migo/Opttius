export const PRODUCT_TYPE_OPTIONS = [
  { value: "frame", label: "Armazón" },
  { value: "lens", label: "Lente" },
  { value: "accessory", label: "Accesorio" },
  { value: "service", label: "Servicio" },
];

export const ALLOWED_LENS_TYPES = ["reading", "sunglasses", "safety"];

export const FRAME_TYPE_OPTIONS = [
  { value: "full_frame", label: "Marco Completo" },
  { value: "half_frame", label: "Media Montura" },
  { value: "rimless", label: "Sin Marco" },
  { value: "semi_rimless", label: "Semi Sin Marco" },
  { value: "browline", label: "Browline" },
  { value: "cat_eye", label: "Ojo de Gato" },
  { value: "aviator", label: "Aviador" },
  { value: "round", label: "Redondo" },
  { value: "square", label: "Cuadrado" },
  { value: "rectangular", label: "Rectangular" },
  { value: "oval", label: "Oval" },
  { value: "geometric", label: "Geométrico" },
];

export const FRAME_MATERIAL_OPTIONS = [
  { value: "acetate", label: "Acetato" },
  { value: "metal", label: "Metal" },
  { value: "titanium", label: "Titanio" },
  { value: "stainless_steel", label: "Acero Inoxidable" },
  { value: "aluminum", label: "Aluminio" },
  { value: "carbon_fiber", label: "Fibra de Carbono" },
  { value: "wood", label: "Madera" },
  { value: "horn", label: "Cuerno" },
  { value: "plastic", label: "Plástico" },
  { value: "tr90", label: "TR90" },
  { value: "monel", label: "Monel" },
  { value: "beta_titanium", label: "Beta Titanio" },
];

export const FRAME_SHAPE_OPTIONS = [
  { value: "round", label: "Redondo" },
  { value: "square", label: "Cuadrado" },
  { value: "rectangular", label: "Rectangular" },
  { value: "oval", label: "Oval" },
  { value: "cat_eye", label: "Ojo de Gato" },
  { value: "aviator", label: "Aviador" },
  { value: "browline", label: "Browline" },
  { value: "geometric", label: "Geométrico" },
  { value: "shield", label: "Escudo" },
  { value: "wrap", label: "Wrap" },
  { value: "sport", label: "Deportivo" },
];

export const FRAME_GENDER_OPTIONS = [
  { value: "mens", label: "Hombre" },
  { value: "womens", label: "Mujer" },
  { value: "unisex", label: "Unisex" },
  { value: "kids", label: "Niños" },
  { value: "youth", label: "Juvenil" },
];

export const FRAME_SIZE_OPTIONS = [
  { value: "narrow", label: "Estrecho" },
  { value: "medium", label: "Mediano" },
  { value: "wide", label: "Ancho" },
  { value: "extra_wide", label: "Extra Ancho" },
];

export const DEFAULT_FRAME_FEATURES = [
  "spring_hinges",
  "adjustable_nose_pads",
  "flexible_temples",
  "lightweight",
  "durable",
  "sports_ready",
  "memory_metal",
];

export const LENS_TYPE_OPTIONS = [
  { value: "single_vision", label: "Monofocal" },
  { value: "bifocal", label: "Bifocal" },
  { value: "trifocal", label: "Trifocal" },
  { value: "progressive", label: "Progresivo" },
  { value: "reading", label: "Lectura" },
  { value: "computer", label: "Computadora" },
  { value: "driving", label: "Conducción" },
  { value: "sports", label: "Deportivo" },
  { value: "photochromic", label: "Fotocromático" },
  { value: "polarized", label: "Polarizado" },
  { value: "sunglasses", label: "Lentes de Sol" },
  { value: "safety", label: "Lentes de Seguridad" },
];

export const LENS_MATERIAL_OPTIONS = [
  { value: "cr39", label: "CR-39" },
  { value: "polycarbonate", label: "Policarbonato" },
  { value: "high_index_1_67", label: "Alto Índice 1.67" },
  { value: "high_index_1_74", label: "Alto Índice 1.74" },
  { value: "trivex", label: "Trivex" },
  { value: "glass", label: "Vidrio" },
  { value: "photochromic", label: "Fotocromático" },
];

export const DEFAULT_LENS_COATINGS = [
  "anti_reflective",
  "blue_light_filter",
  "uv_protection",
  "scratch_resistant",
  "anti_fog",
  "mirror",
  "tint",
  "polarized",
];

export const UV_PROTECTION_OPTIONS = [
  { value: "none", label: "Ninguno" },
  { value: "uv400", label: "UV400" },
  { value: "uv380", label: "UV380" },
  { value: "uv350", label: "UV350" },
];

export function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
