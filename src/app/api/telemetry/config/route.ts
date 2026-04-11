import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get telemetry state from system_config (public check)
    const { data: config, error: configError } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_key", "telemetry_enabled")
      .maybeSingle();

    if (configError) {
      return NextResponse.json({ enabled: true }); // Default to true on error
    }

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
    }

    return NextResponse.json({ enabled });
  } catch (error) {
    return NextResponse.json({ enabled: true });
  }
}
