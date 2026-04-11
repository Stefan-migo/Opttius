import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      // Silently return 401 - this is expected when user is not authenticated
      // Don't log as error since this happens during initial page load
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
      "is_admin",
      { user_id: user.id },
    );
    if (adminCheckError) {
      logger.error("Admin check error", adminCheckError);
      return NextResponse.json(
        { error: "Admin verification failed" },
        { status: 500 },
      );
    }
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Check if user is root/dev
    const { data: isRootUser } = await supabase.rpc("is_root_user", {
      user_id: user.id,
    });

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const unreadOnly = url.searchParams.get("unread_only") === "true";
    const type = url.searchParams.get("type");
    const branchId = url.searchParams.get("branch_id") || undefined;

    // RLS policies handle filtering by organization_id and branch_id automatically.
    // When branch_id is provided (user has a branch selected), filter to that branch only.
    // When not provided (global view), RLS shows all accessible branches for the user.
    let query = supabase
      .from("admin_notifications")
      .select("*", { count: "exact" })
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by branch when user has a specific branch selected (multi-sucursal isolation)
    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    // Apply filters
    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      logger.error("Error fetching notifications", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 },
      );
    }

    // Unread count - apply same branch filter as main query
    let unreadQuery = supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("is_read", false);
    if (branchId) {
      unreadQuery = unreadQuery.eq("branch_id", branchId);
    }
    const { count: unreadCount } = await unreadQuery;

    return NextResponse.json({
      notifications: notifications || [],
      count: count || 0,
      unreadCount,
    });
  } catch (error) {
    logger.error("Error in notifications API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("Auth error in notifications PATCH", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
      "is_admin",
      { user_id: user.id },
    );
    if (adminCheckError) {
      logger.error("Admin check error", adminCheckError);
      return NextResponse.json(
        { error: "Admin verification failed" },
        { status: 500 },
      );
    }
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { notificationId, markAllRead } = await request.json();

    if (markAllRead) {
      // Mark all notifications as read
      await supabase.rpc("mark_all_notifications_read");

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      });
    }

    if (notificationId) {
      // Mark specific notification as read
      await supabase.rpc("mark_notification_read", {
        notification_id: notificationId,
      });

      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    logger.error("Error updating notification", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
