/**
 * Admin Product Service
 * Server-side business logic for product operations by ID
 */
import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { DEFAULT_LOW_STOCK_THRESHOLD, getProductStock, updateProductStock } from "@/lib/inventory/stock-helpers";
import { createClientFromRequest, createServiceRoleClient } from "@/utils/supabase/server";

function generateSlug(name: string): string {
  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || `product-${Date.now()}`;
}

function buildProductData(body: Record<string, unknown>, slug: string): Record<string, unknown> {
  return {
    name: (body.name as string).trim(),
    slug,
    description: (body.description as string | undefined) ?? null,
    short_description: (body.short_description as string | undefined) ?? null,
    price: parseFloat(body.price as string),
    price_includes_tax: body.price_includes_tax === true || body.price_includes_tax === "true",
    compare_at_price: body.compare_at_price ? parseFloat(body.compare_at_price as string) : null,
    cost_price: body.cost_price ? parseFloat(body.cost_price as string) : null,
    category_id: (body.category_id as string | undefined) ?? null,
    status: (body.status as string) || "draft",
    featured_image: (body.featured_image as string | undefined) ?? null,
    gallery: body.gallery || [],
    tags: (body.tags as string[]) || [],
    product_type: (body.product_type as string) || "frame",
    optical_category: (body.optical_category as string | undefined) ?? null,
    sku: (body.sku as string | undefined) ?? null,
    barcode: (body.barcode as string | undefined) ?? null,
    brand: (body.brand as string | undefined) ?? null,
    manufacturer: (body.manufacturer as string | undefined) ?? null,
    model_number: (body.model_number as string | undefined) ?? null,
    frame_type: (body.frame_type as string | undefined) ?? null,
    frame_material: (body.frame_material as string | undefined) ?? null,
    frame_shape: (body.frame_shape as string | undefined) ?? null,
    frame_color: (body.frame_color as string | undefined) ?? null,
    frame_colors: (body.frame_colors as string[]) || [],
    frame_brand: (body.frame_brand as string | undefined) ?? null,
    frame_model: (body.frame_model as string | undefined) ?? null,
    frame_sku: (body.frame_sku as string | undefined) ?? null,
    frame_gender: (body.frame_gender as string | undefined) ?? null,
    frame_age_group: (body.frame_age_group as string | undefined) ?? null,
    frame_size: (body.frame_size as string | undefined) ?? null,
    frame_features: (body.frame_features as string[]) || [],
    frame_measurements: (body.frame_measurements as string | undefined) ?? null,
    lens_type: (body.lens_type as string | undefined) ?? null,
    lens_material: (body.lens_material as string | undefined) ?? null,
    lens_index: body.lens_index ? parseFloat(body.lens_index as string) : null,
    lens_coatings: (body.lens_coatings as string[]) || [],
    lens_tint_options: (body.lens_tint_options as string[]) || [],
    uv_protection: (body.uv_protection as string | undefined) ?? null,
    blue_light_filter: (body.blue_light_filter as boolean) || false,
    blue_light_filter_percentage: body.blue_light_filter_percentage ? parseInt(body.blue_light_filter_percentage as string) : null,
    photochromic: (body.photochromic as boolean) || false,
    prescription_available: (body.prescription_available as boolean) || false,
    prescription_range: (body.prescription_range as string | undefined) ?? null,
    requires_prescription: (body.requires_prescription as boolean) || false,
    is_customizable: (body.is_customizable as boolean) || false,
    warranty_months: body.warranty_months ? parseInt(body.warranty_months as string) : null,
    warranty_details: (body.warranty_details as string | undefined) ?? null,
    is_featured: (body.is_featured as boolean) || false,
    updated_at: new Date().toISOString(),
    weight: body.weight !== undefined && body.weight !== null && body.weight !== "" ? parseFloat(body.weight as string) || undefined : undefined,
    dimensions: body.dimensions !== undefined && body.dimensions !== null && typeof body.dimensions === "object" ? body.dimensions as Record<string, unknown> : undefined,
    package_characteristics: (body.package_characteristics as Record<string, unknown> | undefined) ?? undefined,
    usage_instructions: (body.usage_instructions as string | undefined) ?? undefined,
    precautions: (body.precautions as string | undefined) ?? undefined,
    certifications: (body.certifications as string | undefined) ?? undefined,
    published_at: body.published_at !== undefined ? body.published_at as string : undefined,
  };
}

export async function getProduct(request: NextRequest, id: string) {
  const { client: supabase, getUser } = await createClientFromRequest(request);
  const { data, error: userError } = await getUser();
  const user = data?.user as { id: string } | null;
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminUserRes = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single();
  const userOrganizationId = adminUserRes.data?.organization_id;
  const branchContext = await getBranchContext(request, user.id, supabase as never);
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
  // ponytail: ParserError from complex join select; keep as unknown until select is fixed
  const p = product as unknown;
  if (userOrganizationId && !branchContext.isSuperAdmin && p.organization_id !== userOrganizationId) {
    return NextResponse.json({ error: "Forbidden: You don't have access to this product" }, { status: 403 });
  }

  // Filter stock by branch
  if (currentBranchId && p.product_branch_stock) {
    if (Array.isArray(p.product_branch_stock)) {
      const filteredStock = p.product_branch_stock.filter((s: unknown) => s?.branch_id === currentBranchId);
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

  const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
  if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const adminUserRes = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single();
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
  let checkQuery = supabase.from("products").select("id, organization_id").eq("id", id);
  if (userOrganizationId) {
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { user_id: user.id });
    if (!isSuperAdmin) checkQuery = checkQuery.eq("organization_id", userOrganizationId);
  }
  const { data: existingProduct, error: checkError } = await checkQuery.single();
  if (checkError || !existingProduct) {
    return NextResponse.json({ error: checkError?.code === "PGRST116" ? "Product not found" : "Forbidden: You don't have access to this product" }, { status: checkError?.code === "PGRST116" ? 404 : 403 });
  }

  // Update
  let updateQuery = supabase.from("products").update(productData).eq("id", id);
  if (userOrganizationId) {
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { user_id: user.id });
    if (!isSuperAdmin) updateQuery = updateQuery.eq("organization_id", userOrganizationId);
  }
  let { data: updatedProduct, error } = await updateQuery.select().single();

  if (error && error.code === "42501") {
    const serviceSupabase = createServiceRoleClient();
    let serviceQuery = serviceSupabase.from("products").update(productData).eq("id", id);
    if (userOrganizationId) {
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { user_id: user.id });
      if (!isSuperAdmin) serviceQuery = serviceQuery.eq("organization_id", userOrganizationId);
    }
    const { data: srData, error: srError } = await serviceQuery.select().single();
    updatedProduct = srData;
    error = srError;
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

  const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
  if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const adminUserRes = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single();
  const userOrganizationId = adminUserRes.data?.organization_id;

  let deleteQuery = supabase.from("products").delete().eq("id", id);
  if (userOrganizationId) {
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { user_id: user.id });
    if (!isSuperAdmin) deleteQuery = deleteQuery.eq("organization_id", userOrganizationId);
  }
  let { error } = await deleteQuery;

  if (error && error.code === "42501") {
    const serviceSupabase = createServiceRoleClient();
    ({ error } = await serviceSupabase.from("products").delete().eq("id", id));
  }
  if (error) return NextResponse.json({ error: error.message || "Failed to delete product" }, { status: 500 });

  return NextResponse.json({ success: true });
}
