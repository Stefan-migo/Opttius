/**
 * Organizational Memory Helpers
 *
 * Data-fetching helper functions extracted from OrganizationalMemory.
 * Each takes explicit dependencies (supabase, organizationId) instead of relying on `this`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger } from '@/lib/logger';
import type { Database } from "@/types/supabase";

import type { ActivityMetrics,OrganizationalContext } from "./index";

export async function getOrganizationData(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<unknown> {
  const { data, error } = await supabase
    .from("organizations")
    .select("name, created_at")
    .eq("id", organizationId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrganizationSettings(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<unknown> {
  const { data, error } = await supabase
    .from("organization_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    appLogger.error("Error fetching organization settings:", error);
    return null;
  }

  return data;
}

/** Get currency from system_config (org-level first, then global). */
export async function getSystemConfigCurrency(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<string | null> {
  // Try org-level first
  const { data: orgData } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_key", "currency")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (orgData?.config_value) {
    const val = orgData.config_value;
    return typeof val === "string" ? val : String(val);
  }

  // Fallback to global
  const { data: globalData } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_key", "currency")
    .is("organization_id", null)
    .is("branch_id", null)
    .maybeSingle();

  if (globalData?.config_value) {
    const val = globalData.config_value;
    return typeof val === "string" ? val : String(val);
  }
  return null;
}

/** Get currency from quote_settings (first branch of org). */
export async function getQuoteSettingsCurrency(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("quote_settings")
    .select("currency")
    .eq("organization_id", organizationId)
    .not("currency", "is", null)
    .limit(1)
    .maybeSingle();

  if (error || !data?.currency) return null;
  return String(data.currency).trim() || null;
}

export async function getTopProducts(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<
  Array<{ id: string; name: string; price: number; inventory: number }>
> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, inventory_quantity")
    .eq("organization_id", organizationId)
    .order("inventory_quantity", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  // @ts-expect-error: Supabase query returns dynamic shape - map inventory_quantity to inventory
  return (data || []) as Array<{ id: string; name: string; price: number; inventory: number }>;
}

export async function getRecentOrders(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<{ monthly: number }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("organization_id", organizationId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error) {
    throw error;
  }

  return {
    monthly: data?.length || 0,
  };
}

export async function getOrganizationAge(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("organizations")
    .select("created_at")
    .eq("id", organizationId)
    .single();

  if (error || !data) {
    return 0;
  }

  const createdDate = new Date(data.created_at);
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return daysDiff;
}

export function getDefaultContext(): OrganizationalContext {
  return {
    name: "Óptica",
    specialty: "Óptica General",
    topProducts: [],
    customerCount: 0,
    monthlyOrders: 0,
    businessHours: {
      open: "09:00",
      close: "18:00",
    },
    services: [],
    location: "No especificado",
    phone: "No especificado",
    email: "No especificado",
    website: "No especificado",
    currency: "USD",
    createdAt: new Date().toISOString(),
  };
}

export function getDefaultActivityMetrics(): ActivityMetrics {
  return {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    customerRetentionRate: 0,
    orderCompletionRate: 0,
    monthlyOrders: 0,
    weeklyOrders: 0,
    dailyOrders: 0,
  };
}
