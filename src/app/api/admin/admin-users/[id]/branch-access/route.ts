import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type {
  GetAdminRoleParams,
  GetAdminRoleResult,
} from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

// GET: Get branch access for an admin user
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is super admin or admin
    const branchContext = await getBranchContext(request, user.id);
    const { data: adminRole } = (await supabase.rpc("get_admin_role", {
      user_id: user.id,
    } as GetAdminRoleParams)) as {
      data: GetAdminRoleResult | null;
      error: Error | null;
    };

    const isAdmin = adminRole === "admin" || adminRole === "super_admin";
    if (!branchContext.isSuperAdmin && !isAdmin) {
      return NextResponse.json(
        { error: "Only super admins and admins can view branch access" },
        { status: 403 },
      );
    }

    // Use service role so admins can view any user's branch access (RLS only allows viewing own)
    const supabaseServiceRole = createServiceRoleClient();
    const { data: branchAccess, error } = await supabaseServiceRole
      .from("admin_branch_access")
      .select(
        `
        id,
        branch_id,
        role,
        is_primary,
        branches (
          id,
          name,
          code
        )
      `,
      )
      .eq("admin_user_id", id)
      .order("is_primary", { ascending: false });

    if (error) {
      logger.error("Error fetching branch access:", { error, adminUserId: id });
      return NextResponse.json(
        { error: "Failed to fetch branch access" },
        { status: 500 },
      );
    }

    return NextResponse.json({ branchAccess: branchAccess || [] });
  } catch (error: unknown) {
    logger.error("Error in GET branch access:", { error, adminUserId: id });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Assign branch access to an admin user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { branch_id, role = "manager", is_primary = false } = body;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is super admin or admin
    const branchContext = await getBranchContext(request, user.id);
    const { data: adminRole } = (await supabase.rpc("get_admin_role", {
      user_id: user.id,
    } as GetAdminRoleParams)) as {
      data: GetAdminRoleResult | null;
      error: Error | null;
    };

    const isAdmin = adminRole === "admin" || adminRole === "super_admin";
    if (!branchContext.isSuperAdmin && !isAdmin) {
      return NextResponse.json(
        { error: "Only super admins and admins can assign branch access" },
        { status: 403 },
      );
    }

    // Only super admins can assign super admin access (branch_id = null)
    if (branch_id === null && !branchContext.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can assign super admin access" },
        { status: 403 },
      );
    }

    // Validate input
    if (branch_id === undefined) {
      return NextResponse.json(
        { error: "branch_id is required (use null for super admin)" },
        { status: 400 },
      );
    }

    // Check if admin user exists
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", id)
      .single();

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 },
      );
    }

    // Use service role for writes (RLS on admin_branch_access only allows super_admin to INSERT/UPDATE/DELETE)
    const supabaseServiceRole = createServiceRoleClient();

    // If assigning super admin (branch_id = null), remove all other access
    if (branch_id === null) {
      await supabaseServiceRole
        .from("admin_branch_access")
        .delete()
        .eq("admin_user_id", id);

      const { data: newAccess, error: insertError } = await supabaseServiceRole
        .from("admin_branch_access")
        .insert({
          admin_user_id: id,
          branch_id: null,
          role: "manager",
          is_primary: true,
        })
        .select()
        .single();

      if (insertError) {
        logger.error("Error creating super admin access:", {
          error: insertError,
          adminUserId: id,
        });
        return NextResponse.json(
          {
            error: "Failed to assign super admin access",
            details: insertError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ branchAccess: newAccess });
    }

    // Validate branch exists
    const { data: branch } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branch_id)
      .single();

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // If setting as primary, unset other primary flags
    if (is_primary) {
      await supabaseServiceRole
        .from("admin_branch_access")
        .update({ is_primary: false })
        .eq("admin_user_id", id);
    }

    // Upsert branch access (service role bypasses RLS)
    const { data: branchAccess, error: upsertError } = await supabaseServiceRole
      .from("admin_branch_access")
      .upsert(
        {
          admin_user_id: id,
          branch_id,
          role,
          is_primary,
        },
        {
          onConflict: "admin_user_id,branch_id",
        },
      )
      .select()
      .single();

    if (upsertError) {
      logger.error("Error assigning branch access:", {
        error: upsertError,
        adminUserId: id,
        branchId: branch_id,
      });
      return NextResponse.json(
        {
          error: "Failed to assign branch access",
          details: upsertError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ branchAccess });
  } catch (error: unknown) {
    logger.error("Error in POST branch access:", { error, adminUserId: id });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE: Remove branch access from an admin user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const branch_id = searchParams.get("branch_id");

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is super admin or admin
    const branchContext = await getBranchContext(request, user.id);
    const { data: adminRole } = (await supabase.rpc("get_admin_role", {
      user_id: user.id,
    } as GetAdminRoleParams)) as {
      data: GetAdminRoleResult | null;
      error: Error | null;
    };

    const isAdmin = adminRole === "admin" || adminRole === "super_admin";
    if (!branchContext.isSuperAdmin && !isAdmin) {
      return NextResponse.json(
        { error: "Only super admins and admins can remove branch access" },
        { status: 403 },
      );
    }

    // Only super admins can remove super admin access (branch_id = null)
    if (branch_id === "null" && !branchContext.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can remove super admin access" },
        { status: 403 },
      );
    }

    if (!branch_id) {
      return NextResponse.json(
        { error: "branch_id is required" },
        { status: 400 },
      );
    }

    const supabaseServiceRole = createServiceRoleClient();
    const deleteQuery = supabaseServiceRole
      .from("admin_branch_access")
      .delete()
      .eq("admin_user_id", id);

    const { error: deleteError } =
      branch_id === "null"
        ? await deleteQuery.is("branch_id", null)
        : await deleteQuery.eq("branch_id", branch_id);

    if (deleteError) {
      logger.error("Error removing branch access:", {
        error: deleteError,
        adminUserId: id,
        branchId: branch_id,
      });
      return NextResponse.json(
        { error: "Failed to remove branch access" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error("Error in DELETE branch access:", { error, adminUserId: id });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
