import { NextRequest } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * Require root or dev role for access
 * Throws AuthorizationError if user is not root/dev
 *
 * Performance: Uses service role client to bypass RLS for verification
 * Consider caching result with short TTL if called frequently
 *
 * @param request - NextRequest object
 * @returns Object with userId and user info if authorized
 * @throws AuthorizationError if user is not root/dev
 */
export async function requireRoot(request: NextRequest): Promise<{
  userId: string;
  user: { id: string; email?: string };
}> {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthorizationError("Unauthorized");
  }

  // Check if user is root/dev using service role to bypass RLS
  const { data: adminUser, error: adminError } = await supabaseServiceRole
    .from("admin_users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminError) {
    logger.error("Error checking root status", adminError);
    throw new AuthorizationError("Unable to verify root status");
  }

  const isRoot = adminUser?.role === "root" || adminUser?.role === "dev";

  if (!isRoot) {
    throw new AuthorizationError("Root access required");
  }

  logger.debug(`Root access verified for user ${user.id}`);

  return {
    userId: user.id,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

/**
 * Check if user is root/dev (non-throwing version)
 * Useful for conditional logic without throwing errors
 *
 * @param userId - User ID to check
 * @returns true if user is root/dev, false otherwise
 */
export async function isRootUser(userId: string): Promise<boolean> {
  try {
    const supabaseServiceRole = createServiceRoleClient();

    const { data: adminUser, error } = await supabaseServiceRole
      .from("admin_users")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !adminUser) {
      return false;
    }

    return adminUser.role === "root" || adminUser.role === "dev";
  } catch (error) {
    logger.error("Error checking if user is root", error);
    return false;
  }
}
