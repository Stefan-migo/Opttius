import { appLogger as logger } from "@/lib/logger";

export const CSV_COLUMN_MAPPINGS: Record<string, string> = {
  nombre: "name", name: "name",
  slug: "slug",
  descripcion: "description", description: "description",
  precio: "price", price: "price",
  precio_comparacion: "compare_at_price", compare_at_price: "compare_at_price",
  stock: "stock_quantity", stock_quantity: "stock_quantity",
  inventory_quantity: "stock_quantity",
  estado: "status", status: "status",
  destacado: "is_featured", is_featured: "is_featured",
  sku: "sku",
  peso: "weight", weight: "weight",
  tipos_piel: "skin_type", skin_type: "skin_type",
  beneficios: "benefits", benefits: "benefits",
  certificaciones: "certifications", certifications: "certifications",
  instrucciones: "usage_instructions", usage_instructions: "usage_instructions",
  ingredientes: "ingredients", ingredients: "ingredients",
  precauciones: "precautions", precautions: "precautions",
  dimensiones: "dimensions", dimensions: "dimensions",
  caracteristicas_paquete: "package_characteristics", package_characteristics: "package_characteristics",
  imagen_principal: "featured_image", featured_image: "featured_image",
  galeria_1: "gallery_1", gallery_1: "gallery_1",
  galeria_2: "gallery_2", gallery_2: "gallery_2",
  galeria_3: "gallery_3", gallery_3: "gallery_3",
  galeria_4: "gallery_4", gallery_4: "gallery_4",
  categoria: "category_name", category: "category_name",
};

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

export function generateSlug(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

export function parseBoolean(value: string): boolean {
  if (!value) return false;
  return ["true", "1", "yes", "sí", "si", "y"].includes(value.toLowerCase().trim());
}

export function parseArray(value: string): string[] {
  if (!value) return [];
  if (value.trim().startsWith("[") && value.trim().endsWith("]")) {
    try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map((i: unknown) => typeof i === "string" ? i : JSON.stringify(i)); } catch { /* fallback */ }
  }
  return value.split(";").map((i) => i.trim()).filter(Boolean);
}

export function parseIngredients(value: string): Array<{ name: string; percentage?: number }> {
  if (!value) return [];
  if (value.trim().startsWith("[") && value.trim().endsWith("]")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item: unknown) =>
        typeof item === "object" && item ? { name: (item as { name: string }).name, percentage: (item as { percentage?: number }).percentage || undefined } : { name: String(item) }
      );
    } catch { logger.warn("Failed to parse ingredients JSON", { error: "" }); }
  }
  return value.split(";").map((item) => ({ name: item.trim() })).filter((i) => i.name.length > 0);
}
