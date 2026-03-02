/**
 * Tier Validator for SaaS Multi-Tenancy
 *
 * Validates tier limits before allowing actions (create branch, add user, etc.)
 * Uses subscription_tiers table as primary source of truth; falls back to tier-config if DB fails.
 *
 * @module tier-validator
 */

import { createServiceRoleClient } from "@/utils/supabase/server";
import {
  getTierConfig,
  isUnlimited,
  SubscriptionTier,
  type TierLimits,
  type TierFeature,
} from "./tier-config";
import { recordTierChange } from "./tier-change-audit";

export type TierLimitType = "branches" | "users" | "customers" | "products";

export interface TierValidationResult {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxAllowed: number | "unlimited";
  tier: SubscriptionTier;
}

/** Default features when DB has partial data */
const DEFAULT_FEATURES: Record<TierFeature, boolean> = {
  pos: true,
  appointments: true,
  quotes: true,
  work_orders: true,
  prescriptions: true,
  custom_branding: true,
  chat_ia: false,
  advanced_analytics: false,
  field_operations: false,
  agreements: false,
  whatsapp: false,
  api_access: false,
};

/**
 * Get tier configuration from subscription_tiers table (primary source of truth).
 * Returns null if tier not found or DB error. Caller should fallback to tier-config.
 */
export async function getTierConfigFromDb(
  tierName: string,
): Promise<TierLimits | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("subscription_tiers")
    .select(
      "name, price_monthly, max_branches, max_users, max_customers, max_products, features",
    )
    .eq("name", tierName)
    .single();

  if (error || !data) {
    return null;
  }

  const toLimit = (v: number | null | undefined): number | "unlimited" =>
    v == null ? "unlimited" : v;

  const dbFeatures = (data.features as Record<string, boolean>) || {};
  const features: Record<TierFeature, boolean> = { ...DEFAULT_FEATURES };
  for (const [k, v] of Object.entries(dbFeatures)) {
    if (k in DEFAULT_FEATURES && typeof v === "boolean") {
      features[k as TierFeature] = v;
    }
  }

  return {
    name: data.name || tierName,
    price: Number(data.price_monthly) || 0,
    max_branches: toLimit(data.max_branches),
    max_users: toLimit(data.max_users),
    max_customers: toLimit(data.max_customers),
    max_products: toLimit(data.max_products),
    features,
  };
}

/**
 * Get tier config: DB first, fallback to tier-config for resilience.
 */
async function getTierConfigForValidation(
  tier: SubscriptionTier,
): Promise<TierLimits> {
  const fromDb = await getTierConfigFromDb(tier);
  if (fromDb) return fromDb;
  return getTierConfig(tier);
}

/**
 * Get effective organization tier. Applies scheduled downgrade if due (lazy application).
 */
async function getOrganizationTier(
  organizationId: string,
): Promise<SubscriptionTier | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("subscription_tier, scheduled_tier, scheduled_tier_effective_at")
    .eq("id", organizationId)
    .single();

  if (error || !data) {
    return null;
  }

  const now = new Date();
  const effectiveAt = data.scheduled_tier_effective_at
    ? new Date(data.scheduled_tier_effective_at)
    : null;

  // Apply scheduled downgrade if due
  if (
    data.scheduled_tier &&
    effectiveAt &&
    effectiveAt <= now &&
    ["basic", "pro", "premium"].includes(data.scheduled_tier)
  ) {
    const fromTier = data.subscription_tier || "basic";
    const toTier = data.scheduled_tier;

    await supabase
      .from("organizations")
      .update({
        subscription_tier: toTier,
        scheduled_tier: null,
        scheduled_tier_effective_at: null,
        updated_at: now.toISOString(),
      })
      .eq("id", organizationId);

    await recordTierChange({
      organizationId,
      fromTier,
      toTier,
      changedByUserId: null,
      source: "scheduled_job",
    });

    return toTier as SubscriptionTier;
  }

  return (data.subscription_tier || "basic") as SubscriptionTier;
}

