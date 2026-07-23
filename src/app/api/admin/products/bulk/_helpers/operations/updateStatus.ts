/**
 * Bulk products API — Update status operation handler.
 *
 * @module app/api/admin/products/bulk/_helpers/operations/updateStatus
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function handleUpdateStatus(
  supabase: SupabaseClient,
  product_ids: string[],
  updates: Record<string, unknown>,
): Promise<unknown[] | NextResponse> {
  if (!updates.status) {
    return NextResponse.json(
      { error: "Status is required" },
      { status: 400 },
    );
  }

  const { data: statusUpdated, error: statusError } = await supabase
    .from("products")
    .update({
      status: updates.status as string,
      updated_at: new Date().toISOString(),
    })
    .in("id", product_ids)
    .select("id, name, status")
    .returns<{ id: string; name: string; status: string }[]>();

  if (statusError) {
    throw statusError;
  }
  return statusUpdated ?? [];
}
