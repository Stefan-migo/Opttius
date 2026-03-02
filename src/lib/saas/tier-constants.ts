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
  prescriptions: "Libro Digital de Recetas",
  custom_branding: "Branding Personalizado",
  chat_ia: "Chat IA",
  advanced_analytics: "Analíticas Avanzadas",
  field_operations: "Operativos en Terreno",
  agreements: "Gestión de Convenios",
  whatsapp: "WhatsApp Business",
  api_access: "Acceso API (futuro)",
};

/** Display names for tiers (Spanish) */
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  basic: "Básico",
  pro: "Pro",
  premium: "Premium",
};
