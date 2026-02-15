import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: category, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching category:", error);
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error("API error:", error);
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
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
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

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
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
        slug = `category-${Date.now()}`;
      }
    }

    // Check for duplicate slug (excluding current category)
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .limit(1);

    if (existing && existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const categoryData = {
      name: body.name.trim(),
      slug: slug,
      description: body.description || null,
      image_url: body.image_url || null,
      parent_id: body.parent_id || null,
      sort_order: body.sort_order || 0,
      is_active: body.is_active !== false,
      updated_at: new Date().toISOString(),
    };

    // Try with regular client first
    let data, error;
    const result = await supabase
      .from("categories")
      .update(categoryData)
      .eq("id", id)
      .select()
      .single();

    data = result.data;
    error = result.error;

    // If RLS error, try with service role
    if (error && error.code === "42501") {
      const serviceSupabase = createServiceRoleClient();
      const serviceResult = await serviceSupabase
        .from("categories")
        .update(categoryData)
        .eq("id", id)
        .select()
        .single();

      data = serviceResult.data;
      error = serviceResult.error;
    }

    if (error) {
      console.error("Error updating category:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ category: data });
  } catch (error: any) {
    console.error("API error:", error);
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
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
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

    // Check if category is a default category (protected from deletion)
    const { data: category, error: fetchError } = await supabase
      .from("categories")
      .select("id, name, is_default")
      .eq("id", id)
      .single();

    if (fetchError || !category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Prevent deletion of default categories
    if (category.is_default === true) {
      return NextResponse.json(
        {
          error: `No se puede eliminar la categoría "${category.name}". Las categorías por defecto del sistema están protegidas y no pueden eliminarse.`,
          code: "DEFAULT_CATEGORY_PROTECTED",
        },
        { status: 403 },
      );
    }

    // Check for subcategories
    const { count: subcategoriesCount } = await supabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", id);

    if (subcategoriesCount && subcategoriesCount > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar la categoría porque tiene ${subcategoriesCount} subcategoría(s). Por favor, elimina o reasigna las subcategorías primero.`,
          code: "HAS_SUBCATEGORIES",
        },
        { status: 400 },
      );
    }

    // Try with regular client first
    let error;
    const result = await supabase.from("categories").delete().eq("id", id);

    error = result.error;

    // If RLS error, try with service role
    if (error && error.code === "42501") {
      const serviceSupabase = createServiceRoleClient();
      const serviceResult = await serviceSupabase
        .from("categories")
        .delete()
        .eq("id", id);

      error = serviceResult.error;
    }

    if (error) {
      // Check if error is from trigger (default category protection)
      if (
        error.message &&
        error.message.includes("Cannot delete default category")
      ) {
        return NextResponse.json(
          {
            error: error.message,
            code: "DEFAULT_CATEGORY_PROTECTED",
          },
          { status: 403 },
        );
      }

      console.error("Error deleting category:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
