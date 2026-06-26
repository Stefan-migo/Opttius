/**
 * Quote Settings Service
 *
 * Service for managing quote settings and configurations.
 */

import { handleApiError } from "@/lib/api/services/errorService";

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";

// ============================================
// Types
// ============================================

export interface QuoteSettings {
  id: string;
  default_labor_cost: number;
  default_discount_percentage: number;
  default_tax_percentage: number;
  default_expiration_days: number;
  default_margin_percentage: number;
  treatment_prices?: {
    // Tratamientos que se aplican en laboratorio local
    anti_reflective: number;
    scratch_resistant: number;
    tint: number;
    // Servicio personalizado (nombre y precio configurable)
    custom_service?: {
      enabled: boolean;
      name: string;
      price: number;
    };
  };
  validity_days: number;
  volume_discounts?: Array<{ min_amount: number; discount_percentage: number }>;
  currency: string;
  labor_cost_includes_tax?: boolean;
  lens_cost_includes_tax?: boolean;
  treatments_cost_includes_tax?: boolean;
  terms_and_conditions?: string;
  notes_template?: string;
  created_at: string;
  updated_at?: string;
}

export interface UpdateQuoteSettingsData {
  default_labor_cost?: number;
  default_discount_percentage?: number;
  treatment_prices?: {
    anti_reflective?: number;
    scratch_resistant?: number;
    tint?: number;
    custom_service?: {
      enabled: boolean;
      name: string;
      price: number;
    };
  };
  validity_days?: number;
}

// ============================================
// Service Class
// ============================================

class QuoteSettingsService {
  private client = new ApiClient();

  /**
   * Get quote settings
   */
  async get(): Promise<QuoteSettings | null> {
    try {
      const response = await this.client.get<QuoteSettings>(
        "/api/admin/quote-settings",
      );

      if (isSuccess(response)) {
        return unwrapData(response);
      }

      handleApiError(response);
      return null;
    } catch (error) {
      console.error("Error fetching quote settings:", error);
      handleApiError(error);
      return null;
    }
  }

  /**
   * Update quote settings
   */
  async update(data: UpdateQuoteSettingsData): Promise<QuoteSettings | null> {
    try {
      const response = await this.client.put<QuoteSettings>(
        "/api/admin/quote-settings",
        data,
      );

      if (isSuccess(response)) {
        return unwrapData(response);
      }

      handleApiError(response);
      return null;
    } catch (error) {
      console.error("Error updating quote settings:", error);
      handleApiError(error);
      return null;
    }
  }
}

// Export singleton instance
export const quoteSettingsService = new QuoteSettingsService();
