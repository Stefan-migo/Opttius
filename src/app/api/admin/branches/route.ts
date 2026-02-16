import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getBranchContext,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { validateTierLimit } from "@/lib/saas/tier-validator";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Get user's organization_id to filter branches appropriately
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = adminUser?.organization_id;

    // Get all branches (super admin) or user's accessible branches
    let branches;

    if (branchContext.isSuperAdmin) {
      // Super admin: filter by organization if user belongs to one
      // Only true global super admins (no organization) see all branches
      let query = supabase.from("branches").select("*");

      if (userOrganizationId) {
        // Super admin with organization: only show branches from their organization
        query = query.eq("organization_id", userOrganizationId);
      }
      // If no organization_id, show all branches (true global super admin)
      // We'll filter out the global "Sucursal Principal" (code='MAIN' without organization_id) after fetching

      const { data, error } = await query.order("name");

      if (error) {
        logger.error("Error fetching branches", error);
        return NextResponse.json(
          { error: "Failed to fetch branches" },
          { status: 500 },
        );
      }

      // Filter out the global "Sucursal Principal" (legacy branch without organization_id)
      // This branch should only be visible to true global super admins managing legacy data
      branches = (data || []).filter(
        (b) => !(b.code === "MAIN" && !b.organization_id),
      );
    } else {
      // Regular admin sees only their accessible branches
      branches = branchContext.accessibleBranches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        role: b.role,
        is_primary: b.isPrimary,
      }));

      // Fetch full branch details
      if (branches.length > 0) {
        const branchIds = branches.map((b) => b.id);
        const { data: branchDetails, error } = await supabase
          .from("branches")
          .select("*")
          .in("id", branchIds)
          .order("name");

        if (!error && branchDetails) {
          // Merge with access info
          branches = branchDetails.map((bd) => {
            const access = branchContext.accessibleBranches.find(
              (a) => a.id === bd.id,
            );
            return {
              ...bd,
              role: access?.role,
              is_primary: access?.isPrimary,
            };
          });
        }
      }
    }

    return NextResponse.json({
      branches: branches || [],
      currentBranch: branchContext.branchId,
      isGlobalView: branchContext.isGlobalView,
      isSuperAdmin: branchContext.isSuperAdmin,
      organizationId: userOrganizationId ?? null,
    });
  } catch (error: any) {
    logger.error("Error in GET /api/admin/branches", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Handle branch selection (set_branch action)
    if (body.action === "set_branch") {
      // This is just a notification, no need to do anything server-side
      // The branch context is managed client-side via localStorage
      return NextResponse.json({ success: true });
    }

    // Check if user is super admin for branch creation (RPC or role in admin_users)
    // Use service role to read role so RLS cannot block the check
    const { createServiceRoleClient } = await import("@/utils/supabase/server");
    const serviceSupabase = createServiceRoleClient();
    let canCreateBranch = false;
    const { data: isSuperAdminRPC } = await supabase.rpc("is_super_admin", {
      user_id: user.id,
    });
    if (isSuperAdminRPC) {
      canCreateBranch = true;
    } else {
      const { data: adminUser } = await serviceSupabase
        .from("admin_users")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = (adminUser as { role?: string } | null)?.role;
      if (role === "super_admin" || role === "root" || role === "dev") {
        canCreateBranch = true;
      }
    }
    if (!canCreateBranch) {
      return NextResponse.json(
        { error: "Only super admins can create branches" },
        { status: 403 },
      );
    }

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
      settings,
    } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 },
      );
    }

    // Resolve organization_id for the new branch (required for tier validation and insert)
    const { data: adminUserForOrg } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const organizationId =
      body.organization_id ?? adminUserForOrg?.organization_id;

    if (organizationId) {
      const branchLimit = await validateTierLimit(organizationId, "branches");
      if (!branchLimit.allowed) {
        return NextResponse.json(
          {
            error:
              branchLimit.reason ??
              "Límite de sucursales alcanzado para tu plan",
            code: "TIER_LIMIT",
            currentCount: branchLimit.currentCount,
            maxAllowed: branchLimit.maxAllowed,
          },
          { status: 403 },
        );
      }
    }

    // Check if code already exists (scoped by organization if applicable)
    let codeQuery = supabase.from("branches").select("id").eq("code", code);
    if (organizationId) {
      codeQuery = codeQuery.eq("organization_id", organizationId);
    }
    const { data: existingBranch } = await codeQuery.single();

    if (existingBranch) {
      return NextResponse.json(
        { error: "Branch code already exists" },
        { status: 400 },
      );
    }

    // Create branch (with organization_id when available)
    const insertPayload: Record<string, unknown> = {
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
      settings: settings || {},
      is_active: true,
    };
    if (organizationId) {
      insertPayload.organization_id = organizationId;
    }

    const { data: newBranch, error } = await supabase
      .from("branches")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      logger.error("Error creating branch", error);
      return NextResponse.json(
        { error: "Failed to create branch" },
        { status: 500 },
      );
    }

    return NextResponse.json({ branch: newBranch }, { status: 201 });
  } catch (error: any) {
    logger.error("Error in POST /api/admin/branches", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
