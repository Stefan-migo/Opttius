/**
 * Contact Lens Matrix Service
 *
 * Service for calculating contact lens prices based on prescription parameters.
 */

import { appLogger as logger } from "@/lib/logger";
import { handleApiError } from "@/lib/api/services/errorService";

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";

// ============================================
// Types
// ============================================

export interface ContactLensMatrixCalculationRequest {
  contact_lens_family_id: string;
  sphere: number;
  cylinder: number;
  axis: number | null;
  addition: number | null;
}

export interface ContactLensMatrixCalculationResult {
  price: number;
  cost: number;
  family_id: string;
  family_name: string;
  brand: string;
  sphere: number;
  cylinder: number;
  axis: number | null;
  addition: number | null;
}

export interface ContactLensMatrixCalculationResponse {
  calculation: ContactLensMatrixCalculationResult;
}

// ============================================
// Service Class
// ============================================

class ContactLensMatrixService {
  private client = new ApiClient();

  /**
   * Calculate contact lens price from matrix
   */
  async calculate(
    familyId: string,
    sphere: number,
    cylinder: number,
    axis: number | null = null,
    addition: number | null = null,
  ): Promise<ContactLensMatrixCalculationResult | null> {
    try {
      const response =
        await this.client.post<ContactLensMatrixCalculationResponse>(
          "/api/admin/contact-lens-matrices/calculate",
          {
            contact_lens_family_id: familyId,
            sphere,
            cylinder,
            axis,
            addition,
          },
        );

      if (isSuccess(response)) {
        const data = unwrapData(response);
        return data?.calculation || null;
      }

      handleApiError(response);
      return null;
    } catch (error) {
      logger.error("Error calculating contact lens price:", error);
      handleApiError(error);
      return null;
    }
  }
}

// Export singleton instance
export const contactLensMatrixService = new ContactLensMatrixService();
