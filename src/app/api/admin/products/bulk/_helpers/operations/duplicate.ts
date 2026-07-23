/**
 * Bulk products API — Duplicate operation handler.
 *
 * @module app/api/admin/products/bulk/_helpers/operations/duplicate
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export async function handleDuplicate(
  supabase: SupabaseClient,
  product_ids: string[],
): Promise<unknown[]> {
  // Get products to duplicate
  const { data: productsToDuplicate, error: duplicatesFetchError } =
    await supabase.from("products").select("*").in("id", product_ids);

  if (duplicatesFetchError) {
    throw duplicatesFetchError;
  }

  // Create duplicates
  const duplicatePromises =
    productsToDuplicate?.map((product: Record<string, unknown>) => {
      const duplicateProduct: Record<string, unknown> = {
        ...product,
        id: undefined, // Let Supabase generate new ID
        name: `${product.name} (Copia)`,
        slug: `${product.slug}-copy-${Date.now()}`,
        status: "draft",
        // inventory_quantity removed - stock managed in product_branch_stock
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return supabase
        .from("products")
        .insert(duplicateProduct)
        .select("id, name, status");
    }) || [];

  const duplicateResults = await Promise.all(duplicatePromises);
  return duplicateResults
    .map((result) => result.data?.[0])
    .filter(Boolean) as unknown[];
}
