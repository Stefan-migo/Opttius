import { NextRequest, NextResponse } from "next/server";
import {
  createClientFromRequest,
  createServiceRoleClient,
} from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { getBranchContext } from "@/lib/api/branch-middleware";
import {
  getProductStock,
  updateProductStock,
} from "@/lib/inventory/stock-helpers";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check authentication for branch context
    const { data, error: userError } = await getUser();
    const user = data?.user;

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization_id for filtering
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = adminUser
      ? (adminUser as { organization_id?: string }).organization_id
      : undefined;

    const branchContext = await getBranchContext(request, user.id, supabase);

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("include_archived") === "true";

    // Build query - include stock if branch is selected
    const currentBranchId = branchContext?.branchId;
    // Note: We can't filter nested relations directly in Supabase, so we'll filter in post-processing
    let query = supabase
      .from("products")
      .select(
        currentBranchId
          ? `
          *,
          product_branch_stock (
            quantity,
            reserved_quantity,
            low_stock_threshold,
            branch_id
          )
        `
          : "*",
      )
      .eq("id", id);

    // Filter by organization_id for multi-tenancy isolation
    if (userOrganizationId && !branchContext.isSuperAdmin) {
      query = query.eq("organization_id", userOrganizationId);
    }

    if (!includeArchived) {
      query = query.neq("status", "archived");
    }

    const { data: product, error } = await query.single();

    if (error) {
      // Check if it's a "not found" error or an access denied error
      if (error.code === "PGRST116") {
        // Product not found - could be because it doesn't exist or user doesn't have access
        logger.debug("Product not found or access denied", {
          productId: id,
          userOrganizationId,
          errorCode: error.code,
        });
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 },
        );
      }
      logger.error("Error fetching product", error);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!product) {
      logger.debug("Product query returned no data", { productId: id });
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // CRITICAL: Verify organization_id matches user's organization (multi-tenancy check)
    // This is a safety check in case the query filter didn't work correctly
    if (userOrganizationId && !branchContext.isSuperAdmin) {
      if (product.organization_id !== userOrganizationId) {
        logger.warn(
          "User attempted to access product from another organization",
          {
            productId: id,
            productOrganizationId: product.organization_id,
            userOrganizationId,
          },
        );
        return NextResponse.json(
          { error: "Forbidden: You don't have access to this product" },
          { status: 403 },
        );
      }
    }

    // Type assertion for product with stock
    const productWithStock = product as any;

    // CRITICAL: Verify organization_id matches user's organization (multi-tenancy check)
    // This is a safety check in case the query filter didn't work correctly
    if (userOrganizationId && !branchContext.isSuperAdmin) {
      if (productWithStock.organization_id !== userOrganizationId) {
        logger.warn(
          "User attempted to access product from another organization",
          {
            productId: id,
            productOrganizationId: productWithStock.organization_id,
            userOrganizationId,
          },
        );
        return NextResponse.json(
          { error: "Forbidden: You don't have access to this product" },
          { status: 403 },
        );
      }
    }

    // Filter stock by branch_id in post-processing if branch is selected
    if (
      currentBranchId &&
      productWithStock &&
      productWithStock.product_branch_stock
    ) {
      // Filter stock array to only include the current branch
      if (Array.isArray(productWithStock.product_branch_stock)) {
        const filteredStock = productWithStock.product_branch_stock.filter(
          (stock: any) => stock?.branch_id === currentBranchId,
        );
        productWithStock.product_branch_stock =
          filteredStock.length > 0 ? filteredStock : null;
      } else if (
        productWithStock.product_branch_stock.branch_id !== currentBranchId
      ) {
        productWithStock.product_branch_stock = null;
      }
    }

    // Log for debugging
    logger.info("Product fetched", {
      productId: id,
      currentBranchId,
      hasStock: !!productWithStock.product_branch_stock,
      stockLength: Array.isArray(productWithStock.product_branch_stock)
        ? productWithStock.product_branch_stock.length
        : productWithStock.product_branch_stock
          ? 1
          : 0,
    });

    // If branch is selected but no stock record exists, fetch or create default stock
    if (
      currentBranchId &&
      productWithStock &&
      !productWithStock.product_branch_stock
    ) {
      logger.info("No valid stock found, fetching from getProductStock", {
        productId: id,
        branchId: currentBranchId,
      });
      const stock = await getProductStock(id, currentBranchId, supabase);
      if (stock) {
        productWithStock.product_branch_stock = [stock];
        logger.info("Stock fetched successfully", { stock });
      } else {
        // If no stock record exists, return default stock with quantity 0
        productWithStock.product_branch_stock = [
          {
            quantity: 0,
            reserved_quantity: 0,
            low_stock_threshold: 5,
            branch_id: currentBranchId,
          },
        ];
        logger.info("Using default stock (0)");
      }
    }

    return NextResponse.json({ product: productWithStock });
  } catch (error) {
    logger.error("API error in products GET", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check authentication
    const { data, error: userError } = await getUser();
    const user = data?.user;
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: isAdmin } = await supabase.rpc("is_admin", {
      user_id: user.id,
    });
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Get user's organization_id for filtering
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = adminUser
      ? (adminUser as { organization_id?: string }).organization_id
      : undefined;

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 },
      );
    }

    if (
      body.price === undefined ||
      body.price === null ||
      isNaN(parseFloat(body.price))
    ) {
      return NextResponse.json(
        { error: "Valid price is required" },
        { status: 400 },
      );
    }

    // Generate slug if not provided
    let slug = body.slug?.trim();
    if (!slug) {
      slug = body.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      if (!slug) {
        slug = `product-${Date.now()}`;
      }
    }

    // Check for duplicate slug (excluding current product)
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .limit(1);

    if (existing && existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const productData: {
      name?: string;
      slug?: string;
      short_description?: string | null;
      description?: string | null;
      price?: number;
      compare_at_price?: number | null;
      cost_price?: number | null;
      // inventory_quantity removed - use product_branch_stock table instead
      category_id?: string | null;
      featured_image?: string | null;
      gallery?: string[];
      tags?: string[];
      product_type?: string;
      optical_category?: string | null;
      sku?: string | null;
      barcode?: string | null;
      brand?: string | null;
      manufacturer?: string | null;
      skin_type?: string[];
      benefits?: string[];
      certifications?: string[];
      ingredients?: Array<{ name: string; percentage?: number }>;
      usage_instructions?: string;
      precautions?: string;
      weight?: number;
      dimensions?: string;
      package_characteristics?: string;
      is_featured?: boolean;
      status?: "active" | "draft" | "archived";
      updated_at: string;
      [key: string]: unknown;
    } = {
      name: body.name.trim(),
      slug: slug,
      description: body.description || null,
      short_description: body.short_description || null,
      price: parseFloat(body.price),
      price_includes_tax:
        body.price_includes_tax === true || body.price_includes_tax === "true",
      compare_at_price: body.compare_at_price
        ? parseFloat(body.compare_at_price)
        : null,
      cost_price: body.cost_price ? parseFloat(body.cost_price) : null,
      category_id: body.category_id || null,
      // inventory_quantity removed - managed in product_branch_stock table
      status: body.status || "draft",
      featured_image: body.featured_image || null,
      gallery: body.gallery || [],
      tags: body.tags || [],
      // Optical product fields
      product_type: body.product_type || "frame",
      optical_category: body.optical_category || null,
      sku: body.sku || null,
      barcode: body.barcode || null,
      brand: body.brand || null,
      manufacturer: body.manufacturer || null,
      model_number: body.model_number || null,
      // Frame fields
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
      // Lens fields
      lens_type: body.lens_type || null,
      lens_material: body.lens_material || null,
      lens_index: body.lens_index ? parseFloat(body.lens_index) : null,
      lens_coatings: body.lens_coatings || [],
      lens_tint_options: body.lens_tint_options || [],
      uv_protection: body.uv_protection || null,
      blue_light_filter: body.blue_light_filter || false,
      blue_light_filter_percentage: body.blue_light_filter_percentage
        ? parseInt(body.blue_light_filter_percentage)
        : null,
      photochromic: body.photochromic || false,
      prescription_available: body.prescription_available || false,
      prescription_range: body.prescription_range || null,
      requires_prescription: body.requires_prescription || false,
      is_customizable: body.is_customizable || false,
      warranty_months: body.warranty_months
        ? parseInt(body.warranty_months)
        : null,
      warranty_details: body.warranty_details || null,
      is_featured: body.is_featured || false,
      updated_at: new Date().toISOString(),
    };

    // Add optional fields
    if (
      body.weight !== undefined &&
      body.weight !== null &&
      body.weight !== ""
    ) {
      productData.weight = parseFloat(body.weight) || undefined;
    }
    if (
      body.dimensions !== undefined &&
      body.dimensions !== null &&
      typeof body.dimensions === "object"
    ) {
      productData.dimensions = body.dimensions;
    }
    if (
      body.package_characteristics !== undefined &&
      body.package_characteristics !== null &&
      body.package_characteristics !== ""
    ) {
      productData.package_characteristics = body.package_characteristics;
    }
    if (
      body.usage_instructions !== undefined &&
      body.usage_instructions !== null &&
      body.usage_instructions !== ""
    ) {
      productData.usage_instructions = body.usage_instructions;
    }
    if (
      body.precautions !== undefined &&
      body.precautions !== null &&
      body.precautions !== ""
    ) {
      productData.precautions = body.precautions;
    }
    if (
      body.certifications !== undefined &&
      body.certifications !== null &&
      Array.isArray(body.certifications) &&
      body.certifications.length > 0
    ) {
      productData.certifications = body.certifications;
    }
    if (body.published_at !== undefined) {
      productData.published_at = body.published_at;
    }

    // First, verify the product exists and belongs to user's organization
    let productCheckQuery = supabase
      .from("products")
      .select("id, organization_id")
      .eq("id", id)
      .single();

    // Filter by organization_id for multi-tenancy isolation
    if (userOrganizationId) {
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
        user_id: user.id,
      });
      if (!isSuperAdmin) {
        productCheckQuery = productCheckQuery.eq(
          "organization_id",
          userOrganizationId,
        );
      }
    }

    const { data: existingProduct, error: checkError } =
      await productCheckQuery;

    // If product doesn't exist or doesn't belong to user's organization, return 403/404
    if (checkError || !existingProduct) {
      if (checkError?.code === "PGRST116") {
        // Product not found
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 },
        );
      }
      // Product exists but doesn't belong to user's organization
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this product" },
        { status: 403 },
      );
    }

    // Try with regular client first
    let updatedProduct, error;
    let updateQuery = supabase
      .from("products")
      .update(productData)
      .eq("id", id);

    // Filter by organization_id for multi-tenancy isolation
    if (userOrganizationId) {
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
        user_id: user.id,
      });
      if (!isSuperAdmin) {
        updateQuery = updateQuery.eq("organization_id", userOrganizationId);
      }
    }

    const result = await updateQuery.select().single();

    updatedProduct = result.data;
    error = result.error;

    // If RLS error, try with service role
    if (error && error.code === "42501") {
      const serviceSupabase = createServiceRoleClient();
      let serviceUpdateQuery = serviceSupabase
        .from("products")
        .update(productData)
        .eq("id", id);

      // Filter by organization_id for multi-tenancy isolation
      if (userOrganizationId) {
        const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
          user_id: user.id,
        });
        if (!isSuperAdmin) {
          serviceUpdateQuery = serviceUpdateQuery.eq(
            "organization_id",
            userOrganizationId,
          );
        }
      }

      const serviceResult = await serviceUpdateQuery.select().single();

      updatedProduct = serviceResult.data;
      error = serviceResult.error;
    }

    if (error) {
      logger.error("Error updating product", error);
      return NextResponse.json(
        { error: error.message || "Failed to update product" },
        { status: 500 },
      );
    }

    // Handle stock update if stock_quantity is provided
    if (body.stock_quantity !== undefined && updatedProduct) {
      const branchContext = await getBranchContext(request, user.id);
      const branchId = branchContext.branchId || body.branch_id;

      if (!branchId) {
        logger.warn("Stock update skipped: no branch_id provided", {
          productId: id,
          stockQuantity: body.stock_quantity,
          branchContext: branchContext.branchId,
        });
        // Return success but with a warning message
        return NextResponse.json({
          product: data,
          warning:
            "El producto se actualizó, pero el stock no se actualizó porque no se seleccionó una sucursal",
        });
      }

      const stockQty = parseInt(String(body.stock_quantity)) || 0;
      const serviceSupabase = createServiceRoleClient();

      // Get current stock to calculate difference
      const currentStock = await getProductStock(id, branchId, serviceSupabase);
      const currentQty = currentStock?.quantity || 0;
      const quantityChange = stockQty - currentQty;

      if (quantityChange !== 0) {
        const stockResult = await updateProductStock(
          id,
          branchId,
          quantityChange,
          false,
          serviceSupabase,
        );

        if (!stockResult.success) {
          logger.warn("Failed to update stock, but product was updated", {
            productId: id,
            branchId,
            error: stockResult.error,
          });
          return NextResponse.json({
            product: data,
            warning:
              "El producto se actualizó, pero hubo un error al actualizar el stock",
          });
        }
      }
    }

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    logger.error("API error in products PUT", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check authentication
    const { data, error: userError } = await getUser();
    const user = data?.user;
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: isAdmin } = await supabase.rpc("is_admin", {
      user_id: user.id,
    });
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Get user's organization_id for filtering
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = adminUser
      ? (adminUser as { organization_id?: string }).organization_id
      : undefined;

    // Try with regular client first
    let error;
    let deleteQuery = supabase.from("products").delete().eq("id", id);

    // Filter by organization_id for multi-tenancy isolation
    if (userOrganizationId) {
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
        user_id: user.id,
      });
      if (!isSuperAdmin) {
        deleteQuery = deleteQuery.eq("organization_id", userOrganizationId);
      }
    }

    const result = await deleteQuery;

    error = result.error;

    // If RLS error, try with service role
    if (error && error.code === "42501") {
      const serviceSupabase = createServiceRoleClient();
      const serviceResult = await serviceSupabase
        .from("products")
        .delete()
        .eq("id", id);

      error = serviceResult.error;
    }

    if (error) {
      logger.error("Error deleting product", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete product" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("API error in products DELETE", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
