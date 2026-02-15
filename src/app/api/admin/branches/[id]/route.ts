import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { validateBranchAccess } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access (super admin or has access to this branch)
    const canAccess = await validateBranchAccess(
      user.id,
      id === "global" ? null : id,
    );

    if (!canAccess) {
      return NextResponse.json(
        { error: "Access denied to this branch" },
        { status: 403 },
      );
    }

    if (id === "global") {
      // Return global view info
      return NextResponse.json({
        id: "global",
        name: "Vista Global",
        code: "GLOBAL",
        is_global: true,
      });
    }

    // Fetch branch details
    const { data: branch, error } = await supabase
      .from("branches")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json({ branch });
  } catch (error: any) {
    logger.error("Error in GET /api/admin/branches/[id]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
      user_id: user.id,
    });

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can update branches" },
        { status: 403 },
      );
    }

    if (id === "global") {
      return NextResponse.json(
        { error: "Cannot update global view" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const {
      name,
      code,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      phone,
      email,
      is_active,
      settings,
    } = body;

    // Check if code is being changed and if it conflicts
    if (code) {
      const { data: existingBranch } = await supabase
        .from("branches")
        .select("id")
        .eq("code", code)
        .neq("id", id)
        .single();

      if (existingBranch) {
        return NextResponse.json(
          { error: "Branch code already exists" },
          { status: 400 },
        );
      }
    }

    // Update branch
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (address_line_1 !== undefined)
      updateData.address_line_1 = address_line_1;
    if (address_line_2 !== undefined)
      updateData.address_line_2 = address_line_2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (postal_code !== undefined) updateData.postal_code = postal_code;
    if (country !== undefined) updateData.country = country;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (settings !== undefined) updateData.settings = settings;

    const { data: updatedBranch, error } = await supabase
      .from("branches")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating branch", error);
      return NextResponse.json(
        { error: "Failed to update branch" },
        { status: 500 },
      );
    }

    return NextResponse.json({ branch: updatedBranch });
  } catch (error: any) {
    logger.error("Error in PUT /api/admin/branches/[id]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
      user_id: user.id,
    });

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can delete branches" },
        { status: 403 },
      );
    }

    if (id === "global") {
      return NextResponse.json(
        { error: "Cannot delete global view" },
        { status: 400 },
      );
    }

    // Check if branch has associated data (orders, products, etc.)
    // This is a soft check - in production you might want to check more thoroughly
    const { data: hasOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("branch_id", id)
      .limit(1)
      .single();

    if (hasOrders) {
      return NextResponse.json(
        {
          error:
            "Cannot delete branch with associated orders. Deactivate it instead.",
        },
        { status: 400 },
      );
    }

    // Delete branch
    const { error } = await supabase.from("branches").delete().eq("id", id);

    if (error) {
      logger.error("Error deleting branch", error);
      return NextResponse.json(
        { error: "Failed to delete branch" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error in DELETE /api/admin/branches/[id]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
