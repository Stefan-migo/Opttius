/**
 * Unified import service.
 * Handles product import processing (create/update/upsert) with
 * stock management via the update_product_stock RPC.
 */

import { appLogger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { generateSlug } from "./import-mapping";

// ─── Types ─────────────────────────────────────────────────────────────

export interface ImportProduct {
  name: string;
  slug?: string;
  price: number;
  cost_price?: number;
  stock_quantity?: number;
  sku?: string;
  barcode?: string;
  description?: string;
  brand?: string;
  category_id?: string;
  category_name?: string;
  supplier_id?: string;
  tax_rate?: number;
  status?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  image_url?: string;
  image_urls?: string[];
  tags?: string[];
  attributes?: Record<string, string>;
  product_type?: string;
}

export interface ImportResults {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  warnings: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Generate a unique slug by checking the database for conflicts.
 * If the base slug already exists, appends a timestamp to make it unique.
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const baseSlug = generateSlug(name);

  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("slug", baseSlug)
    .maybeSingle();

  if (existing) {
    return `${baseSlug}-${Date.now()}`;
  }

  return baseSlug;
}

/**
 * Resolve a category identifier to a UUID.
 * - If the input is already a UUID, return it as-is
 * - If it matches a category name or slug, return the category id
 * - If not found and a name is provided, create a new category
 * - Returns null if resolution fails
 */
export async function resolveCategoryId(
  category: string,
): Promise<string | null> {
  if (!category) return null;

  const supabase = createServiceRoleClient();

  // UUID format check (basic)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(category)) {
    // Already a UUID — verify it exists
    const { data } = await supabase
      .from("categories")
      .select("id")
      .eq("id", category)
      .maybeSingle();
    return data?.id ?? null;
  }

  // Try by name
  const { data: byName } = await supabase
    .from("categories")
    .select("id")
    .eq("name", category)
    .maybeSingle();
  if (byName) return byName.id;

  // Try by slug
  const slug = generateSlug(category);
  const { data: bySlug } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (bySlug) return bySlug.id;

  // Create a new category
  const { data: created } = await supabase
    .from("categories")
    .insert({ name: category, slug })
    .select("id")
    .single();

  return created?.id ?? null;
}

// ─── Product Processing ────────────────────────────────────────────────

/**
 * Build a product data object from an ImportProduct row, filtering to
 * valid fields for insertion/update.
 */
function buildProductData(
  product: ImportProduct,
  slug: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    name: product.name,
    slug,
    price: product.price,
  };

  if (product.cost_price !== undefined) data.cost_price = product.cost_price;
  if (product.sku !== undefined) data.sku = product.sku;
  if (product.barcode !== undefined) data.barcode = product.barcode;
  if (product.description !== undefined) data.description = product.description;
  if (product.brand !== undefined) data.brand = product.brand;
  if (product.category_id !== undefined) data.category_id = product.category_id;
  if (product.supplier_id !== undefined) data.supplier_id = product.supplier_id;
  if (product.tax_rate !== undefined) data.tax_rate = product.tax_rate;
  if (product.status !== undefined) {
    data.status = product.status;
  } else {
    data.status = "active";
  }
  if (product.weight !== undefined) data.weight = product.weight;
  if (product.length !== undefined) data.length = product.length;
  if (product.width !== undefined) data.width = product.width;
  if (product.height !== undefined) data.height = product.height;
  if (product.image_url !== undefined) data.image_url = product.image_url;
  if (product.image_urls !== undefined) data.image_urls = product.image_urls;
  if (product.tags !== undefined) data.tags = product.tags;
  if (product.attributes !== undefined) data.attributes = product.attributes;
  if (product.product_type !== undefined) {
    data.product_type = product.product_type;
  }

  return data;
}

/**
 * Process products in bulk for import.
 *
 * @param products - Array of ImportProduct rows to process
 * @param mode - Processing mode: "create", "update", or "upsert"
 * @param branchId - Branch ID for stock updates (null to skip stock creation)
 * @returns ImportResults with counts and error/warning details
 */
export async function processProducts(
  products: ImportProduct[],
  mode: "create" | "update" | "upsert",
  branchId?: string | null,
): Promise<ImportResults> {
  const supabase = createServiceRoleClient();
  const results: ImportResults = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const row = i + 1; // 1-indexed for user-facing messages

    try {
      // Validate required fields
      if (!product.name) {
        results.errors.push({
          row,
          message: "Nombre del producto es requerido",
        });
        continue;
      }

      const slug = product.slug || (await generateUniqueSlug(product.name));
      const stockQty = product.stock_quantity ?? 0;

      if (mode === "create") {
        await handleCreate(
          supabase,
          product,
          slug,
          branchId,
          stockQty,
          results,
          row,
        );
      } else if (mode === "update") {
        await handleUpdate(
          supabase,
          product,
          slug,
          branchId,
          stockQty,
          results,
          row,
        );
      } else {
        // upsert
        const existing = await supabase
          .from("products")
          .select("id, slug")
          .or(`slug.eq.${slug},sku.eq.${product.sku || ""}`)
          .maybeSingle();

        if (existing.data) {
          await handleUpdate(
            supabase,
            product,
            slug,
            branchId,
            stockQty,
            results,
            row,
            existing.data.id,
          );
        } else {
          await handleCreate(
            supabase,
            product,
            slug,
            branchId,
            stockQty,
            results,
            row,
          );
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      results.errors.push({ row, message });
    }
  }

  return results;
}

// ─── Internal Handlers ─────────────────────────────────────────────────

async function handleCreate(
  supabase: ReturnType<typeof createServiceRoleClient>,
  product: ImportProduct,
  slug: string,
  branchId: string | null | undefined,
  stockQty: number,
  results: ImportResults,
  row: number,
): Promise<void> {
  const data = buildProductData(product, slug);

  const { data: inserted, error } = await supabase
    .from("products")
    .insert(data)
    .select("id, name, slug")
    .single();

  if (error) {
    // Handle duplicate slug (PG error 23505)
    if (error.code === "23505") {
      results.errors.push({
        row,
        message: `Producto con slug '${slug}' ya existe`,
      });
      results.skipped++;
      return;
    }
    throw error;
  }

  // Create stock entry if branch is provided
  if (branchId && inserted) {
    await supabase.rpc("update_product_stock", {
      p_product_id: inserted.id,
      p_branch_id: branchId,
      p_quantity_change: stockQty,
    });
  }

  results.created++;
}

async function handleUpdate(
  supabase: ReturnType<typeof createServiceRoleClient>,
  product: ImportProduct,
  slug: string,
  branchId: string | null | undefined,
  stockQty: number,
  results: ImportResults,
  row: number,
  existingId?: string,
): Promise<void> {
  // Find existing product by slug
  let existingIdToUse = existingId;

  if (!existingIdToUse) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!existing) {
      results.warnings.push(
        `Producto '${product.name}' no encontrado. Usa mode=upsert para crearlo.`,
      );
      results.skipped++;
      return;
    }
    existingIdToUse = existing.id;
  }

  // Update the product
  const data = buildProductData(product, slug);
  await supabase.from("products").update(data).eq("id", existingIdToUse);

  // Differential stock update if branch is provided
  if (branchId) {
    await supabase.rpc("update_product_stock", {
      p_product_id: existingIdToUse,
      p_branch_id: branchId,
      p_quantity_change: stockQty,
    });
  }

  results.updated++;
}
