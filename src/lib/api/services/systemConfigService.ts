/**
 * System Config Service — Business logic layer for system configuration operations.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { mergeConfigsByScope } from "@/lib/admin/system-config-utils";
import { createConfigValueSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

import {
  fetchLegacyConfigs, getAdminAuth, isLegacySchemaError, parseConfigValue, resolveScope,
} from "./_helpers/systemConfigHelpers";

function applyScopeFilters(query: ReturnType<ReturnType<typeof createServiceRoleClient>["from"]>, publicOnly: boolean, category: string, orgId: string | null, branchId: string | null) {
  let q = query.order("category", { ascending: true }).order("config_key", { ascending: true });
  if (publicOnly) q = (q as unknown).eq("is_public", true);
  if (category && category !== "all") q = (q as unknown).eq("category", category);
  if (orgId != null) q = (q as unknown).eq("organization_id", orgId);
  else q = (q as unknown).is("organization_id", null);
  if (branchId != null) q = (q as unknown).eq("branch_id", branchId);
  else q = (q as unknown).is("branch_id", null);
  return q;
}

export async function getSystemConfigs(params: { category: string; publicOnly: boolean; branchId: string | null }, authClient?: SupabaseClient): Promise<{ configs: unknown[] }> {
  const { category, publicOnly, branchId } = params;
  const supabase = authClient ?? await createClient();
  const { orgId, isSuperAdmin } = await getAdminAuth(supabase);
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAdmin = hasServiceRole ? createServiceRoleClient() : supabase;

  let configs: unknown[] = [];
  let error: { message: string; code?: string } | null = null;

  if (isSuperAdmin && !branchId) {
    const res = await supabaseAdmin.from("system_config").select("*").is("organization_id", null).is("branch_id", null).order("category", { ascending: true }).order("config_key", { ascending: true });
    configs = (res.data ?? []) as unknown[];
    error = res.error as { message: string; code?: string } | null;
    if (error && isLegacySchemaError(error)) { configs = await fetchLegacyConfigs(supabaseAdmin, publicOnly, category); error = null; }
  } else if (isSuperAdmin && branchId && orgId) {
    const { data: branch } = await supabase.from("branches").select("id, organization_id").eq("id", branchId).maybeSingle();
    if (branch && branch.organization_id === orgId) {
      const [gRes, oRes, bRes] = await Promise.all([
        applyScopeFilters(supabaseAdmin.from("system_config").select("*"), publicOnly, category, null, null),
        applyScopeFilters(supabaseAdmin.from("system_config").select("*"), publicOnly, category, orgId, null),
        applyScopeFilters(supabaseAdmin.from("system_config").select("*"), publicOnly, category, orgId, branchId),
      ]);
      error = gRes.error ?? oRes.error ?? bRes.error ?? null;
      if (error && isLegacySchemaError(error)) { configs = await fetchLegacyConfigs(supabaseAdmin, publicOnly, category); error = null; }
      else if (!error) configs = mergeConfigsByScope([...(gRes.data || []), ...(oRes.data || []), ...(bRes.data || [])]);
    } else {
      const res = await supabaseAdmin.from("system_config").select("*").is("organization_id", null).is("branch_id", null).order("category", { ascending: true }).order("config_key", { ascending: true });
      configs = (res.data ?? []) as unknown[];
    }
  } else {
    const [gRes, oRes] = await Promise.all([
      applyScopeFilters(supabaseAdmin.from("system_config").select("*"), publicOnly, category, null, null),
      applyScopeFilters(supabaseAdmin.from("system_config").select("*"), publicOnly, category, orgId, null),
    ]);
    error = gRes.error ?? oRes.error ?? null;
    if (error && isLegacySchemaError(error)) { configs = await fetchLegacyConfigs(supabaseAdmin, publicOnly, category); error = null; }
    else if (!error) configs = mergeConfigsByScope([...(gRes.data || []), ...(oRes.data || [])]);
    if (branchId && orgId) {
      const bRes = await applyScopeFilters(supabaseAdmin.from("system_config").select("*"), publicOnly, category, orgId, branchId);
      if (!bRes.error) configs = mergeConfigsByScope([...(configs as unknown[]), ...(bRes.data || [])]);
    }
  }

  if ((!configs || configs.length === 0) && !error) {
    const res = await supabaseAdmin.from("system_config").select("*").order("category", { ascending: true }).order("config_key", { ascending: true });
    if (!res.error && res.data?.length) configs = res.data as unknown[];
  }

  if (error) { logger.error("Error fetching system config:", { error }); throw new Error("Failed to fetch system config"); }
  return { configs: (configs || []).map((c: unknown) => ({ ...c, config_value: parseConfigValue(c.config_value) })) };
}

export async function createSystemConfig(body: Record<string, unknown>, authClient?: SupabaseClient): Promise<{ config: Record<string, unknown> }> {
  const supabase = authClient ?? await createClient();
  const { user, orgId, isSuperAdmin } = await getAdminAuth(supabase);
  const { targetOrgId, targetBranchId } = await resolveScope(supabase, (body.branch_id as string | null) ?? null, orgId, isSuperAdmin);
  const { config_key, config_value, description, category = "general", is_public = false, is_sensitive = false, value_type = "string", validation_rules } = body;

  if (!config_key || config_value === undefined) throw new Error("Config key and value are required");
  if (!["string", "number", "boolean", "json", "array"].includes(value_type as string)) throw new Error("Invalid value type");

  const valueParse = createConfigValueSchema(value_type as string).safeParse(config_value);
  if (!valueParse.success) throw new Error(`config_value: ${valueParse.error.errors[0]?.message ?? "Valor inválido"}`);

  const insertPayload: Record<string, unknown> = { config_key, config_value: JSON.stringify(valueParse.data), description, category, is_public, is_sensitive, value_type, validation_rules: validation_rules ? JSON.stringify(validation_rules) : null, last_modified_by: user.id };
  if (targetOrgId != null) insertPayload.organization_id = targetOrgId;
  if (targetBranchId != null) insertPayload.branch_id = targetBranchId;

  const { data: config, error: configError } = await supabase.from("system_config").insert(insertPayload).select().single();
  if (configError) {
    if (isLegacySchemaError(configError)) {
      delete insertPayload.organization_id; delete insertPayload.branch_id;
      const retryRes = await supabase.from("system_config").insert(insertPayload).select().single();
      if (retryRes.error) { logger.error("Error creating system config:", { error: retryRes.error, config_key }); throw new Error("Failed to create system config"); }
      return { config: { ...retryRes.data!, config_value: parseConfigValue((retryRes.data as unknown)?.config_value) } };
    }
    logger.error("Error creating system config:", { error: configError, config_key }); throw new Error("Failed to create system config");
  }
  return { config: { ...config!, config_value: parseConfigValue((config as unknown).config_value) } };
}

export async function updateSystemConfigs(body: Record<string, unknown>, branchIdFromHeaders: string | null, authClient?: SupabaseClient): Promise<{ results: Array<Record<string, unknown>> }> {
  const supabase = authClient ?? await createClient();
  const { user, orgId, isSuperAdmin } = await getAdminAuth(supabase);
  const updates = body.updates as Array<Record<string, unknown>> | undefined;
  const branchId = (body.branch_id as string | null) ?? branchIdFromHeaders;
  if (!Array.isArray(updates)) throw new Error("Updates must be an array");
  const { targetOrgId, targetBranchId } = await resolveScope(supabase, branchId, orgId, isSuperAdmin);

  let useLegacySchema: boolean | null = null;
  const results: Array<Record<string, unknown>> = [];

  for (const update of updates) {
    const { config_key, config_value } = update;
    if (!config_key || config_value === undefined) { results.push({ config_key, error: "Key and value are required" }); continue; }
    try {
      let query = supabase.from("system_config").select("id, is_sensitive, category, value_type").eq("config_key", config_key);
      if (useLegacySchema !== true) {
        if (targetOrgId == null) query = (query as unknown).is("organization_id", null).is("branch_id", null);
        else {
          query = (query as unknown).eq("organization_id", targetOrgId);
          query = targetBranchId ? (query as unknown).eq("branch_id", targetBranchId) : (query as unknown).is("branch_id", null);
        }
      }
      let existingConfig: Record<string, unknown> | null = null;
      let checkError: { message: string; code?: string } | null = null;
      ({ data: existingConfig, error: checkError } = await (query as unknown).maybeSingle());

      if (checkError && isLegacySchemaError(checkError)) {
        useLegacySchema = true;
        const legacyRes = await supabase.from("system_config").select("id, is_sensitive, category, value_type").eq("config_key", config_key).maybeSingle();
        existingConfig = legacyRes.data; checkError = legacyRes.error;
      }
      if (checkError) { results.push({ config_key, error: `Failed to check config: ${checkError.message}` }); continue; }

      let valueTypeToUse = (existingConfig?.value_type as string) ?? "string";
      if (!existingConfig) {
        if (config_key === "signup_enabled" || config_key === "onboarding_stage_mode") valueTypeToUse = "boolean";
        else if ((config_key as string).startsWith("mercadopago_")) {
          const k = config_key as string;
          if (k.includes("test_mode") || k.includes("auto_return") || k.includes("binary_mode")) valueTypeToUse = "boolean";
          else if (k.includes("max_installments")) valueTypeToUse = "number";
          else if (k.includes("payment_methods")) valueTypeToUse = "array";
        }
      }
      const valueParse = createConfigValueSchema(valueTypeToUse).safeParse(config_value);
      if (!valueParse.success) { results.push({ config_key, error: `config_value: ${valueParse.error.errors[0]?.message ?? "Valor inválido"}` }); continue; }
      const validatedValue = valueParse.data;
      const isSensitive = (existingConfig?.is_sensitive as boolean) ?? ((config_key as string).includes("token") || (config_key as string).includes("secret") || (config_key as string).includes("key"));
      const dbClient = isSensitive ? createServiceRoleClient() : supabase;

      if (!existingConfig) {
        let category = "general"; let valueType = "string";
        let configIsSensitive = (config_key as string).includes("token") || (config_key as string).includes("secret") || (config_key as string).includes("key");
        if (config_key === "signup_enabled" || config_key === "onboarding_stage_mode") { category = "onboarding"; valueType = "boolean"; }
        else if ((config_key as string).startsWith("mercadopago_")) {
          category = "payments"; const k = config_key as string;
          if (k.includes("test_mode") || k.includes("auto_return") || k.includes("binary_mode")) { valueType = "boolean"; configIsSensitive = false; }
          else if (k.includes("max_installments")) { valueType = "number"; configIsSensitive = false; }
          else if (k.includes("payment_methods")) { valueType = "array"; configIsSensitive = false; }
          if (k.includes("test_access_token") || k.includes("test_public_key") || k.includes("test_webhook_secret")) configIsSensitive = true;
        }
        const ic = configIsSensitive ? createServiceRoleClient() : supabase;
        const payload: Record<string, unknown> = { config_key, config_value: JSON.stringify(validatedValue), category, value_type: valueType, is_sensitive: configIsSensitive, last_modified_by: user.id };
        if (!useLegacySchema) { if (targetOrgId != null) payload.organization_id = targetOrgId; if (targetBranchId != null) payload.branch_id = targetBranchId; }
        let newCfg: Record<string, unknown> | null = null; let ce: { message: string; code?: string } | null = null;
        ({ data: newCfg, error: ce } = await ic.from("system_config").insert(payload).select().single());
        if (ce && isLegacySchemaError(ce)) { useLegacySchema = true; delete payload.organization_id; delete payload.branch_id; const rr = await ic.from("system_config").insert(payload).select().single(); newCfg = rr.data; ce = rr.error; }
        if (ce || !newCfg) { results.push({ config_key, error: ce ? `Failed to create config: ${ce.message}` : "Failed to create config: no data returned" }); continue; }
        results.push({ config_key, success: true, config: { ...newCfg, config_value: parseConfigValue(newCfg.config_value) } }); continue;
      }
      const { data: updatedConfig, error: updateError } = await dbClient.from("system_config").update({ config_value: JSON.stringify(validatedValue), last_modified_by: user.id, updated_at: new Date().toISOString() }).eq("config_key", config_key).eq("id", existingConfig.id).select().maybeSingle();
      if (updateError) { results.push({ config_key, error: updateError.message }); continue; }
      if (!updatedConfig) { results.push({ config_key, error: "Config not found or could not be updated" }); continue; }
      results.push({ config_key, success: true, config: { ...updatedConfig, config_value: parseConfigValue(updatedConfig.config_value) } });
    } catch (error) { results.push({ config_key, error: `Unexpected error: ${error}` }); }
  }
  logger.info("Config updates completed", { successful: results.filter((r) => r.success).length, total: results.length });
  return { results };
}

export { isLegacySchemaError };
