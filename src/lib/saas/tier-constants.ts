/**
 * Tier constants - centralized labels and display names for UI
 *
 * @module tier-constants
 */

import type { SubscriptionTier, TierFeature } from "./tier-config";

/** Human-readable labels for tier features (Spanish) */
export const TIER_FEATURE_LABELS: Record<TierFeature, string> = {
  pos: "Punto de Venta",
  appointments: "Citas y Agenda",
  quotes: "Presupuestos",
  work_orders: "Trabajos de Laboratorio",
  chat_ia: "Chat IA",
  advanced_analytics: "Analíticas Avanzadas",
  api_access: "Acceso API",
  custom_branding: "Branding Personalizado",
};

/** Display names for tiers (Spanish) */
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  basic: "Básico",
  pro: "Pro",
  premium: "Premium",
};
