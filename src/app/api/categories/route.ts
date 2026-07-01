import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // First try with regular client (respects RLS)
    let { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    // If RLS blocks access or returns empty, try with service role for global categories
    if (
      (error && error.code === "42501") ||
      (!error && (!categories || categories.length === 0))
    ) {
      const serviceSupabase = createServiceRoleClient();
      const result = await serviceSupabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      categories = result.data;
      error = result.error;
    }

    if (error) {
      logger.error("Error fetching categories:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 },
      );
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error: unknown) {
    logger.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
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
    };

    // Try with regular client first
    let data, error;
    const result = await supabase
      .from("categories")
      .insert([categoryData])
      .select()
      .single();

    data = result.data;
    error = result.error;

    // If RLS error, try with service role
    if (error && error.code === "42501") {
      const serviceSupabase = createServiceRoleClient();
      const serviceResult = await serviceSupabase
        .from("categories")
        .insert([categoryData])
        .select()
        .single();

      data = serviceResult.data;
      error = serviceResult.error;
    }

    if (error) {
      logger.error("Error creating category:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error: unknown) {
    logger.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
