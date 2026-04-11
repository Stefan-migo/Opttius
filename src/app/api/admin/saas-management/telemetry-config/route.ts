import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * GET /api/admin/saas-management/telemetry-config
 * Returns the global telemetry configuration (root/dev only)
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();

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
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Internal error in telemetry config GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/saas-management/telemetry-config
 * Updates the global telemetry configuration (root/dev only)
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await requireRoot(request);
    const { enabled } = await request.json();
    const supabase = createServiceRoleClient();

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
        last_modified_by: userId,
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
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Internal error in telemetry config PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
