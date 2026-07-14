/**
 * Admin Product Service
 * Server-side business logic for product operations by ID
 */
import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { DEFAULT_LOW_STOCK_THRESHOLD, getProductStock, updateProductStock } from "@/lib/inventory/stock-helpers";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest, createServiceRoleClient } from "@/utils/supabase/server";

function generateSlug(name: string): string {
  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || `product-${Date.now()}`;
}

function buildProductData(body: any, slug: string): Record<string, any> {
  return {
    name: body.name.trim(),
    slug,
    description: body.description || null,
    short_description: body.short_description || null,
    price: parseFloat(body.price),
    price_includes_tax: body.price_includes_tax === true || body.price_includes_tax === "true",
    compare_at_price: body.compare_at_price ? parseFloat(body.compare_at_price) : null,
    cost_price: body.cost_price ? parseFloat(body.cost_price) : null,
    category_id: body.category_id || null,
    status: body.status || "draft",
    featured_image: body.featured_image || null,
    gallery: body.gallery || [],
    tags: body.tags || [],
    product_type: body.product_type || "frame",
    optical_category: body.optical_category || null,
    sku: body.sku || null,
    barcode: body.barcode || null,
    brand: body.brand || null,
    manufacturer: body.manufacturer || null,
    model_number: body.model_number || null,
    frame_type: body.frame_type || null,
    frame_material: body.frame_material || null,
    frame_shape: body.frame_shape || null,
    frame_color: body.frame_color || null,
    frame_colors: body.frame_colors || [],
    frame_brand: body.frame_brand || null,
    frame_model: body.frame_model || null,
    frame_sku: body.frame_sku || null,
    frame_gender: body.frame_gender || null,
    frame_age_group: body.frame_age_group || null,
    frame_size: body.frame_size || null,
    frame_features: body.frame_features || [],
    frame_measurements: body.frame_measurements || null,
    lens_type: body.lens_type || null,
    lens_material: body.lens_material || null,
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
    is_featured: body.is_featured || false,
    updated_at: new Date().toISOString(),
    weight: body.weight !== undefined && body.weight !== null && body.weight !== "" ? parseFloat(body.weight) || undefined : undefined,
    dimensions: body.dimensions !== undefined && body.dimensions !== null && typeof body.dimensions === "object" ? body.dimensions : undefined,
    package_characteristics: body.package_characteristics || undefined,
    usage_instructions: body.usage_instructions || undefined,
    precautions: body.precautions || undefined,
    certifications: body.certifications || undefined,
    published_at: body.published_at !== undefined ? body.published_at : undefined,
  };
}

export async function getProduct(request: NextRequest, id: string) {
  const { client: supabase, getUser } = await createClientFromRequest(request);
  const authResult = await getUser() as any;
  const user = authResult?.data?.user ?? null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminUserRes = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single() as any;
  const userOrganizationId = adminUserRes.data?.organization_id;
  const branchContext = await getBranchContext(request, user.id, supabase as any);
  const includeArchived = new URL(request.url).searchParams.get("include_archived") === "true";
  const currentBranchId = branchContext?.branchId;

  let query = supabase
    .from("products")
    .select(currentBranchId ? `*, product_branch_stock ( quantity, reserved_quantity, low_stock_threshold, branch_id )` : "*")
    .eq("id", id);

  if (userOrganizationId && !branchContext.isSuperAdmin) query = query.eq("organization_id", userOrganizationId);
  if (!includeArchived) query = query.neq("status", "archived");

  const { data: product, error } = await query.single();
  if (error || !product) {
    const status = error?.code === "PGRST116" ? 404 : 404;
    return NextResponse.json({ error: "Product not found" }, { status });
  }

  // Multi-tenancy safety check
  const p = product as any;
  if (userOrganizationId && !branchContext.isSuperAdmin && p.organization_id !== userOrganizationId) {
    return NextResponse.json({ error: "Forbidden: You don't have access to this product" }, { status: 403 });
  }

  // Filter stock by branch
  if (currentBranchId && p.product_branch_stock) {
    if (Array.isArray(p.product_branch_stock)) {
      const filteredStock = p.product_branch_stock.filter((s: any) => s?.branch_id === currentBranchId);
      p.product_branch_stock = filteredStock.length > 0 ? filteredStock : null;
    } else if (p.product_branch_stock.branch_id !== currentBranchId) {
      p.product_branch_stock = null;
    }
  }

  // Fetch default stock if missing
  if (currentBranchId && !p.product_branch_stock) {
    const stock = await getProductStock(id, currentBranchId, supabase);
    p.product_branch_stock = stock
      ? [stock]
      : [{ quantity: 0, reserved_quantity: 0, low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD, branch_id: currentBranchId }];
  }

  return NextResponse.json({ product: p });
}

