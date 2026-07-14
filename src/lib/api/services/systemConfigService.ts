/**
 * System Config Service
 * Business logic layer for system configuration operations
 */
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { mergeConfigsByScope } from "@/lib/admin/system-config-utils";
import { createConfigValueSchema } from "@/lib/api/validation/zod-schemas";

interface ConfigRow {
  config_key: string;
  config_value?: unknown;
  organization_id?: string | null;
  branch_id?: string | null;
  [k: string]: unknown;
}

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

function parseConfigValue(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function fetchLegacyConfigs(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  publicOnly: boolean,
  category: string,
): Promise<ConfigRow[]> {
  let q = supabaseAdmin
    .from("system_config")
    .select("*")
    .order("category", { ascending: true })
    .order("config_key", { ascending: true });
  if (publicOnly) q = q.eq("is_public", true);
  if (category && category !== "all") q = q.eq("category", category);
  const res = await q;
  return (res.data ?? []) as ConfigRow[];
}

async function getAdminAuth(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ user: { id: string }; orgId: string | null; isSuperAdmin: boolean }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("organization_id, role")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!adminUser) throw new Error("Admin access required");

  return {
    user,
    orgId: adminUser.organization_id,
    isSuperAdmin: adminUser.role === "super_admin",
  };
}

export async function getSystemConfigs(params: {
  category: string;
  publicOnly: boolean;
  branchId: string | null;
}): Promise<{ configs: ConfigRow[] }> {
  const { category, publicOnly, branchId } = params;
  const supabase = await createClient();
  const { user, orgId, isSuperAdmin } = await getAdminAuth(supabase);

  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAdmin = hasServiceRole ? createServiceRoleClient() : supabase;

  let query = supabaseAdmin.from("system_config").select("*");
  if (publicOnly) query = query.eq("is_public", true);
  if (category && category !== "all") query = query.eq("category", category);

  let configs: ConfigRow[] = [];
  let error: { message: string; code?: string } | null = null;

  if (isSuperAdmin && !branchId) {
    const res = await query
      .is("organization_id", null)
      .is("branch_id", null)
      .order("category", { ascending: true })
      .order("config_key", { ascending: true });
    configs = (res.data ?? []) as ConfigRow[];
    error = res.error as { message: string; code?: string } | null;
    if (error && isLegacySchemaError(error)) {
      configs = await fetchLegacyConfigs(supabaseAdmin, publicOnly, category);
      error = null;
    }
  } else if (isSuperAdmin && branchId && orgId) {
    const { data: branch } = await supabase
      .from("branches")
      .select("id, organization_id")
      .eq("id", branchId)
      .maybeSingle();
    if (branch && branch.organization_id === orgId) {
      const baseQuery = () =>
        supabaseAdmin
          .from("system_config")
          .select("*")
          .order("category", { ascending: true })
          .order("config_key", { ascending: true });
      const [globalRes, orgRes, branchRes] = await Promise.all([
        (() => {
          let q = baseQuery();
          if (publicOnly) q = q.eq("is_public", true);
          if (category && category !== "all") q = q.eq("category", category);
          return q.is("organization_id", null).is("branch_id", null);
        })(),
        (() => {
          let q = baseQuery();
          if (publicOnly) q = q.eq("is_public", true);
          if (category && category !== "all") q = q.eq("category", category);
          return q.eq("organization_id", orgId).is("branch_id", null);
        })(),
        (() => {
          let q = baseQuery();
          if (publicOnly) q = q.eq("is_public", true);
          if (category && category !== "all") q = q.eq("category", category);
          return q.eq("organization_id", orgId).eq("branch_id", branchId);
        })(),
      ]);
      error = globalRes.error ?? orgRes.error ?? branchRes.error ?? null;
      if (error && isLegacySchemaError(error)) {
        configs = await fetchLegacyConfigs(supabaseAdmin, publicOnly, category);
        error = null;
      } else if (!error) {
        configs = mergeConfigsByScope([
          ...(globalRes.data || []),
          ...(orgRes.data || []),
          ...(branchRes.data || []),
        ]);
      }
    } else {
      const res = await query
        .is("organization_id", null)
        .is("branch_id", null)
        .order("category", { ascending: true })
        .order("config_key", { ascending: true });
      configs = (res.data ?? []) as ConfigRow[];
    }
  } else if (!orgId) {
    const res = await query
      .is("organization_id", null)
      .is("branch_id", null)
      .order("category", { ascending: true })
      .order("config_key", { ascending: true });
    configs = (res.data ?? []) as ConfigRow[];
    error = null;
  } else {
    const baseQuery = () =>
      supabaseAdmin
        .from("system_config")
        .select("*")
        .order("category", { ascending: true })
        .order("config_key", { ascending: true });
    const [globalRes, orgRes, branchRes] = await Promise.all([
      (() => {
        let q = baseQuery();
        if (publicOnly) q = q.eq("is_public", true);
        if (category && category !== "all") q = q.eq("category", category);
        return q.is("organization_id", null).is("branch_id", null);
      })(),
      (() => {
        let q = baseQuery();
        if (publicOnly) q = q.eq("is_public", true);
        if (category && category !== "all") q = q.eq("category", category);
        return q.eq("organization_id", orgId).is("branch_id", null);
      })(),
      branchId
        ? (() => {
            let q = baseQuery();
            if (publicOnly) q = q.eq("is_public", true);
            if (category && category !== "all") q = q.eq("category", category);
            return q.eq("organization_id", orgId).eq("branch_id", branchId);
          })()
        : Promise.resolve({ data: [], error: null }),
    ]);
    error = globalRes.error ?? orgRes.error ?? branchRes.error ?? null;
    if (error && isLegacySchemaError(error)) {
      configs = await fetchLegacyConfigs(supabaseAdmin, publicOnly, category);
      error = null;
    } else if (!error) {
      configs = mergeConfigsByScope([
        ...(globalRes.data || []),
        ...(orgRes.data || []),
        ...(branchRes.data || []),
      ]);
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
    throw new Error("Failed to fetch system config");
  }

  const parsedConfigs = (configs || []).map((config) => ({
    ...config,
    config_value: parseConfigValue(config.config_value),
  }));

  return { configs: parsedConfigs };
}

async function resolveScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  branchId: string | null,
  orgId: string | null,
  isSuperAdmin: boolean,
): Promise<{ targetOrgId: string | null; targetBranchId: string | null }> {
  if (isSuperAdmin) {
    if (branchId && orgId) {
      const { data: branch } = await supabase
        .from("branches")
        .select("id, organization_id")
        .eq("id", branchId)
        .maybeSingle();
      if (!branch || branch.organization_id !== orgId) {
        throw new Error(
          "Sucursal no válida o no pertenece a tu organización. Selecciona una sucursal válida.",
        );
      }
      return { targetOrgId: orgId, targetBranchId: branchId };
    }
    return { targetOrgId: null, targetBranchId: null };
  }
  if (branchId && orgId) {
    const { data: branch } = await supabase
      .from("branches")
      .select("id, organization_id")
      .eq("id", branchId)
      .maybeSingle();
    if (!branch || branch.organization_id !== orgId) {
      throw new Error("Sucursal no válida o no pertenece a tu organización.");
    }
  }
  return { targetOrgId: orgId, targetBranchId: branchId || null };
}

