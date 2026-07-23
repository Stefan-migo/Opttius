/**
 * Bulk products API — Update category operation handler.
 *
 * @module app/api/admin/products/bulk/_helpers/operations/updateCategory
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function handleUpdateCategory(
  supabase: SupabaseClient,
  product_ids: string[],
  updates: Record<string, unknown>,
): Promise<unknown[] | NextResponse> {
  if (!updates.category_id) {
    return NextResponse.json(
      { error: "Category ID is required" },
      { status: 400 },
    );
  }

  const { data: categoryUpdated, error: categoryError } = await supabase
    .from("products")
    .update({
      category_id: updates.category_id as string,
      updated_at: new Date().toISOString(),
    })
    .in("id", product_ids)
    .select("id, name, category_id")
    .returns<{ id: string; name: string; category_id: string | null }[]>();

  if (categoryError) {
    throw categoryError;
  }
  return categoryUpdated ?? [];
}
