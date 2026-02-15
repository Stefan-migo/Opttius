import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import { asyncHandler, AuthenticationError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export const GET = asyncHandler(async (request: NextRequest) => {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createApiErrorResponse(new AuthenticationError("Unauthorized"));
  }

  // Fetch all active admin users
  const { data: adminUsers, error: fetchError } = await supabase
    .from("admin_users")
    .select("id, email, role, is_active")
    .eq("is_active", true)
    .order("email", { ascending: true });

  if (fetchError) {
    logger.error("Error fetching admin users:", { error: fetchError });
    return createApiErrorResponse(new Error("Failed to fetch admin users"), {
      details: { message: fetchError.message },
    });
  }

  return createApiSuccessResponse(
    {
      users: adminUsers || [],
      count: adminUsers?.length || 0,
    },
    { meta: { message: "Admin users retrieved successfully" } },
  );
});
