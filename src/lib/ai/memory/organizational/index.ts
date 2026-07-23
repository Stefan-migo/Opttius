/**
 * Organizational Memory System
 *
 * Provides contextual information about each optica to make the AI agent more personalized
 * and knowledgeable about the specific business context.
 *
 * @module lib/ai/memory/organizational
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger } from "@/lib/logger";
import type { Database } from "@/types/supabase";

import { resolveLocationAndCurrency } from "./context-resolver";
import {
  getDefaultActivityMetrics,
  getDefaultContext,
  getOrganizationAge,
  getOrganizationData,
  getOrganizationSettings,
  getQuoteSettingsCurrency,
  getRecentOrders,
  getSystemConfigCurrency,
  getTopProducts,
} from "./helpers";

export interface OrganizationalContext {
  name: string;
  specialty: string;
  topProducts: Array<{
    id: string;
    name: string;
    price: number;
    inventory: number;
  }>;
  customerCount: number;
  monthlyOrders: number;
  businessHours: {
    open: string;
    close: string;
  };
  services: string[];
  location: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  createdAt: string;
}

export interface ActivityMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  customerRetentionRate: number;
  orderCompletionRate: number;
  monthlyOrders: number;
  weeklyOrders: number;
  dailyOrders: number;
}

export interface MaturityLevel {
  level: "new" | "starting" | "growing" | "established";
  daysSinceCreation: number;
  totalOrders: number;
  totalRevenue: number;
  description: string;
}

export class OrganizationalMemory {
  private organizationId: string;
  private supabase: SupabaseClient<Database>;
  private contextCache: Map<string, OrganizationalContext> = new Map();

  constructor(organizationId: string, supabase: SupabaseClient<Database>) {
    this.organizationId = organizationId;
    this.supabase = supabase;
  }

  /**
   * Get comprehensive organizational context
   */
  async getOrganizationalContext(): Promise<OrganizationalContext> {
    // Check cache first
    const cached = this.contextCache.get(this.organizationId);
    if (cached) {
      return cached;
    }

    try {
      const [
        orgData,
        settingsData,
        productsData,
        ordersData,
        systemCurrency,
        quoteCurrency,
      ] = await Promise.all([
        getOrganizationData(this.supabase, this.organizationId),
        getOrganizationSettings(this.supabase, this.organizationId),
        getTopProducts(this.supabase, this.organizationId),
        getRecentOrders(this.supabase, this.organizationId),
        getSystemConfigCurrency(this.supabase, this.organizationId),
        getQuoteSettingsCurrency(this.supabase, this.organizationId),
      ]);

      const settings = (settingsData || {}) as Record<string, unknown>;

      // Resolve location/currency: explicit settings > system_config > quote_settings > heuristics
      let { location, currency } = resolveLocationAndCurrency(settings);
      if (currency === "USD" && systemCurrency) currency = systemCurrency;
      if (currency === "USD" && quoteCurrency) currency = quoteCurrency;

      const context: OrganizationalContext = {
        // @ts-expect-error: Dynamic LLM response shape
        name: orgData.name,
        specialty: "Óptica General",
        topProducts: productsData,
        customerCount: 0,
        monthlyOrders: ordersData.monthly || 0,
        businessHours: {
          open: "09:00",
          close: "18:00",
        },
        services: [],
        location: location,
        phone:
          (typeof settings.business_phone === "string"
            ? settings.business_phone
            : "") || "No especificado",
        email:
          (typeof settings.business_email === "string"
            ? settings.business_email
            : "") || "No especificado",
        website: "No especificado",
        currency: currency,
        // @ts-expect-error: Dynamic LLM response shape
        createdAt: orgData.created_at || new Date().toISOString(),
      };

      // Cache the result
      this.contextCache.set(this.organizationId, context);

      return context;
    } catch (error) {
      appLogger.error("Error getting organizational context:", error);
      // Return default context on error
      return getDefaultContext();
    }
  }

  /**
   * Get activity metrics for the organization
   */
  async getActivityMetrics(): Promise<ActivityMetrics> {
    try {
      const { data, error } = await this.supabase
        .from("organizations")
        .select(
          `
          id,
          name,
          created_at
        `,
        )
        .eq("id", this.organizationId)
        .single();

      if (error || !data) {
        throw error;
      }

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
    } catch (error) {
      appLogger.error("Error getting activity metrics:", error);
      return getDefaultActivityMetrics();
    }
  }

  /**
   * Calculate organizational maturity level
   */
  async getMaturityLevel(): Promise<MaturityLevel> {
    const [age, activity] = await Promise.all([
      getOrganizationAge(this.supabase, this.organizationId),
      this.getActivityMetrics(),
    ]);

    let level: MaturityLevel["level"] = "new";
    let description = "";

    if (age < 7) {
      level = "new";
      description = "Óptica nueva (menos de 7 días o sin órdenes)";
    } else if (age < 30 || activity.totalOrders < 10) {
      level = "starting";
      description = `Óptica en fase inicial (${age} días, ${activity.totalOrders} órdenes)`;
    } else if (age < 90 || activity.totalOrders < 50) {
      level = "growing";
      description = `Óptica en crecimiento (${age} días, ${activity.totalOrders} órdenes)`;
    } else {
      level = "established";
      description = `Óptica establecida (${age} días, ${activity.totalOrders} órdenes)`;
    }

    return {
      level,
      daysSinceCreation: age,
      totalOrders: activity.totalOrders,
      totalRevenue: activity.totalRevenue,
      description,
    };
  }

  /**
   * Get context for AI agent
   */
  async getContextForAgent(): Promise<{
    organization: OrganizationalContext;
    activity: ActivityMetrics;
    maturity: MaturityLevel;
  }> {
    const [organization, activity, maturity] = await Promise.all([
      this.getOrganizationalContext(),
      this.getActivityMetrics(),
      this.getMaturityLevel(),
    ]);

    return {
      organization,
      activity,
      maturity,
    };
  }

  /**
   * Clear cache for a specific organization
   */
  clearCache(): void {
    this.contextCache.delete(this.organizationId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.contextCache.clear();
  }
}

/**
 * Create organizational memory instance
 */
export function createOrganizationalMemory(
  organizationId: string,
  supabase: SupabaseClient<Database>,
): OrganizationalMemory {
  return new OrganizationalMemory(organizationId, supabase);
}
