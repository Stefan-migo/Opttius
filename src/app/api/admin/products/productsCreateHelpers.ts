/**
 * Product Creation Helpers
 * Extracted data construction and stock handling for product creation
 */
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/inventory/constants";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const VALID_PRODUCT_COLUMNS = [
  "name", "slug", "description", "short_description", "price", "compare_at_price",
  "cost_price", "price_includes_tax", "category_id", "branch_id", "status",
  "featured_image", "gallery", "tags", "is_featured", "published_at",
  "product_type", "optical_category", "sku", "barcode", "brand", "manufacturer",
  "model_number", "frame_type", "frame_material", "frame_shape", "frame_color",
  "frame_size", "lens_type", "lens_material", "weight", "dimensions",
  "package_characteristics", "shelf_life_months", "video_url", "meta_title",
  "meta_description", "search_keywords", "collections", "vendor", "currency",
  "track_inventory", "created_at", "updated_at",
];

export function buildProductPayload(
  validatedBody: Record<string, unknown>,
  body: Record<string, unknown>,
  productBranchId: string | null,
  organizationId: string,
  slug?: string,
): Record<string, unknown> {
  if (!slug) {
    slug = validatedBody.slug?.trim() || validatedBody.name.toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `product-${Date.now()}`;
  }

  const productData: Record<string, unknown> = {
    name: validatedBody.name.trim(),
    slug,
    description: validatedBody.description || null,
    short_description: validatedBody.short_description || null,
    price: typeof validatedBody.price === "number" ? validatedBody.price : parseFloat(String(validatedBody.price)),
    compare_at_price: validatedBody.compare_at_price || null,
    cost_price: validatedBody.cost_price || null,
    price_includes_tax: validatedBody.price_includes_tax ?? false,
    category_id: validatedBody.category_id || null,
    branch_id: productBranchId,
    status: validatedBody.status || "draft",
    featured_image: validatedBody.featured_image || null,
    gallery: validatedBody.gallery || [],
    tags: validatedBody.tags || [],
    is_featured: validatedBody.is_featured || false,
    published_at: validatedBody.published_at || (validatedBody.status === "active" ? new Date().toISOString() : null),
    product_type: validatedBody.product_type || "frame",
    optical_category: validatedBody.optical_category || null,
    sku: validatedBody.sku || null,
    barcode: validatedBody.barcode || null,
    brand: validatedBody.brand || null,
    manufacturer: validatedBody.manufacturer || null,
    model_number: validatedBody.model_number || null,
    frame_type: validatedBody.frame_type || null,
    frame_material: validatedBody.frame_material || null,
    frame_shape: validatedBody.frame_shape || null,
    frame_color: validatedBody.frame_color || null,
    frame_size: validatedBody.frame_size || null,
    lens_type: validatedBody.lens_type || null,
    lens_material: validatedBody.lens_material || null,
    frame_colors: body.frame_colors || [],
    frame_brand: body.frame_brand || null,
    frame_model: body.frame_model || null,
    frame_sku: body.frame_sku || null,
    frame_gender: body.frame_gender || null,
    frame_age_group: body.frame_age_group || null,
    frame_features: body.frame_features || [],
    frame_measurements: body.frame_measurements || null,
    lens_index: body.lens_index ? parseFloat(body.lens_index) : null,
    lens_coatings: body.lens_coatings || [],
    lens_tint_options: body.lens_tint_options || [],
    uv_protection: body.uv_protection || null,
    blue_light_filter: body.blue_light_filter || false,
    blue_light_filter_percentage: body.blue_light_filter_percentage ? parseInt(body.blue_light_filter_percentage) : null,
    photochromic: body.photochromic || false,
    prescription_available: body.prescription_available || false,
    prescription_range: body.prescription_range || null,
    requires_prescription: body.requires_prescription || false,
    is_customizable: body.is_customizable || false,
    warranty_months: body.warranty_months ? parseInt(body.warranty_months) : null,
    warranty_details: body.warranty_details || null,
  };

  // Add optional fields
  if (body.weight != null && body.weight !== "") productData.weight = parseFloat(body.weight) || null;
  if (body.dimensions != null && typeof body.dimensions === "object") productData.dimensions = body.dimensions;
  if (body.shelf_life_months != null) productData.shelf_life_months = parseInt(String(body.shelf_life_months)) || null;
  if (body.sku != null && body.sku !== "") productData.sku = body.sku;
  if (body.barcode != null && body.barcode !== "") productData.barcode = body.barcode;
  if (body.video_url != null && body.video_url !== "") productData.video_url = body.video_url;
  if (body.meta_title != null && body.meta_title !== "") productData.meta_title = body.meta_title;
  if (body.meta_description != null && body.meta_description !== "") productData.meta_description = body.meta_description;
  if (body.search_keywords != null && Array.isArray(body.search_keywords)) productData.search_keywords = body.search_keywords;
  if (body.collections != null && Array.isArray(body.collections)) productData.collections = body.collections;
  if (body.vendor != null && body.vendor !== "") productData.vendor = body.vendor;
  if (body.package_characteristics != null && body.package_characteristics !== "") productData.package_characteristics = body.package_characteristics;

  // Filter to valid columns only
  const filtered: Record<string, unknown> = {};
  Object.keys(productData).forEach((key) => {
    if (VALID_PRODUCT_COLUMNS.includes(key)) {
      let val = productData[key];
      if (typeof val === "string" && val.trim() === "") val = null;
      filtered[key] = val;
    } else {
      logger.debug(`Skipping invalid product column: ${key}`);
    }
  });
  filtered.organization_id = organizationId;
  return filtered;
}

