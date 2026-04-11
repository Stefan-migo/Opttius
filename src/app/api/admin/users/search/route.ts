import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type {
  GetAdminRoleParams,
  GetAdminRoleResult,
} from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/admin/users/search
 * Search registered users by email or name (for admin user creation)
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminRole } = (await supabase.rpc("get_admin_role", {
      user_id: user.id,
    } as GetAdminRoleParams)) as {
      data: GetAdminRoleResult | null;
      error: Error | null;
    };
    if (adminRole !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Search in profiles table (which has user info and is linked to auth.users)
    let usersQuery = supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .order("email", { ascending: true })
      .limit(10);

    // Add search filter if query is provided
    if (query.trim()) {
      usersQuery = usersQuery.or(
        `email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`,
      );
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      logger.error("Error searching users:", { error: usersError, query });
      return NextResponse.json(
        { error: "Failed to search users" },
        { status: 500 },
      );
    }

    // Check which users are already admins
    const { data: existingAdmins } = await supabase
      .from("admin_users")
      .select("id")
      .in(
        "id",
        (users || []).map((u) => u.id),
      );

    const adminIds = new Set(existingAdmins?.map((a) => a.id) || []);

    // Filter out users who are already admins and format response
    const availableUsers = (users || [])
      .filter((user) => !adminIds.has(user.id))
      .map((user) => ({
        id: user.id,
        email: user.email,
        fullName:
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      }));

    return NextResponse.json({ users: availableUsers });
  } catch (error) {
    logger.error("Error in users search API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
