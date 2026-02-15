import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    logger.debug("Support Categories API GET called");
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("User authentication failed", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.debug("User authenticated", { email: user.email });

    const { data: isAdmin, error: adminError } = (await supabase.rpc(
      "is_admin",
      { user_id: user.id } as IsAdminParams,
    )) as { data: IsAdminResult | null; error: Error | null };
    if (adminError) {
      logger.error("Admin check error", adminError);
      return NextResponse.json(
        { error: "Admin verification failed" },
        { status: 500 },
      );
    }
    if (!isAdmin) {
      logger.warn("User is not admin", { email: user.email });
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.debug("Admin access confirmed", { email: user.email });

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Get all support categories from database
    let query = supabase
      .from("support_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    // Apply branch filter (include global categories - branch_id IS NULL)
    if (branchContext.branchId) {
      query = query.or(
        `branch_id.eq.${branchContext.branchId},branch_id.is.null`,
      );
    } else if (!branchContext.isSuperAdmin) {
      // Regular admin without branch - only global categories
      query = query.is("branch_id", null);
    }

    const { data: categories, error: fetchError } = await query;

    if (fetchError) {
      logger.error("Error fetching categories", fetchError);
      return NextResponse.json(
        {
          error: "Failed to fetch categories",
          details: fetchError.message,
        },
        { status: 500 },
      );
    }

    // If no categories exist, return empty array
    if (!categories || categories.length === 0) {
      logger.debug("No categories found in database");
      return NextResponse.json({
        categories: [],
        message: "No categories found. Please create some categories first.",
      });
    }

    logger.debug("Support categories fetched", { count: categories.length });
    return NextResponse.json({ categories });
  } catch (error) {
    logger.error("Error in support categories API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, sort_order = 0 } = body;

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc("is_admin", {
      user_id: user.id,
    });
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Create the category
    const { data: category, error: categoryError } = await supabase
      .from("support_categories")
      .insert({
        name,
        description,
        sort_order,
        is_active: true,
      })
      .select()
      .single();

    if (categoryError) {
      logger.error("Error creating support category", categoryError);
      return NextResponse.json(
        { error: "Failed to create support category" },
        { status: 500 },
      );
    }

    // Log admin activity
    await supabase.rpc("log_admin_activity", {
      action: "create_support_category",
      resource_type: "support_category",
      resource_id: category.id,
      details: { category_name: name },
    });

    return NextResponse.json({ category });
  } catch (error) {
    logger.error("Error in create support category API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
