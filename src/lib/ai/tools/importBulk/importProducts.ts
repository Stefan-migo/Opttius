import type { Database, SupabaseClient } from "@/types/supabase";

import type { ToolResult } from "../types";

export async function executeProductImport(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  branchId: string | null,
  headers: string[],
  rows: Record<string, string | number | null>[],
  columnMapping: Record<string, string>,
  currency: string,
): Promise<ToolResult> {
  let imported = 0;
  const failed: Array<{ row: number; error: string }> = [];

  // Resolve column key: mapping key may differ by case/trim from actual header
  const resolveVal = (
    row: Record<string, string | number | null>,
    fileCol: string,
  ): string | number | null => {
    const normalized = String(fileCol || "")
      .trim()
      .toLowerCase();
    const match = headers.find(
      (h) =>
        String(h || "")
          .trim()
          .toLowerCase() === normalized,
    );
    return match != null ? (row[match] ?? null) : null;
  };

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const mapped: Record<string, unknown> = {};
      for (const [fileCol, opttiusField] of Object.entries(columnMapping)) {
        const val = resolveVal(row, fileCol);
        if (val !== null && val !== undefined && String(val).trim()) {
          mapped[opttiusField] = String(val).trim();
        }
      }

      const name = (mapped.name as string) || (mapped.nombre as string) || "Producto";
      const price = parseFloat((mapped.price as string) || (mapped.precio as string) || "0") || 0;

      const slug =
        name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || `product-${Date.now()}`;

      const { data: insertedProduct, error } = await supabase
        .from("products")
        // @ts-expect-error — Supabase insert shape is dynamic for bulk import
        .insert({
          organization_id: organizationId,
          branch_id: branchId || null,
          name,
          price,
          currency: currency || "CLP",
          description: mapped.description || null,
          slug,
          status: "draft",
          inventory_quantity:
            parseInt((mapped.inventory_quantity as string) || "0", 10) || 0,
        })
        .select("id")
        .single();

      if (error) {
        failed.push({ row: i + 2, error: error.message });
      } else {
        imported++;
        // Create product_branch_stock when branch is specified
        const qty = parseInt((mapped.inventory_quantity as string) || "0", 10) || 0;
        if (branchId && insertedProduct?.id) {
          const now = new Date().toISOString();
          await supabase.from("product_branch_stock").upsert(
            {
              product_id: insertedProduct.id,
              branch_id: branchId,
              quantity: qty,
              reserved_quantity: 0,
              low_stock_threshold: 5,
              created_at: now,
              updated_at: now,
            },
            { onConflict: "product_id, branch_id" },
          );
        }
      }
    } catch (e: unknown) {
      failed.push({
        row: i + 2,
        error: e instanceof Error ? e.message : "Validation error",
      });
    }
  }

  return {
    success: true,
    data: {
      imported,
      failed: failed.length,
      errors: failed.slice(0, 10),
    },
    message: `Imported ${imported} products. ${failed.length} failed.`,
  };
}
