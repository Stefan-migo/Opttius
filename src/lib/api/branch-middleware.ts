import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

import { createClient } from "@/utils/supabase/server";

export interface BranchContext {
  branchId: string | null;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
  /** User's organization_id from admin_users. Vision Global must be scoped to this org only. */
  organizationId: string | null;
  accessibleBranches: Array<{
    id: string;
    name: string;
    code: string;
    role: string;
    isPrimary: boolean;
  }>;
}

export interface OperativoContext {
  fieldOperationId: string | null;
}

/**
 * Extract field_operation_id from request (header or query param)
 */
export function getFieldOperationFromRequest(
  request: NextRequest,
): string | null {
  const headerId = request.headers.get("x-field-operation-id");
  if (headerId) return headerId;
  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get("field_operation_id");
  return queryId || null;
}

/**
 * Get operativo context from request (field_operation_id if present)
 */
export function getOperativoContext(request: NextRequest): OperativoContext {
  const fieldOperationId = getFieldOperationFromRequest(request);
  return { fieldOperationId };
}

/**
 * Extract branch_id from request (header, query param, or user context)
 */
export async function getBranchFromRequest(
  request: NextRequest,
): Promise<string | null> {
  // Try header first
  const headerBranchId = request.headers.get("x-branch-id");
  if (headerBranchId) {
    return headerBranchId;
  }

  // Try query parameter
  const { searchParams } = new URL(request.url);
  const queryBranchId = searchParams.get("branch_id");
  if (queryBranchId) {
    return queryBranchId;
  }

  return null;
}

/**
 * Get branch context for the current user
 * @param request - NextRequest object
 * @param userId - User ID
 * @param supabaseClient - Optional Supabase client (if not provided, will use createClient())
 */
export async function getBranchContext(
  request: NextRequest,
  userId: string,
  supabaseClient?: SupabaseClient<unknown>,
): Promise<BranchContext> {
  let supabase: SupabaseClient<unknown>;
  try {
    supabase = supabaseClient || (await createClient());
  } catch (clientError: unknown) {
    console.error(
      "Error creating Supabase client in getBranchContext:",
      clientError,
    );
    // Return default values if client creation fails
    return {
      branchId: null,
      isGlobalView: false,
      isSuperAdmin: false,
      organizationId: null,
      accessibleBranches: [],
    };
  }

  // User's organization_id (Vision Global must be scoped to this org only)
  let organizationId: string | null = null;
  try {
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", userId)
      .single();
    organizationId =
      (adminUser as { organization_id?: string } | null)?.organization_id ??
      null;
  } catch (_) {}

  // Check if user is super admin: RPC (admin_branch_access.branch_id = null) OR role in admin_users
  let isSuperAdmin = false;
  try {
    const { data: superAdminData, error: superAdminError } = await supabase.rpc(
      "is_super_admin",
      {
        user_id: userId,
      },
    );
    if (superAdminError) {
      console.error("Error checking super admin status:", superAdminError);
    } else {
      isSuperAdmin = superAdminData || false;
    }
    // Fallback: if RPC says no but user has super_admin/root/dev role, treat as super admin
    if (!isSuperAdmin) {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("role")
        .eq("id", userId)
        .single();
      const role = (adminUser as { role?: string } | null)?.role;
      if (role === "super_admin" || role === "root" || role === "dev") {
        isSuperAdmin = true;
      }
    }
  } catch (err) {
    console.error("Exception checking super admin status:", err);
    // Continue with isSuperAdmin = false
  }

  // Get user's accessible branches
  let branches: unknown[] = [];
  try {
    const { data: branchesData, error: branchesError } = await supabase.rpc(
      "get_user_branches",
      {
        user_id: userId,
      },
    );

    if (branchesError) {
      console.error("Error fetching user branches:", branchesError);
      // Return default values if error occurs
      return {
        branchId: null,
        isGlobalView: false,
        isSuperAdmin: false,
        organizationId,
        accessibleBranches: [],
      };
    }

    branches = branchesData || [];
  } catch (err) {
    console.error("Exception fetching user branches:", err);
    // Return default values if exception occurs
    return {
      branchId: null,
      isGlobalView: false,
      isSuperAdmin: false,
      organizationId,
      accessibleBranches: [],
    };
  }

  const accessibleBranches = (branches || []).map((b: unknown) => ({
    id: b.branch_id,
    name: b.branch_name,
    code: b.branch_code,
    role: b.role,
    isPrimary: b.is_primary,
  }));

  // Get requested branch from request
  const requestedBranchId = await getBranchFromRequest(request);

  // Determine current branch
  let branchId: string | null = null;
  let isGlobalView = false;

  if (isSuperAdmin) {
    // Super admin can use global view or specific branch
    if (requestedBranchId === "global" || requestedBranchId === null) {
      isGlobalView = true;
      branchId = null;
    } else if (requestedBranchId) {
      branchId = requestedBranchId;
      isGlobalView = false;
    } else {
      // Default to global view for super admin
      isGlobalView = true;
      branchId = null;
    }
  } else {
    // Regular admin must use a specific branch
    if (requestedBranchId) {
      // Validate access
      const hasAccess = accessibleBranches.some(
        (b: { id: string }) => b.id === requestedBranchId,
      );
      if (hasAccess) {
        branchId = requestedBranchId;
      } else {
        // Use primary branch if access denied
        const primaryBranch = accessibleBranches.find(
          (b: { isPrimary?: boolean }) => b.isPrimary,
        );
        branchId = primaryBranch?.id || accessibleBranches[0]?.id || null;
      }
    } else {
      // Use primary branch or first available
      const primaryBranch = accessibleBranches.find(
        (b: { isPrimary?: boolean }) => b.isPrimary,
      );
      branchId = primaryBranch?.id || accessibleBranches[0]?.id || null;
    }
  }

  return {
    branchId,
    isGlobalView,
    isSuperAdmin: isSuperAdmin || false,
    organizationId,
    accessibleBranches,
  };
}