export async function handleProductStock(
  createdProduct: Record<string, unknown>,
  body: Record<string, unknown>,
  productBranchId: string | null,
  branchContext: { isSuperAdmin: boolean },
  organizationId: string,
): Promise<void> {
  const stockQty = parseInt(String(body.stock_quantity)) || 0;
  const lowStockThreshold = body.low_stock_threshold !== undefined
    ? parseInt(String(body.low_stock_threshold)) || DEFAULT_LOW_STOCK_THRESHOLD
    : DEFAULT_LOW_STOCK_THRESHOLD;

  if (productBranchId && (body.stock_quantity !== undefined || body.low_stock_threshold !== undefined)) {
    const svc = createServiceRoleClient();
    if (stockQty > 0) {
      const { error: stockError } = await svc.rpc("update_product_stock", {
        p_product_id: createdProduct.id, p_branch_id: productBranchId,
        p_quantity_change: stockQty, p_reserve: false,
      });
      if (stockError) {
        logger.error("Error creating product stock", stockError);
        const { error: fallbackError } = await svc.from("product_branch_stock").upsert(
          { product_id: createdProduct.id, branch_id: productBranchId, quantity: stockQty, reserved_quantity: 0, low_stock_threshold: lowStockThreshold },
          { onConflict: "product_id,branch_id" },
        );
        if (fallbackError) logger.error("Error in fallback stock creation", fallbackError);
      }
    }
    if (lowStockThreshold !== DEFAULT_LOW_STOCK_THRESHOLD || stockQty === 0) {
      const { error: thresholdError } = await svc.from("product_branch_stock").upsert(
        { product_id: createdProduct.id, branch_id: productBranchId, quantity: stockQty, reserved_quantity: 0, low_stock_threshold: lowStockThreshold },
        { onConflict: "product_id,branch_id" },
      );
      if (thresholdError) logger.warn("Could not set low_stock_threshold", { productId: createdProduct.id, branchId: productBranchId, error: thresholdError });
    }
  }

  // Super admin global view: create stock for all org branches
  // ponytail: this branch is now unreachable via product create — the route 400s for
  // global super admins without a branch (customersCreateService mirror). Keep until
  // the org-wide contract is revisited or the branch is removed.
  if (!productBranchId && branchContext.isSuperAdmin) {
    const svc = createServiceRoleClient();
    const { data: orgBranches } = await svc.from("branches").select("id").eq("organization_id", organizationId);
    if (orgBranches && orgBranches.length > 0) {
      const threshold = body.low_stock_threshold !== undefined
        ? parseInt(String(body.low_stock_threshold)) || DEFAULT_LOW_STOCK_THRESHOLD
        : DEFAULT_LOW_STOCK_THRESHOLD;
      for (const branch of orgBranches) {
        const { error: insertError } = await svc.from("product_branch_stock").upsert(
          { product_id: createdProduct.id, branch_id: branch.id, quantity: 0, reserved_quantity: 0, low_stock_threshold: threshold },
          { onConflict: "product_id,branch_id" },
        );
        if (insertError) logger.warn("Could not create stock for branch (org-wide product)", { productId: createdProduct.id, branchId: branch.id, error: insertError });
      }
    }
  }
}