export async function updateProduct(request: NextRequest, id: string) {
  const { client: supabase, getUser } = await createClientFromRequest(request);
  const { data, error: userError } = await getUser();
  const user = data?.user as { id: string } | null;
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id } as any);
  if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const adminUserRes = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single() as any;
  const userOrganizationId = adminUserRes.data?.organization_id;
  const body = await request.json();

  // Validation
  if (!body.name?.trim()) return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  if (body.price === undefined || body.price === null || isNaN(parseFloat(body.price))) {
    return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
  }

  // Stock requires branch
  if (body.stock_quantity !== undefined || body.low_stock_threshold !== undefined) {
    const branchContext = await getBranchContext(request, user.id);
    const branchId = branchContext.branchId || body.branch_id;
    if (!branchId) {
      return NextResponse.json({ error: "No se puede modificar el stock en vista global. Selecciona una sucursal para actualizar el inventario de esa sucursal.", code: "STOCK_REQUIRES_BRANCH" }, { status: 400 });
    }
  }

  // Generate slug
  let slug = body.slug?.trim();
  if (!slug) slug = generateSlug(body.name);
  const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).neq("id", id).limit(1);
  if (existing && existing.length > 0) slug = `${slug}-${Date.now()}`;

  const productData = buildProductData(body, slug);

  // Verify access
  let checkQuery: any = supabase.from("products").select("id, organization_id").eq("id", id).single();
  if (userOrganizationId) {
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { user_id: user.id }) as any;
    if (!isSuperAdmin) checkQuery = checkQuery.eq("organization_id", userOrganizationId);
  }
  const { data: existingProduct, error: checkError } = await checkQuery as any;
  if (checkError || !existingProduct) {
    return NextResponse.json({ error: checkError?.code === "PGRST116" ? "Product not found" : "Forbidden: You don't have access to this product" }, { status: checkError?.code === "PGRST116" ? 404 : 403 });
  }

  // Update
  let updateQuery = supabase.from("products").update(productData).eq("id", id);
  if (userOrganizationId) {
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { user_id: user.id }) as any;
    if (!isSuperAdmin) updateQuery = updateQuery.eq("organization_id", userOrganizationId);
  }
  let { data: updatedProduct, error } = await updateQuery.select().single() as any;

  if (error && error.code === "42501") {
    const serviceSupabase = createServiceRoleClient();
    let serviceQuery = serviceSupabase.from("products").update(productData).eq("id", id);
    if (userOrganizationId) {
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { user_id: user.id }) as any;
      if (!isSuperAdmin) serviceQuery = serviceQuery.eq("organization_id", userOrganizationId);
    }
    const serviceResult = await serviceQuery.select().single() as any;
    updatedProduct = serviceResult.data;
    error = serviceResult.error;
  }
  if (error) return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 });

  // Handle stock update
  if ((body.stock_quantity !== undefined || body.low_stock_threshold !== undefined) && updatedProduct) {
    const branchContext = await getBranchContext(request, user.id);
    const branchId = branchContext.branchId || body.branch_id;
    if (!branchId) {
      return NextResponse.json({ error: "No se puede modificar el stock en vista global.", code: "STOCK_REQUIRES_BRANCH" }, { status: 400 });
    }
    const serviceSupabase = createServiceRoleClient();

    if (body.stock_quantity !== undefined) {
      const stockQty = parseInt(String(body.stock_quantity)) || 0;
      const currentStock = await getProductStock(id, branchId, serviceSupabase);
      const qtyChange = stockQty - (currentStock?.quantity || 0);
      if (qtyChange !== 0) {
        const stockResult = await updateProductStock(id, branchId, qtyChange, false, serviceSupabase);
        if (!stockResult.success) {
          return NextResponse.json({ product: updatedProduct, warning: "El producto se actualizó, pero hubo un error al actualizar el stock" });
        }
      }
    }

    if (body.low_stock_threshold !== undefined) {
      const threshold = parseInt(String(body.low_stock_threshold)) || 5;
      const currentStock = await getProductStock(id, branchId, serviceSupabase);
      if (currentStock) {
        await serviceSupabase.from("product_branch_stock").update({ low_stock_threshold: threshold }).eq("product_id", id).eq("branch_id", branchId);
      } else {
        await serviceSupabase.from("product_branch_stock").insert({ product_id: id, branch_id: branchId, quantity: 0, reserved_quantity: 0, low_stock_threshold: threshold });
      }
    }
  }

  return NextResponse.json({ product: updatedProduct });
}

export async function deleteProduct(request: NextRequest, id: string) {
  const { client: supabase, getUser } = await createClientFromRequest(request);
  const { data, error: userError } = await getUser();
  const user = data?.user as { id: string } | null;
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id } as any);
  if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const adminUserRes = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single() as any;
  const userOrganizationId = adminUserRes.data?.organization_id;

  let deleteQuery = supabase.from("products").delete().eq("id", id);
  if (userOrganizationId) {
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { user_id: user.id }) as any;
    if (!isSuperAdmin) deleteQuery = deleteQuery.eq("organization_id", userOrganizationId);
  }
  let { error } = await deleteQuery as any;

  if (error && error.code === "42501") {
    const serviceSupabase = createServiceRoleClient();
    ({ error } = await serviceSupabase.from("products").delete().eq("id", id) as any);
  }
  if (error) return NextResponse.json({ error: error.message || "Failed to delete product" }, { status: 500 });

  return NextResponse.json({ success: true });
}
