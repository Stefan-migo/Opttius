/**
 * Contact Lens Inventory Service
 *
 * Service to interact with contact_lens_inventory and check stock by prescription
 */

import { handleApiError } from "@/lib/services/errorService";
import { ApiClient, isSuccess, unwrapData } from "../client-helpers";

export interface ContactLensInventory {
  id: string;
  contact_lens_family_id: string;
  branch_id: string;
  sphere_min: number;
  sphere_max: number;
  cylinder_min: number;
  cylinder_max: number;
  quantity: number;
  min_stock_threshold: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StockCheckResult {
  available: boolean;
  quantity: number;
  message: string;
}

class ContactLensInventoryService {
  private client = new ApiClient();

  /**
   * Get all inventory for a family and branch
   */
  async getInventory(
    familyId: string,
    branchId: string,
  ): Promise<ContactLensInventory[]> {
    try {
      const response = await this.client.get<ContactLensInventory[]>(
        `/api/admin/contact-lens-inventory?contact_lens_family_id=eq.${familyId}&branch_id=eq.${branchId}`,
      );

      if (isSuccess(response)) {
        return unwrapData(response) || [];
      }

      return [];
    } catch (error) {
      console.error("Error fetching inventory:", error);
      return [];
    }
  }

  /**
   * Check if a specific prescription is in stock (client-side check)
   */
  async checkStock(
    familyId: string,
    branchId: string,
    sphere: number,
    cylinder: number = 0,
  ): Promise<StockCheckResult> {
    try {
      const inventory = await this.getInventory(familyId, branchId);

      // Find matching inventory
      const match = inventory.find(
        (item) =>
          item.is_active &&
          sphere >= item.sphere_min &&
          sphere <= item.sphere_max &&
          cylinder >= item.cylinder_min &&
          cylinder <= item.cylinder_max,
      );

      if (match && match.quantity > 0) {
        return {
          available: true,
          quantity: match.quantity,
          message: `Stock disponible: ${match.quantity} cajas`,
        };
      } else if (match && match.quantity <= 0) {
        return {
          available: false,
          quantity: 0,
          message: "Sin stock - Se puede solicitar encargo",
        };
      }

      return {
        available: false,
        quantity: 0,
        message: "Graduación no disponible en stock",
      };
    } catch (error) {
      console.error("Error checking stock:", error);
      // Return default - allow sale to proceed if check fails
      return {
        available: true,
        quantity: 999,
        message: "Stock no verificado",
      };
    }
  }

  /**
   * Create new inventory entry
   */
  async createInventory(data: {
    contact_lens_family_id: string;
    branch_id: string;
    sphere_min: number;
    sphere_max: number;
    cylinder_min: number;
    cylinder_max: number;
    quantity: number;
    min_stock_threshold?: number;
    notes?: string;
  }): Promise<ContactLensInventory | null> {
    try {
      const response = await this.client.post<ContactLensInventory>(
        "/api/admin/contact-lens-inventory",
        data,
      );

      if (isSuccess(response)) {
        return unwrapData(response);
      }

      return null;
    } catch (error) {
      console.error("Error creating inventory:", error);
      return null;
    }
  }
}

export const contactLensInventoryService = new ContactLensInventoryService();
