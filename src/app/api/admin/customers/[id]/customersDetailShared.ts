/**
 * Shared auth + branch helpers for customers/[id]/route handlers.
 * Extracted to eliminate duplication across GET/PUT/DELETE.
 */
import { NextRequest } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

export interface AuthContext {
  userId: string;
  userEmail?: string;
  organizationId: string | null;
  isSuperAdmin: boolean;
  branchId: string | null;
}

export async function authenticateAndGetContext(
  request: NextRequest,
  operation: string,
): Promise<{ context: AuthContext; supabase: unknown }> {
  logger.info(`Customer Detail API ${operation} called`);

  const { client: supabase, getUser } = await createClientFromRequest(request);

  const { data, error: userError } = await getUser();
  const user = (data as { user: { id: string; email?: string } } | undefined)
    ?.user;
  if (userError || !user) {
    throw new AuthenticationError("Unauthorized");
  }

  const { createServiceRoleClient } = await import("@/utils/supabase/server");
  const serviceSupabase = createServiceRoleClient();

  const { data: isAdmin } = await serviceSupabase.rpc("is_admin", {
    user_id: user.id,
  });
  if (!isAdmin) {
    throw new AuthorizationError("Admin access required");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const organizationId =
    (adminUser as { organization_id: string | null } | null)?.organization_id ??
    null;

  const branchContext = await getBranchContext(
    request,
    user.id,
    supabase as unknown,
  );

  return {
    context: {
      userId: user.id,
      userEmail: user.email,
      organizationId,
      isSuperAdmin: branchContext.isSuperAdmin,
      branchId: branchContext.branchId,
    },
    supabase,
  };
}

export function buildBranchFilter(context: AuthContext) {
  return (query: unknown) => {
    if (context.organizationId && !context.isSuperAdmin) {
      query = query.eq("organization_id", context.organizationId);
      if (context.branchId) query = query.eq("branch_id", context.branchId);
    } else if (context.isSuperAdmin) {
      if (context.branchId) query = query.eq("branch_id", context.branchId);
    } else {
      query = addBranchFilter(
        query,
        context.branchId,
        context.isSuperAdmin,
        context.organizationId,
      );
    }
    return query;
  };
}
