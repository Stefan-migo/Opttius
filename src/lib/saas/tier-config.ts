/**
 * Tier Configuration for SaaS Multi-Tenancy
 *
 * Defines subscription tiers (Basic, Pro, Premium) with their limits and features.
 * This configuration is synchronized with the subscription_tiers table in the database.
 *
 * @module tier-config
 */

export type SubscriptionTier = "basic" | "pro" | "premium";

export type TierFeature =
  | "pos"
  | "appointments"
  | "quotes"
  | "work_orders"
  | "chat_ia"
  | "advanced_analytics"
  | "api_access"
  | "custom_branding";

export interface TierLimits {
  name: string;
  price: number;
  max_branches: number | "unlimited";
  max_users: number | "unlimited";
  max_customers: number | "unlimited";
  max_products: number | "unlimited";
  features: Record<TierFeature, boolean>;
}

/**
 * Tier configuration matching the database subscription_tiers table
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  basic: {
    name: "Basic",
    price: 49,
    max_branches: 1,
    max_users: 2,
    max_customers: 500,
    max_products: 100,
    features: {
      pos: true,
      appointments: true,
      quotes: true,
      work_orders: true,
      chat_ia: false,
      advanced_analytics: false,
      api_access: false,
      custom_branding: false,
    },
  },
  pro: {
    name: "Pro",
    price: 99,
    max_branches: 3,
    max_users: 5,
    max_customers: 2000,
    max_products: 500,
    features: {
      pos: true,
      appointments: true,
      quotes: true,
      work_orders: true,
      chat_ia: true,
      advanced_analytics: true,
      api_access: false,
      custom_branding: false,
    },
  },
  premium: {
    name: "Premium",
    price: 299,
    max_branches: 20,
    max_users: 50,
    max_customers: "unlimited",
    max_products: "unlimited",
    features: {
      pos: true,
      appointments: true,
      quotes: true,
      work_orders: true,
      chat_ia: true,
      advanced_analytics: true,
      api_access: true,
      custom_branding: true,
    },
  },
};

/**
 * Get tier configuration by tier name
 */
export function getTierConfig(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Get next tier (for upgrade suggestions)
 */
export function getNextTier(
  currentTier: SubscriptionTier,
): SubscriptionTier | null {
  const tierOrder: SubscriptionTier[] = ["basic", "pro", "premium"];
  const currentIndex = tierOrder.indexOf(currentTier);
  return currentIndex < tierOrder.length - 1
    ? tierOrder[currentIndex + 1]
    : null;
}

/**
 * Check if a feature is enabled for a tier
 */
export function hasFeature(
  tier: SubscriptionTier,
  feature: TierFeature,
): boolean {
  return TIER_LIMITS[tier].features[feature];
}

/**
 * Check if a limit is unlimited
 */
export function isUnlimited(value: number | "unlimited"): value is "unlimited" {
  return value === "unlimited";
}

/**
 * Compare two tiers to determine if upgrade is available
 */
export function canUpgrade(
  fromTier: SubscriptionTier,
  toTier: SubscriptionTier,
): boolean {
  const tierOrder: SubscriptionTier[] = ["basic", "pro", "premium"];
  return tierOrder.indexOf(toTier) > tierOrder.indexOf(fromTier);
}