export async function createSystemConfig(body: Record<string, unknown>): Promise<{ config: Record<string, unknown> }> {
  const supabase = await createClient();
  const { user, orgId, isSuperAdmin } = await getAdminAuth(supabase);
  const branchId = (body.branch_id as string | null) ?? null;

  const { targetOrgId, targetBranchId } = await resolveScope(
    supabase,
    branchId,
    orgId,
    isSuperAdmin,
  );

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

  // Validate input
  if (!config_key || config_value === undefined) {
    throw new Error("Config key and value are required");
  }

  const validTypes = ["string", "number", "boolean", "json", "array"];
  if (!validTypes.includes(value_type as string)) {
    throw new Error("Invalid value type");
  }

  const valueParse = createConfigValueSchema(value_type as string).safeParse(config_value);
  if (!valueParse.success) {
    const msg = valueParse.error.errors[0]?.message ?? "Valor inválido";
    throw new Error(`config_value: ${msg}`);
  }

  const insertPayload: Record<string, unknown> = {
    config_key,
    config_value: JSON.stringify(valueParse.data),
    description,
    category,
    is_public,
    is_sensitive,
    value_type,
    validation_rules: validation_rules ? JSON.stringify(validation_rules) : null,
    last_modified_by: user.id,
  };

  if (targetOrgId != null) insertPayload.organization_id = targetOrgId;
  if (targetBranchId != null) insertPayload.branch_id = targetBranchId;

  const { data: config, error: configError } = await supabase
    .from("system_config")
    .insert(insertPayload)
    .select()
    .single();

  if (configError) {
    if (isLegacySchemaError(configError)) {
      delete insertPayload.organization_id;
      delete insertPayload.branch_id;
      const retryRes = await supabase
        .from("system_config")
        .insert(insertPayload)
        .select()
        .single();
      if (retryRes.error) {
        logger.error("Error creating system config:", { error: retryRes.error, config_key });
        throw new Error("Failed to create system config");
      }
      const retryConfig = retryRes.data;
      return { config: { ...retryConfig, config_value: parseConfigValue(retryConfig?.config_value) } };
    }
    logger.error("Error creating system config:", { error: configError, config_key });
    throw new Error("Failed to create system config");
  }

  return { config: { ...config, config_value: parseConfigValue(config.config_value) } };
}

