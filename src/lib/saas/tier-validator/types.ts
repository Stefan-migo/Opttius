import type { SubscriptionTier, TierFeature } from "../tier-config";

export type TierLimitType = "branches" | "users" | "customers" | "products";

export interface TierValidationResult {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxAllowed: number | "unlimited";
  tier: SubscriptionTier;
}

export const DEFAULT_FEATURES: Record<TierFeature, boolean> = {
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
