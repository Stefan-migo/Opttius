/**
 * Organizational Memory System
 *
 * Provides contextual information about each optica to make the AI agent more personalized
 * and knowledgeable about the specific business context.
 *
 * @module lib/ai/memory/organizational
 */

import type { ToolExecutionContext } from "../tools/types";

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
  private supabase: any;
  private contextCache: Map<string, OrganizationalContext> = new Map();

  constructor(organizationId: string, supabase: any) {
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
      const [orgData, settingsData, productsData, ordersData] =
        await Promise.all([
          this.getOrganizationData(),
          this.getOrganizationSettings(),
          this.getTopProducts(),
          this.getRecentOrders(),
        ]);

      const settings = settingsData || {};
      const phone = settings.business_phone || "";
      const address = settings.business_address || "";
      const docType = settings.default_document_type || "";

      // Detect location and currency
      let location = "No especificado";
      let currency = "USD"; // Default fallback

      if (
        phone.startsWith("+56") ||
        address.toLowerCase().includes("chile") ||
        docType === "boleta"
      ) {
        location = "Chile";
        currency = "CLP";
      } else if (
        phone.startsWith("+54") ||
        address.toLowerCase().includes("argentina")
      ) {
        location = "Argentina";
        currency = "ARS";
      } else if (
        phone.startsWith("+34") ||
        address.toLowerCase().includes("españa")
      ) {
        location = "España";
        currency = "EUR";
      } else if (
        address.toLowerCase().includes("méxico") ||
        phone.startsWith("+52")
      ) {
        location = "México";
        currency = "MXN";
      }

      const context: OrganizationalContext = {
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
        phone: settings.business_phone || "No especificado",
        email: settings.business_email || "No especificado",
        website: "No especificado",
        currency: currency,
        createdAt: orgData.created_at || new Date().toISOString(),
      };

      // Cache the result
      this.contextCache.set(this.organizationId, context);

      return context;
    } catch (error) {
      console.error("Error getting organizational context:", error);
      // Return default context on error
      return this.getDefaultContext();
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
      console.error("Error getting activity metrics:", error);
      return this.getDefaultActivityMetrics();
    }
  }

  /**
   * Calculate organizational maturity level
   */
  async getMaturityLevel(): Promise<MaturityLevel> {
    const [age, activity] = await Promise.all([
      this.getOrganizationAge(),
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

  // Private helper methods

  private async getOrganizationData(): Promise<any> {
    const { data, error } = await this.supabase
      .from("organizations")
      .select(
        `
        name,
        created_at
      `,
      )
      .eq("id", this.organizationId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  private async getOrganizationSettings(): Promise<any> {
    const { data, error } = await this.supabase
      .from("organization_settings")
      .select("*")
      .eq("organization_id", this.organizationId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching organization settings:", error);
      return null;
    }

    return data;
  }

  private async getTopProducts(): Promise<
    Array<{ id: string; name: string; price: number; inventory: number }>
  > {
    const { data, error } = await this.supabase
      .from("products")
      .select("id, name, price, inventory_quantity")
      .eq("organization_id", this.organizationId)
      .order("inventory_quantity", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return data || [];
  }

  private async getRecentOrders(): Promise<{ monthly: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.supabase
      .from("orders")
      .select("id")
      .eq("organization_id", this.organizationId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (error) {
      throw error;
    }

    return {
      monthly: data?.length || 0,
    };
  }

  private async getOrganizationAge(): Promise<number> {
    const { data, error } = await this.supabase
      .from("organizations")
      .select("created_at")
      .eq("id", this.organizationId)
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

  private getDefaultContext(): OrganizationalContext {
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

  private getDefaultActivityMetrics(): ActivityMetrics {
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
}

/**
 * Create organizational memory instance
 */
export function createOrganizationalMemory(
  organizationId: string,
  supabase: any,
): OrganizationalMemory {
  return new OrganizationalMemory(organizationId, supabase);
}
