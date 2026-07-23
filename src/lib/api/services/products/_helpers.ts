import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger as logger } from "@/lib/logger";
import type { Database } from "@/types/supabase";

export function buildProductSelectString(branchId?: string): string {
  let s = `*, categories:category_id (id, name, slug), product_variants (id, title, price, inventory_quantity, option1, option2, option3, is_default)`;
  if (branchId) s += `, product_branch_stock (quantity, reserved_quantity, low_stock_threshold, branch_id)`;
  return s;
}

export function applyProductFilters(
  query: ReturnType<SupabaseClient<Database>["from"]>, params: Record<string, any>,
): ReturnType<SupabaseClient<Database>["from"]> {
  const { category, skinType, minPrice, maxPrice, featured, status, includeArchived, search, branchId } = params;
  let q = query;
  if (category) q = q.eq("category_id", category);
  if (skinType) q = q.contains("skin_type", [skinType]);
  if (minPrice) q = q.gte("price", parseFloat(minPrice));
  if (maxPrice) q = q.lte("price", parseFloat(maxPrice));
  if (featured) q = q.eq("featured", featured === "true");
  if (status && status !== "all") q = q.eq("status", status);
  if (!includeArchived) q = q.neq("status", "archived");
  if (search) {
    const srch = `%${search}%`;
    q = q.or(`name.ilike.${srch},description.ilike.${srch},sku.ilike.${srch}`);
  }
  return q;
}

export function validateSortColumn(sortBy: string): string {
  const valid = ["created_at", "updated_at", "name", "price", "sku", "status", "featured", "inventory_quantity"];
  return valid.includes(sortBy) ? sortBy : "created_at";
}

export function filterProductsByBranch(products: any[], branchId: string): any[] {
  return products.filter((p) => !p.branch_id || p.branch_id === branchId);
}

export function filterLowStockProducts(products: any[], branchId?: string | null): any[] {
  return products.filter((p) => {
    if (branchId && p.product_branch_stock) {
      const bs = p.product_branch_stock.find((s: any) => s.branch_id === branchId);
      return bs ? bs.quantity <= bs.low_stock_threshold : false;
    }
    return false;
  });
}

export function filterInStockProducts(products: any[], branchId?: string | null): any[] {
  return products.filter((p) => {
    if (branchId && p.product_branch_stock) {
      const bs = p.product_branch_stock.find((s: any) => s.branch_id === branchId);
      return bs ? bs.quantity > 0 : false;
    }
    return false;
  });
}

export function filterOutOfStockProducts(products: any[], branchId?: string | null): any[] {
  return products.filter((p) => {
    if (branchId && p.product_branch_stock) {
      const bs = p.product_branch_stock.find((s: any) => s.branch_id === branchId);
      return bs ? bs.quantity <= 0 : true;
    }
    return true;
  });
}

export function generateSlug(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `product-${Date.now()}`;
}

export async function ensureUniqueSlug(supabase: SupabaseClient<Database>, slug: string, excludeId?: string): Promise<string> {
  let uniqueSlug = slug;
  let counter = 1;
  while (true) {
    let query = supabase.from("products").select("id").eq("slug", uniqueSlug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data: existing } = await query.limit(1);
    if (!existing || existing.length === 0) break;
    uniqueSlug = `${slug}-${counter++}`;
  }
  return uniqueSlug;
}