/**
 * Validate that user can access a specific branch
 */
export async function validateBranchAccess(
  userId: string,
  branchId: string | null,
): Promise<boolean> {
  if (branchId === null) {
    // Only super admin can access global view
    const supabase = await createClient();
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
      user_id: userId,
    });
    return isSuperAdmin || false;
  }

  const supabase = await createClient();
  const { data: canAccess } = await supabase.rpc("can_access_branch", {
    user_id: userId,
    p_branch_id: branchId,
  });

  return canAccess || false;
}

/**
 * Add branch filter to a Supabase query.
 * When in global view (isSuperAdmin && !branchId), scope by organizationId so Vision Global
 * never shows data from other organizations.
 */
export function addBranchFilter(
  query: unknown,
  branchId: string | null,
  isSuperAdmin: boolean,
  organizationId?: string | null,
) {
  if (isSuperAdmin && branchId === null) {
    // Vision Global: only show data from the user's organization
    if (organizationId) {
      return query.eq("organization_id", organizationId);
    }
    // No organization (e.g. platform admin): return no rows to avoid leaking other orgs
    return query.eq("organization_id", "00000000-0000-0000-0000-000000000000");
  }

  if (branchId) {
    return query.eq("branch_id", branchId);
  }

  return query.eq("branch_id", "00000000-0000-0000-0000-000000000000");
}

/**
 * Add branch filter for tables that only have branch_id (no organization_id).
 * Use for: customers, etc.
 * When in global view, fetches branch IDs for the org and filters by .in("branch_id", ids).
 */
export async function addBranchFilterForBranchScopedTable(
  query: unknown,
  branchContext: BranchContext,
  supabase: SupabaseClient<unknown>,
) {
  const { branchId, isSuperAdmin, organizationId, accessibleBranches } =
    branchContext;

  if (branchId) {
    return query.eq("branch_id", branchId);
  }

  if (isSuperAdmin && organizationId) {
    const { data: branches } = await supabase
      .from("branches")
      .select("id")
      .eq("organization_id", organizationId);
    const branchIds = branches?.map((b: { id: string }) => b.id) || [];
    if (branchIds.length > 0) {
      return query.in("branch_id", branchIds);
    }
    return query.eq("branch_id", "00000000-0000-0000-0000-000000000000");
  }

  const primaryBranchId =
    accessibleBranches.find((b: { isPrimary?: boolean }) => b.isPrimary)?.id ||
    accessibleBranches[0]?.id;
  return primaryBranchId
    ? query.eq("branch_id", primaryBranchId)
    : query.eq("branch_id", "00000000-0000-0000-0000-000000000000");
}
