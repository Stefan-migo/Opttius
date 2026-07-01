/**
 * Contact Lens Family Service
 *
 * Service for managing contact lens families and their configurations.
 */

import { appLogger as logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api/services/errorService";

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";

// ============================================
// Types
// ============================================

export interface ContactLensFamily {
  id: string;
  name: string;
  brand: string | null;
  modality: string; // spherical, toric, multifocal
  use_type: string; // daily, bi_weekly, monthly, extended_wear
  packaging: string; // box_30, box_6, box_3, bottle
  material: string | null;
  base_curve: number | null;
  diameter: number | null;
  description: string | null;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ContactLensFamilyListResponse {
  families: ContactLensFamily[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Service Class
// ============================================

class ContactLensFamilyService {
  private client = new ApiClient();

  /**
   * Get all contact lens families
   */
  async getAll(includeInactive: boolean = false): Promise<ContactLensFamily[]> {
    try {
      const params = new URLSearchParams({
        include_inactive: includeInactive.toString(),
      });

      const response = await this.client.get<ContactLensFamily[]>(
        `/api/admin/contact-lens-families?${params}`,
      );

      if (isSuccess(response)) {
        const data = unwrapData(response);
        return Array.isArray(data) ? data : [];
      }

      handleApiError(response);
      return [];
    } catch (error) {
      logger.error("Error fetching contact lens families:", error);
      handleApiError(error);
      return [];
    }
  }

  /**
   * Get a single contact lens family by ID
   */
  async getById(id: string): Promise<ContactLensFamily | null> {
    try {
      const response = await this.client.get<ContactLensFamily>(
        `/api/admin/contact-lens-families/${id}`,
      );

      if (isSuccess(response)) {
        return unwrapData(response);
      }

      handleApiError(response);
      return null;
    } catch (error) {
      logger.error("Error fetching contact lens family:", error);
      handleApiError(error);
      return null;
    }
  }
}

// Export singleton instance
export const contactLensFamilyService = new ContactLensFamilyService();