export async function updateSystemConfigs(
  body: Record<string, unknown>,
  branchIdFromHeaders: string | null,
): Promise<{ results: Array<Record<string, unknown>> }> {
  const supabase = await createClient();
  const { user, orgId, isSuperAdmin } = await getAdminAuth(supabase);
  const updates = body.updates as Array<Record<string, unknown>> | undefined;
  const branchId = body.branch_id as string | null ?? branchIdFromHeaders;

  if (!Array.isArray(updates)) {
    throw new Error("Updates must be an array");
  }

  const { targetOrgId, targetBranchId } = await resolveScope(supabase, branchId, orgId, isSuperAdmin);

  let useLegacySchema: boolean | null = null;
  const results: Array<Record<string, unknown>> = [];

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

      let existingConfig: Record<string, unknown> | null = null;
      let checkError: { message: string; code?: string } | null = null;
      ({ data: existingConfig, error: checkError } = await query.maybeSingle());

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
        results.push({ config_key, error: `Failed to check config: ${checkError.message}` });
        continue;
      }

      let valueTypeToUse = (existingConfig?.value_type as string) ?? "string";
      if (!existingConfig) {
        if (config_key === "signup_enabled" || config_key === "onboarding_stage_mode") {
          valueTypeToUse = "boolean";
        } else if ((config_key as string).startsWith("mercadopago_")) {
          if (
            (config_key as string).includes("test_mode") ||
            (config_key as string).includes("auto_return") ||
            (config_key as string).includes("binary_mode")
          ) {
            valueTypeToUse = "boolean";
          } else if ((config_key as string).includes("max_installments")) {
            valueTypeToUse = "number";
          } else if ((config_key as string).includes("payment_methods")) {
            valueTypeToUse = "array";
          }
        }
      }

      const valueParse = createConfigValueSchema(valueTypeToUse).safeParse(config_value);
      if (!valueParse.success) {
        const msg = valueParse.error.errors[0]?.message ?? "Valor inválido";
        results.push({ config_key, error: `config_value: ${msg}` });
        continue;
      }
      const validatedValue = valueParse.data;

      const isSensitive =
        (existingConfig?.is_sensitive as boolean) ??
        ((config_key as string).includes("token") ||
          (config_key as string).includes("secret") ||
          (config_key as string).includes("key"));

      const dbClient = isSensitive ? createServiceRoleClient() : supabase;

      if (!existingConfig) {
        let category = "general";
        let valueType = "string";
        let configIsSensitive =
          (config_key as string).includes("token") ||
          (config_key as string).includes("secret") ||
          (config_key as string).includes("key");

        if (config_key === "signup_enabled" || config_key === "onboarding_stage_mode") {
          category = "onboarding";
          valueType = "boolean";
        } else if ((config_key as string).startsWith("mercadopago_")) {
          category = "payments";
          if (
            (config_key as string).includes("test_mode") ||
            (config_key as string).includes("auto_return") ||
            (config_key as string).includes("binary_mode")
          ) {
            valueType = "boolean";
            configIsSensitive = false;
          } else if ((config_key as string).includes("max_installments")) {
            valueType = "number";
            configIsSensitive = false;
          } else if ((config_key as string).includes("payment_methods")) {
            valueType = "array";
            configIsSensitive = false;
          }
          if (
            (config_key as string).includes("test_access_token") ||
            (config_key as string).includes("test_public_key") ||
            (config_key as string).includes("test_webhook_secret")
          ) {
            configIsSensitive = true;
          }
        }

        const insertClient = configIsSensitive ? createServiceRoleClient() : supabase;
        const insertPayload: Record<string, unknown> = {
          config_key,
          config_value: JSON.stringify(validatedValue),
          category,
          value_type: valueType,
          is_sensitive: configIsSensitive,
          last_modified_by: user.id,
        };
        if (!useLegacySchema) {
          if (targetOrgId != null) insertPayload.organization_id = targetOrgId;
          if (targetBranchId != null) insertPayload.branch_id = targetBranchId;
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
            error: createError ? `Failed to create config: ${createError.message}` : "Failed to create config: no data returned",
          });
          continue;
        }

        results.push({
          config_key,
          success: true,
          config: { ...newConfig, config_value: parseConfigValue(newConfig.config_value) },
        });
        continue;
      }

      const { data: updatedConfig, error: updateError } = await dbClient
        .from("system_config")
        .update({
          config_value: JSON.stringify(validatedValue),
          last_modified_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("config_key", config_key)
        .eq("id", existingConfig.id)
        .select()
        .maybeSingle();

      if (updateError) {
        results.push({ config_key, error: updateError.message });
        continue;
      }
      if (!updatedConfig) {
        results.push({ config_key, error: "Config not found or could not be updated" });
        continue;
      }

      results.push({
        config_key,
        success: true,
        config: { ...updatedConfig, config_value: parseConfigValue(updatedConfig.config_value) },
      });
    } catch (error) {
      results.push({ config_key, error: `Unexpected error: ${error}` });
    }
  }

  logger.info("Config updates completed", {
    successful: results.filter((r) => r.success).length,
    total: results.length,
  });

  return { results };
}

export { isLegacySchemaError };