/**
 * Get current count for a limit type
 */
async function getCurrentCount(
  organizationId: string,
  limitType: TierLimitType,
): Promise<number> {
  const supabase = createServiceRoleClient();

  switch (limitType) {
    case "branches":
      const { count: branchesCount } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      return branchesCount || 0;

    case "users":
      const { count: usersCount } = await supabase
        .from("admin_users")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true);
      return usersCount || 0;

    case "customers":
      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      return customersCount || 0;

    case "products":
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      return productsCount || 0;

    default:
      return 0;
  }
}

/**
 * Validate tier limit for an action
 */
export async function validateTierLimit(
  organizationId: string,
  limitType: TierLimitType,
  currentCount?: number,
): Promise<TierValidationResult> {
  // Get organization tier
  const tier = await getOrganizationTier(organizationId);
  if (!tier) {
    return {
      allowed: false,
      reason: "Organization not found",
      currentCount: 0,
      maxAllowed: 0,
      tier: "basic",
    };
  }

  // Get tier config (DB first, fallback to tier-config)
  const tierConfig = await getTierConfigForValidation(tier);

  // Get current count if not provided
  const count =
    currentCount ?? (await getCurrentCount(organizationId, limitType));

  // Get max allowed
  let maxAllowed: number | "unlimited";
  switch (limitType) {
    case "branches":
      maxAllowed = tierConfig.max_branches;
      break;
    case "users":
      maxAllowed = tierConfig.max_users;
      break;
    case "customers":
      maxAllowed = tierConfig.max_customers;
      break;
    case "products":
      maxAllowed = tierConfig.max_products;
      break;
  }

  // Check if limit is reached
  const allowed = isUnlimited(maxAllowed) || count < maxAllowed;

  return {
    allowed,
    reason: allowed
      ? undefined
      : `Límite de ${maxAllowed} ${limitType} alcanzado para el tier ${tierConfig.name}`,
    currentCount: count,
    maxAllowed,
    tier,
  };
}

/**
 * Get all tier features for an organization (for UI filtering)
 */
export async function getOrganizationFeatures(
  organizationId: string,
): Promise<Record<string, boolean>> {
  const tier = await getOrganizationTier(organizationId);
  if (!tier) {
    return { ...DEFAULT_FEATURES };
  }
  const tierConfig = await getTierConfigForValidation(tier);
  return { ...tierConfig.features };
}

/**
 * Check if a feature is enabled for an organization
 */
export async function validateFeature(
  organizationId: string,
  feature: string,
): Promise<boolean> {
  const tier = await getOrganizationTier(organizationId);
  if (!tier) {
    return false;
  }

  const tierConfig = await getTierConfigForValidation(tier);
  return (
    tierConfig.features[feature as keyof typeof tierConfig.features] ?? false
  );
}

/**
 * Get upgrade message for a limit
 */
export function getTierUpgradeMessage(
  tier: SubscriptionTier,
  limitType: TierLimitType,
): string {
  const tierConfig = getTierConfig(tier);
  const nextTier =
    tier === "premium" ? null : tier === "basic" ? "pro" : "premium";

  if (!nextTier) {
    return "Ya tienes el tier máximo disponible.";
  }

  const nextTierConfig = getTierConfig(nextTier);
  let nextLimit: number | "unlimited";

  switch (limitType) {
    case "branches":
      nextLimit = nextTierConfig.max_branches;
      break;
    case "users":
      nextLimit = nextTierConfig.max_users;
      break;
    case "customers":
      nextLimit = nextTierConfig.max_customers;
      break;
    case "products":
      nextLimit = nextTierConfig.max_products;
      break;
  }

  const nextLimitText = isUnlimited(nextLimit)
    ? "ilimitado"
    : nextLimit.toString();

  return `Upgrade a ${nextTierConfig.name} para obtener hasta ${nextLimitText} ${limitType}.`;
}
