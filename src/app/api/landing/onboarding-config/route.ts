/**
 * GET /api/landing/onboarding-config
 * Public endpoint: returns onboarding config for landing (signup visibility, stage mode).
 * Used by landing components and signup page to decide whether to show signup or redirect to solicitar-demo.
 */
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === '"true"';
  return false;
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: configs, error } = await supabase
      .from("system_config")
      .select("config_key, config_value")
      .in("config_key", ["signup_enabled", "onboarding_stage_mode"])
      .is("organization_id", null)
      .is("branch_id", null);

    if (error) {
      return NextResponse.json(
        { signupEnabled: false, stageMode: true },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        },
      );
    }

    const signupEnabled = parseBool(
      configs?.find((c) => c.config_key === "signup_enabled")?.config_value,
    );
    const stageMode = parseBool(
      configs?.find((c) => c.config_key === "onboarding_stage_mode")
        ?.config_value,
    );

    return NextResponse.json(
      { signupEnabled, stageMode },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { signupEnabled: false, stageMode: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      },
    );
  }
}
