import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/admin/saas-management/telemetry-config
 * Returns the global telemetry configuration
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authorization (root or dev)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      adminError ||
      !["root", "dev", "super_admin"].includes(adminUser?.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get telemetry state from system_config
    const { data: config, error: configError } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_key", "telemetry_enabled")
      .maybeSingle();

    if (configError) {
      logger.error("Error fetching telemetry config:", configError);
      return NextResponse.json(
        { error: "Failed to fetch config" },
        { status: 500 },
      );
    }

    // If not found, default to true
    let enabled = true;
    if (config) {
      try {
        enabled =
          typeof config.config_value === "string"
            ? JSON.parse(config.config_value)
            : config.config_value;
      } catch (e) {
        enabled = !!config.config_value;
      }
    } else {
      // Initialize if not exists
      await supabase.from("system_config").insert({
        config_key: "telemetry_enabled",
        config_value: JSON.stringify(true),
        category: "telemetry",
        description:
          "Global toggle for usage tracking and performance monitoring",
        value_type: "boolean",
      });
    }

    return NextResponse.json({ enabled });
  } catch (error) {
    logger.error("Internal error in telemetry config GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/saas-management/telemetry-config
 * Updates the global telemetry configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const { enabled } = await request.json();
    const supabase = await createClient();

    // Check authorization
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      adminError ||
      !["root", "dev", "super_admin"].includes(adminUser?.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update or Insert configuration
    const { error: updateError } = await supabase.from("system_config").upsert(
      {
        config_key: "telemetry_enabled",
        config_value: JSON.stringify(enabled),
        category: "telemetry",
        description:
          "Global toggle for usage tracking and performance monitoring",
        value_type: "boolean",
        updated_at: new Date().toISOString(),
        last_modified_by: user.id,
      },
      { onConflict: "config_key" },
    );

    if (updateError) {
      logger.error("Error updating telemetry config:", updateError);
      return NextResponse.json(
        { error: "Failed to update config" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    logger.error("Internal error in telemetry config PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
