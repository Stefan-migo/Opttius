import { createClient } from "@/utils/supabase/server";

interface ProductImport {
  name: string;
  slug?: string;
  price: number;
  category_id?: string;
  category?: string | { name: string; slug?: string };
  short_description?: string;
  description?: string;
  compare_at_price?: number;
  inventory_quantity?: number;
  featured_image?: string;
  gallery?: string[];
  is_featured?: boolean;
  status?: string;
  skin_type?: string[];
  benefits?: string[];
  certifications?: string[];
  ingredients?: Array<{ name: string; percentage?: number }>;
  usage_instructions?: string;
  precautions?: string;
  weight?: number;
  dimensions?: string;
  package_characteristics?: string;
  [key: string]: unknown;
}

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

export async function resolveCategoryId(product: ProductImport) {
  if (product.category_id) return product.category_id;
  if (!product.category) return null;

  const categoryName =
    typeof product.category === "string"
      ? product.category
      : product.category.name;
  if (!categoryName) return null;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .limit(100);
  const match = categories?.find(
    (cat) =>
      cat.name.toLowerCase() === categoryName.toLowerCase() ||
      cat.slug.toLowerCase() ===
        categoryName.toLowerCase().replace(/\s+/g, "-") ||
      cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
      categoryName.toLowerCase().includes(cat.name.toLowerCase()),
  );
  return match?.id || null;
}

export function buildProductInsertData(product: ProductImport, slug: string) {
  return {
    name: product.name,
    slug,
    short_description: product.short_description || null,
    description: product.description || null,
    price: product.price,
    compare_at_price: product.compare_at_price || null,
    inventory_quantity: product.inventory_quantity || 0,
    featured_image: product.featured_image || null,
    gallery: product.gallery || [],
    skin_type: product.skin_type || [],
    benefits: product.benefits || [],
    certifications: product.certifications || [],
    ingredients: product.ingredients || [],
    usage_instructions: product.usage_instructions || null,
    precautions: product.precautions || null,
    weight: product.weight || null,
    dimensions: product.dimensions || null,
    package_characteristics: product.package_characteristics || null,
    is_featured: product.is_featured || false,
    status: product.status || "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
