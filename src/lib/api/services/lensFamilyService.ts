/**
 * Lens Family Service
 *
 * Service for managing lens families and their configurations.
 */

import { handleApiError } from "@/lib/services/errorService";

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";

// ============================================
// Types
// ============================================

export interface LensFamily {
  id: string;
  name: string;
  lens_type: string;
  lens_material: string;
  lens_index?: number;
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LensFamilyListResponse {
  families: LensFamily[];
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

class LensFamilyService {
  private client = new ApiClient();

  /**
   * Get all lens families
   */
  async getAll(includeInactive: boolean = false): Promise<LensFamily[]> {
    try {
      const params = new URLSearchParams({
        include_inactive: includeInactive.toString(),
      });

      const response = await this.client.get<LensFamily[]>(
        `/api/admin/lens-families?${params}`,
      );

      if (isSuccess(response)) {
        const data = unwrapData(response);
        return Array.isArray(data) ? data : [];
      }

      handleApiError(response);
      return [];
    } catch (error) {
      console.error("Error fetching lens families:", error);
      handleApiError(error);
      return [];
    }
  }

  /**
   * Get a single lens family by ID
   */
  async getById(id: string): Promise<LensFamily | null> {
    try {
      const response = await this.client.get<LensFamily>(
        `/api/admin/lens-families/${id}`,
      );

      if (isSuccess(response)) {
        return unwrapData(response);
      }

      handleApiError(response);
      return null;
    } catch (error) {
      console.error("Error fetching lens family:", error);
      handleApiError(error);
      return null;
    }
  }
}

// Export singleton instance
export const lensFamilyService = new LensFamilyService();
