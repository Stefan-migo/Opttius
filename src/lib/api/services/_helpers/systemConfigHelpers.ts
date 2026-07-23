import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger as logger } from "@/lib/logger";
import type { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export interface ConfigRow {
  config_key: string; config_value?: unknown; organization_id?: string | null; branch_id?: string | null;
  [k: string]: unknown;
}

export function isLegacySchemaError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return error.code === "42703" || msg.includes("organization_id") || msg.includes("branch_id") || msg.includes("does not exist");
}

export function parseConfigValue(value: unknown): unknown {
  if (typeof value === "string") { try { return JSON.parse(value); } catch { return value; } }
  return value;
}

export async function fetchLegacyConfigs(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  publicOnly: boolean, category: string,
): Promise<ConfigRow[]> {
  let q = supabaseAdmin.from("system_config").select("*").order("category", { ascending: true }).order("config_key", { ascending: true });
  if (publicOnly) q = q.eq("is_public", true);
  if (category && category !== "all") q = q.eq("category", category);
  const res = await q;
  return (res.data ?? []) as ConfigRow[];
}

export async function getAdminAuth(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ user: { id: string }; orgId: string | null; isSuperAdmin: boolean }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");
  const { data: adminUser } = await supabase.from("admin_users").select("organization_id, role").eq("id", user.id).eq("is_active", true).maybeSingle();
  if (!adminUser) throw new Error("Admin access required");
  return { user, orgId: adminUser.organization_id, isSuperAdmin: adminUser.role === "super_admin" };
}

export async function resolveScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  branchId: string | null, orgId: string | null, isSuperAdmin: boolean,
): Promise<{ targetOrgId: string | null; targetBranchId: string | null }> {
  if (isSuperAdmin) {
    if (branchId && orgId) {
      const { data: branch } = await supabase.from("branches").select("id, organization_id").eq("id", branchId).maybeSingle();
      if (!branch || branch.organization_id !== orgId) throw new Error("Sucursal no válida o no pertenece a tu organización. Selecciona una sucursal válida.");
      return { targetOrgId: orgId, targetBranchId: branchId };
    }
    return { targetOrgId: null, targetBranchId: null };
  }
  if (branchId && orgId) {
    const { data: branch } = await supabase.from("branches").select("id, organization_id").eq("id", branchId).maybeSingle();
    if (!branch || branch.organization_id !== orgId) throw new Error("Sucursal no válida o no pertenece a tu organización.");
  }
  return { targetOrgId: orgId, targetBranchId: branchId || null };
}
