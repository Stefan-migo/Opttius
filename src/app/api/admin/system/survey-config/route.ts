import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { z } from "zod";

const SURVEY_CONFIG_KEYS = [
  "survey_enabled",
  "survey_scale_type",
  "survey_question",
] as const;

const surveyConfigSchema = z.object({
  survey_enabled: z.boolean().optional(),
  survey_scale_type: z.enum(["1-5", "1-10"]).optional(),
  survey_question: z.string().max(500).optional(),
});

export const dynamic = "force-dynamic";

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("organization_id")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return adminUser?.organization_id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const orgId = await getOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: rows, error } = await serviceSupabase
      .from("system_config")
      .select("config_key, config_value")
      .eq("organization_id", orgId)
      .is("branch_id", null)
      .in("config_key", SURVEY_CONFIG_KEYS);

    if (error) {
      logger.error("Error fetching survey config", error);
      return NextResponse.json(
        { error: "Error al cargar configuración" },
        { status: 500 },
      );
    }

    const config: Record<string, unknown> = {
      survey_enabled: false,
      survey_scale_type: "1-5",
      survey_question: "",
    };

    for (const row of rows ?? []) {
      try {
        const val = JSON.parse(String(row.config_value ?? ""));
        config[row.config_key] = val;
      } catch {
        config[row.config_key] = row.config_value;
      }
    }

    return NextResponse.json({ config });
  } catch (err) {
    logger.error("Survey config GET error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const orgId = await getOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = surveyConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue;

      const { data: existing } = await serviceSupabase
        .from("system_config")
        .select("id")
        .eq("config_key", key)
        .eq("organization_id", orgId)
        .is("branch_id", null)
        .maybeSingle();

      const payload = {
        config_key: key,
        config_value: JSON.stringify(value),
        category: "survey",
        organization_id: orgId,
        branch_id: null,
        last_modified_by: userId,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await serviceSupabase
          .from("system_config")
          .update(payload)
          .eq("id", existing.id);
      } else {
        await serviceSupabase.from("system_config").insert(payload);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Survey config PUT error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
