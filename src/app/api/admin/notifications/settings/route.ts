import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const supabaseServiceRole = createServiceRoleClient();

    // Fetch all notification settings
    const { data: settings, error } = await supabaseServiceRole
      .from("notification_settings")
      .select("*")
      .order("notification_type");

    if (error) {
      logger.error("Error fetching notification settings:", { error });

      // Check if the error is because the table doesn't exist
      if (
        error.code === "PGRST205" ||
        error.message?.includes("Could not find the table")
      ) {
        return NextResponse.json(
          {
            error: "Table not found",
            message:
              "The notification_settings table does not exist. Please run the database migration: 20250129000000_add_optical_notification_types.sql",
            settings: [],
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch settings", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ settings: settings || [] });
  } catch (error) {
    logger.error("Error in notification settings GET API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      notification_type,
      enabled,
      priority,
      notify_all_admins,
      notify_specific_roles,
    } = body;

    if (!notification_type) {
      return NextResponse.json(
        { error: "Notification type is required" },
        { status: 400 },
      );
    }

    // Update or insert notification setting
    const { data: updatedSetting, error } = await supabaseServiceRole
      .from("notification_settings")
      .upsert(
        {
          notification_type,
          enabled: enabled !== undefined ? enabled : true,
          priority: priority || null,
          notify_all_admins:
            notify_all_admins !== undefined ? notify_all_admins : true,
          notify_specific_roles: notify_specific_roles || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "notification_type",
        },
      )
      .select()
      .single();

    if (error) {
      logger.error("Error updating notification setting:", {
        error,
        notificationType: notification_type,
      });
      return NextResponse.json(
        { error: "Failed to update setting" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      setting: updatedSetting,
    });
  } catch (error) {
    logger.error("Error in notification settings PUT API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { updates } = body; // Array of { notification_type, enabled, priority?, ... }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "Updates array is required" },
        { status: 400 },
      );
    }

    // Update multiple settings
    const results = [];
    for (const update of updates) {
      const { notification_type, ...updateData } = update;

      if (!notification_type) {
        results.push({
          notification_type: null,
          success: false,
          error: "Notification type is required",
        });
        continue;
      }

      const { data, error } = await supabaseServiceRole
        .from("notification_settings")
        .upsert(
          {
            notification_type,
            ...updateData,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "notification_type",
          },
        )
        .select()
        .single();

      if (error) {
        results.push({
          notification_type,
          success: false,
          error: error.message,
        });
      } else {
        results.push({ notification_type, success: true, setting: data });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error("Error in notification settings PATCH API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
