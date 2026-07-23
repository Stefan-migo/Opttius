/**
 * Bulk products API — Update pricing operation handler.
 *
 * @module app/api/admin/products/bulk/_helpers/operations/updatePricing
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function handleUpdatePricing(
  supabase: SupabaseClient,
  product_ids: string[],
  updates: Record<string, unknown>,
): Promise<unknown[] | NextResponse> {
  if (!updates.price_adjustment) {
    return NextResponse.json(
      { error: "Price adjustment is required" },
      { status: 400 },
    );
  }

  // Get current products to calculate new prices
  const { data: currentProducts, error: fetchError } = await supabase
    .from("products")
    .select("id, price")
    .in("id", product_ids)
    .returns<{ id: string; price: number }[]>();

  if (fetchError) {
    throw fetchError;
  }

  // Calculate new prices based on adjustment
  const priceUpdates =
    currentProducts?.map((product) => {
      let newPrice = product.price;

      if (updates.adjustment_type === "percentage") {
        newPrice = product.price * (1 + Number(updates.price_adjustment) / 100);
      } else if (updates.adjustment_type === "fixed") {
        newPrice = product.price + Number(updates.price_adjustment);
      }

      return {
        id: product.id,
        price: Math.max(0, newPrice), // Ensure price doesn't go below 0
      };
    }) || [];

  // Update prices
  const priceUpdatePromises = priceUpdates.map(({ id, price }) =>
    supabase
      .from("products")
      .update({
        price,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, name, price"),
  );

  const priceResults = await Promise.all(priceUpdatePromises);
  return priceResults
    .map((result) => result.data?.[0])
    .filter(Boolean) as unknown[];
}
