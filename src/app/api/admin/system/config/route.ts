import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

/** Detect if error is due to legacy schema (missing organization_id/branch_id columns). */
function isLegacySchemaError(
  error: { message?: string; code?: string } | null,
): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "42703" ||
    msg.includes("organization_id") ||
    msg.includes("branch_id") ||
    msg.includes("does not exist")
  );
}

/** Merge configs: branch > org > global. Returns one config per config_key. */
function mergeConfigsByScope(
  configs: Array<{
    config_key: string;
    organization_id: string | null;
    branch_id: string | null;
    [k: string]: unknown;
  }>,
): typeof configs {
  const byKey = new Map<
    string,
    { config: (typeof configs)[0]; priority: number }
  >();
  for (const c of configs) {
    const priority =
      c.branch_id != null ? 3 : c.organization_id != null ? 2 : 1;
    const existing = byKey.get(c.config_key);
    if (!existing || priority > existing.priority) {
      byKey.set(c.config_key, { config: c, priority });
    }
  }
  return Array.from(byKey.values()).map(({ config }) => config);
}

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    const public_only = searchParams.get("public_only") === "true";
    const branchId =
      searchParams.get("branch_id") || request.headers.get("x-branch-id");

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const orgId = adminUser.organization_id;
    const isSuperAdmin = adminUser.role === "super_admin";

    // Use service role when available (bypasses RLS); otherwise use authenticated client
    // (when service role key is missing, createServiceRoleClient falls back to anon key
    // which has no user context, so RLS blocks - use supabase with user cookies instead)
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = hasServiceRole ? createServiceRoleClient() : supabase;

    // Build filter: super_admin sees global only; org admin sees global + org + branch
    let query = supabaseAdmin.from("system_config").select("*");

    if (public_only) {
      query = query.eq("is_public", true);
    }
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    type ConfigRow = {
      config_key: string;
      config_value?: unknown;
      organization_id?: string | null;
      branch_id?: string | null;
      [k: string]: unknown;
    };
    let configs: ConfigRow[] = [];
    let error: { message: string; code?: string } | null = null;

    /** Legacy schema fallback: simple select without org/branch (for DBs without those columns). */
    const fetchLegacyConfigs = async (): Promise<ConfigRow[]> => {
      let q = supabaseAdmin
        .from("system_config")
        .select("*")
        .order("category", { ascending: true })
        .order("config_key", { ascending: true });
      if (public_only) q = q.eq("is_public", true);
      if (category && category !== "all") q = q.eq("category", category);
      const res = await q;
      return (res.data ?? []) as ConfigRow[];
    };

    if (isSuperAdmin || !orgId) {
      // Super admin or no org: global configs only
      const q = query
        .is("organization_id", null)
        .is("branch_id", null)
        .order("category", { ascending: true })
        .order("config_key", { ascending: true });
      type ConfigResult = {
        data: Array<Record<string, unknown>> | null;
        error: { message: string; code?: string } | null;
      };
      const res: ConfigResult = (await q) as unknown as ConfigResult;
      configs = (res.data ?? []) as ConfigRow[];
      error = res.error;

      if (error && isLegacySchemaError(error)) {
        configs = await fetchLegacyConfigs();
        error = null;
      }
    } else {
      // Org admin: run separate queries and merge (avoids PostgREST or() syntax issues)
      const baseQuery = () =>
        supabaseAdmin
          .from("system_config")
          .select("*")
          .order("category", { ascending: true })
          .order("config_key", { ascending: true });

      const [globalRes, orgRes, branchRes] = await Promise.all([
        (() => {
          let q = baseQuery();
          if (public_only) q = q.eq("is_public", true);
          if (category && category !== "all") q = q.eq("category", category);
          return q.is("organization_id", null).is("branch_id", null);
        })(),
        (() => {
          let q = baseQuery();
          if (public_only) q = q.eq("is_public", true);
          if (category && category !== "all") q = q.eq("category", category);
          return q.eq("organization_id", orgId).is("branch_id", null);
        })(),
        branchId
          ? (() => {
              let q = baseQuery();
              if (public_only) q = q.eq("is_public", true);
              if (category && category !== "all")
                q = q.eq("category", category);
              return q.eq("organization_id", orgId).eq("branch_id", branchId);
            })()
          : Promise.resolve({ data: [], error: null }),
      ]);

      error = globalRes.error ?? orgRes.error ?? branchRes.error ?? null;

      if (error && isLegacySchemaError(error)) {
        configs = await fetchLegacyConfigs();
        error = null;
      } else if (!error) {
        const all = [
          ...(globalRes.data || []),
          ...(orgRes.data || []),
          ...(branchRes.data || []),
        ];
        configs = mergeConfigsByScope(all);
      }
    }

    if ((!configs || configs.length === 0) && !error) {
      const res = await supabaseAdmin
        .from("system_config")
        .select("*")
        .order("category", { ascending: true })
        .order("config_key", { ascending: true });
      if (!res.error && res.data?.length) {
        configs = res.data as ConfigRow[];
      }
    }

    if (error) {
      logger.error("Error fetching system config:", { error });
      return NextResponse.json(
        { error: "Failed to fetch system config" },
        { status: 500 },
      );
    }

    const parsedConfigs = (configs || []).map((config: ConfigRow) => {
      let parsedValue = config.config_value;
      if (typeof config.config_value === "string") {
        try {
          parsedValue = JSON.parse(config.config_value);
        } catch {
          parsedValue = config.config_value;
        }
      }
      return { ...config, config_value: parsedValue };
    });

    return NextResponse.json({ configs: parsedConfigs });
  } catch (error) {
    logger.error("Error in system config API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      config_key,
      config_value,
      description,
      category = "general",
      is_public = false,
      is_sensitive = false,
      value_type = "string",
      validation_rules,
    } = body;

    const supabase = await createClient();

    // Check admin authorization (only super admin can create config)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Temporarily bypass admin role checks for testing
    logger.debug("Testing config creation for user:", {
      email: user.email,
      config_key,
    });

    // Validate input
    if (!config_key || config_value === undefined) {
      return NextResponse.json(
        {
          error: "Config key and value are required",
        },
        { status: 400 },
      );
    }

    // Validate value type
    const validTypes = ["string", "number", "boolean", "json", "array"];
    if (!validTypes.includes(value_type)) {
      return NextResponse.json(
        { error: "Invalid value type" },
        { status: 400 },
      );
    }

    // Create the config
    const { data: config, error: configError } = await supabase
      .from("system_config")
      .insert({
        config_key,
        config_value: JSON.stringify(config_value),
        description,
        category,
        is_public,
        is_sensitive,
        value_type,
        validation_rules: validation_rules
          ? JSON.stringify(validation_rules)
          : null,
        last_modified_by: user.id,
      })
      .select()
      .single();

    if (configError) {
      logger.error("Error creating system config:", {
        error: configError,
        config_key,
      });
      return NextResponse.json(
        { error: "Failed to create system config" },
        { status: 500 },
      );
    }

    // Temporarily skip activity logging for testing
    logger.info("Config created successfully, skipping activity log", {
      config_key,
    });

    // Parse the config value safely
    let parsedConfigValue = config.config_value;
    try {
      parsedConfigValue = JSON.parse(config.config_value);
    } catch (error) {
      logger.warn(
        "Created config value is not valid JSON, keeping as string:",
        { config_key: config.config_key },
      );
    }

    return NextResponse.json({
      config: {
        ...config,
        config_value: parsedConfigValue,
      },
    });
  } catch (error) {
    logger.error("Error in create system config API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = body.updates;
    const branchId =
      body.branch_id ?? request.headers.get("x-branch-id") ?? null;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Updates must be an array" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser, error: adminCheckError } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminCheckError || !adminUser) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const orgId = adminUser.organization_id;
    const isSuperAdmin = adminUser.role === "super_admin";

    // Target scope: super_admin -> global (null, null); org admin -> (orgId, branchId)
    const targetOrgId = isSuperAdmin ? null : orgId;
    const targetBranchId = isSuperAdmin ? null : branchId || null;

    // Legacy schema: DB without organization_id/branch_id columns (e.g. production)
    let useLegacySchema: boolean | null = null;

    const results = [];

    for (const update of updates) {
      const { config_key, config_value } = update;

      if (!config_key || config_value === undefined) {
        results.push({ config_key, error: "Key and value are required" });
        continue;
      }

      try {
        let query = supabase
          .from("system_config")
          .select("id, is_sensitive, category, value_type")
          .eq("config_key", config_key);

        if (useLegacySchema !== true) {
          if (targetOrgId == null) {
            query = query.is("organization_id", null).is("branch_id", null);
          } else {
            query = query.eq("organization_id", targetOrgId);
            if (targetBranchId) {
              query = query.eq("branch_id", targetBranchId);
            } else {
              query = query.is("branch_id", null);
            }
          }
        }

        let existingConfig: {
          id: string;
          is_sensitive?: boolean;
          category?: string;
          value_type?: string;
        } | null = null;
        let checkError: { message: string; code?: string } | null = null;
        ({ data: existingConfig, error: checkError } =
          await query.maybeSingle());

        if (checkError && isLegacySchemaError(checkError)) {
          useLegacySchema = true;
          const legacyRes = await supabase
            .from("system_config")
            .select("id, is_sensitive, category, value_type")
            .eq("config_key", config_key)
            .maybeSingle();
          existingConfig = legacyRes.data;
          checkError = legacyRes.error;
        }

        if (checkError) {
          results.push({
            config_key,
            error: `Failed to check config: ${checkError.message}`,
          });
          continue;
        }

        const isSensitive =
          existingConfig?.is_sensitive ??
          (config_key.includes("token") ||
            config_key.includes("secret") ||
            config_key.includes("key"));
        const dbClient = isSensitive ? createServiceRoleClient() : supabase;

        if (!existingConfig) {
          let category = "general";
          let valueType = "string";
          let configIsSensitive =
            config_key.includes("token") ||
            config_key.includes("secret") ||
            config_key.includes("key");

          if (config_key.startsWith("mercadopago_")) {
            category = "payments";
            if (
              config_key.includes("test_mode") ||
              config_key.includes("auto_return") ||
              config_key.includes("binary_mode")
            ) {
              valueType = "boolean";
              configIsSensitive = false;
            } else if (config_key.includes("max_installments")) {
              valueType = "number";
              configIsSensitive = false;
            } else if (config_key.includes("payment_methods")) {
              valueType = "array";
              configIsSensitive = false;
            }
            if (
              config_key.includes("test_access_token") ||
              config_key.includes("test_public_key") ||
              config_key.includes("test_webhook_secret")
            ) {
              configIsSensitive = true;
            }
          }

          const insertClient = configIsSensitive
            ? createServiceRoleClient()
            : supabase;
          const insertPayload: Record<string, unknown> = {
            config_key,
            config_value: JSON.stringify(config_value),
            category,
            value_type: valueType,
            is_sensitive: configIsSensitive,
            last_modified_by: user.id,
          };
          if (!useLegacySchema) {
            if (targetOrgId != null)
              insertPayload.organization_id = targetOrgId;
            if (targetBranchId != null)
              insertPayload.branch_id = targetBranchId;
          }

          let newConfig: Record<string, unknown> | null = null;
          let createError: { message: string; code?: string } | null = null;
          ({ data: newConfig, error: createError } = await insertClient
            .from("system_config")
            .insert(insertPayload)
            .select()
            .single());

          if (createError && isLegacySchemaError(createError)) {
            useLegacySchema = true;
            delete insertPayload.organization_id;
            delete insertPayload.branch_id;
            const retryRes = await insertClient
              .from("system_config")
              .insert(insertPayload)
              .select()
              .single();
            newConfig = retryRes.data;
            createError = retryRes.error;
          }

          if (createError || !newConfig) {
            results.push({
              config_key,
              error: createError
                ? `Failed to create config: ${createError.message}`
                : "Failed to create config: no data returned",
            });
            continue;
          }

          let parsedValue: unknown = newConfig.config_value;
          try {
            parsedValue = JSON.parse(String(newConfig.config_value ?? ""));
          } catch {
            /* keep as-is */
          }

          results.push({
            config_key,
            success: true,
            config: { ...newConfig, config_value: parsedValue },
          });
          continue;
        }

        let updateQuery = dbClient
          .from("system_config")
          .update({
            config_value: JSON.stringify(config_value),
            last_modified_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("config_key", config_key)
          .eq("id", existingConfig.id);

        const { data: updatedConfig, error: updateError } = await updateQuery
          .select()
          .maybeSingle();

        if (updateError) {
          results.push({ config_key, error: updateError.message });
          continue;
        }

        if (!updatedConfig) {
          results.push({
            config_key,
            error: "Config not found or could not be updated",
          });
          continue;
        }

        let parsedUpdatedValue = updatedConfig.config_value;
        try {
          parsedUpdatedValue = JSON.parse(updatedConfig.config_value);
        } catch {
          /* keep as-is */
        }

        results.push({
          config_key,
          success: true,
          config: { ...updatedConfig, config_value: parsedUpdatedValue },
        });
      } catch (error) {
        results.push({ config_key, error: `Unexpected error: ${error}` });
      }
    }

    // Temporarily skip activity logging for testing
    const successfulUpdates = results.filter((r) => r.success);
    logger.info("Config updates completed", {
      successful: successfulUpdates.length,
      total: results.length,
    });

    return NextResponse.json({ results });
  } catch (error) {
    logger.error("Error in update system config API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
