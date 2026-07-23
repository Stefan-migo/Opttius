interface OptionValue {
  id: string;
  value: string;
  label: string;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
}

type OptionItem = { value: string; label: string };

function getOptions(
  fieldKey: string,
  productOptions: Record<string, OptionValue[]>,
  optionsLoading: boolean,
  fallback: OptionItem[] = [],
): OptionItem[] {
  if (optionsLoading) return fallback;
  const dbOptions = productOptions[fieldKey];
  if (dbOptions && dbOptions.length > 0) {
    return dbOptions.map((opt) => ({ value: opt.value, label: opt.label }));
  }
  return fallback;
}

export function useProductOptions(
  productOptions: Record<string, OptionValue[]>,
  optionsLoading: boolean,
) {
  const productTypes = getOptions(
    "product_type",
    productOptions,
    optionsLoading,
    [
      { value: "frame", label: "Armazón" },
      { value: "lens", label: "Lente" },
      { value: "accessory", label: "Accesorio" },
      { value: "service", label: "Servicio" },
    ],
  );

  const frameTypes = getOptions("frame_type", productOptions, optionsLoading, [
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
  ]);

  const frameMaterials = getOptions(
    "frame_material",
    productOptions,
    optionsLoading,
    [
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
    ],
  );

  const frameShapes = getOptions(
    "frame_shape",
    productOptions,
    optionsLoading,
    [
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
    ],
  );

  const frameGenders = getOptions(
    "frame_gender",
    productOptions,
    optionsLoading,
    [
      { value: "mens", label: "Hombre" },
      { value: "womens", label: "Mujer" },
      { value: "unisex", label: "Unisex" },
      { value: "kids", label: "Niños" },
      { value: "youth", label: "Juvenil" },
    ],
  );

  const frameSizes = getOptions("frame_size", productOptions, optionsLoading, [
    { value: "narrow", label: "Estrecho" },
    { value: "medium", label: "Mediano" },
    { value: "wide", label: "Ancho" },
    { value: "extra_wide", label: "Extra Ancho" },
  ]);

  const frameFeatures = productOptions["frame_features"]?.map(
    (opt) => opt.value,
  ) || [
    "spring_hinges",
    "adjustable_nose_pads",
    "flexible_temples",
    "lightweight",
    "durable",
    "sports_ready",
    "memory_metal",
  ];

  const allLensTypes = getOptions("lens_type", productOptions, optionsLoading, [
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
  ]);

  const lensTypes = allLensTypes.filter(
    (type) =>
      type.value === "reading" ||
      type.value === "sunglasses" ||
      type.value === "safety",
  );

  const lensMaterials = getOptions(
    "lens_material",
    productOptions,
    optionsLoading,
    [
      { value: "cr39", label: "CR-39" },
      { value: "polycarbonate", label: "Policarbonato" },
      { value: "high_index_1_67", label: "Alto Índice 1.67" },
      { value: "high_index_1_74", label: "Alto Índice 1.74" },
      { value: "trivex", label: "Trivex" },
      { value: "glass", label: "Vidrio" },
      { value: "photochromic", label: "Fotocromático" },
    ],
  );

  const lensCoatings = productOptions["lens_coatings"]?.map(
    (opt) => opt.value,
  ) || [
    "anti_reflective",
    "blue_light_filter",
    "uv_protection",
    "scratch_resistant",
    "anti_fog",
    "mirror",
    "tint",
    "polarized",
  ];

  const uvProtectionLevels = getOptions(
    "uv_protection",
    productOptions,
    optionsLoading,
    [
      { value: "none", label: "Ninguno" },
      { value: "uv400", label: "UV400" },
      { value: "uv380", label: "UV380" },
      { value: "uv350", label: "UV350" },
    ],
  );

  return {
    productTypes,
    allowedLensTypes: ["reading", "sunglasses", "safety"],
    frameTypes,
    frameMaterials,
    frameShapes,
    frameGenders,
    frameSizes,
    frameFeatures,
    lensTypes,
    allLensTypes,
    lensMaterials,
    lensCoatings,
    uvProtectionLevels,
  };
}
