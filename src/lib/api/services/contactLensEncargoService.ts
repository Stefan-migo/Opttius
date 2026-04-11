/**
 * Contact Lens Encargos Service
 * Handles CRUD operations for contact lens purchase orders (encargos)
 */

import { createApiSuccessResponse } from "@/lib/api/response";

export interface ContactLensEncargo {
  id: string;
  organization_id: string;
  branch_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_rut?: string;
  customer_phone?: string;
  customer_email?: string;
  contact_lens_family_id: string;
  family_name: string;
  family_brand?: string;
  sphere_od: number;
  cylinder_od: number;
  axis_od?: number;
  add_od?: number;
  base_curve_od?: number;
  diameter_od?: number;
  sphere_os: number;
  cylinder_os: number;
  axis_os?: number;
  add_os?: number;
  base_curve_os?: number;
  diameter_os?: number;
  quantity: number;
  estimated_price?: number;
  cost?: number;
  status: "pending" | "ordered" | "arrived" | "delivered" | "cancelled";
  notes?: string;
  expected_arrival_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEncargoParams {
  customer_id?: string;
  customer_name?: string;
  customer_rut?: string;
  customer_phone?: string;
  customer_email?: string;
  contact_lens_family_id: string;
  family_name: string;
  family_brand?: string;
  sphere_od: number;
  cylinder_od?: number;
  axis_od?: number;
  add_od?: number;
  base_curve_od?: number;
  diameter_od?: number;
  sphere_os: number;
  cylinder_os?: number;
  axis_os?: number;
  add_os?: number;
  base_curve_os?: number;
  diameter_os?: number;
  quantity?: number;
  estimated_price?: number;
  cost?: number;
  notes?: string;
}

export const contactLensEncargoService = {
  /**
   * Get all encargos for a branch
   */
  async getAll(
    branchId?: string,
    status?: string,
  ): Promise<ContactLensEncargo[]> {
    const params = new URLSearchParams();
    if (branchId) params.append("branch_id", branchId);
    if (status) params.append("status", status);

    const response = await fetch(`/api/admin/contact-lens-encargos?${params}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Error al cargar encargos");
    }

    return result.data;
  },

  /**
   * Create a new encargo
   */
  async create(params: CreateEncargoParams): Promise<ContactLensEncargo> {
    const response = await fetch("/api/admin/contact-lens-encargos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Error al crear encargo");
    }

    return result.data;
  },

  /**
   * Update encargo status
   */
  async updateStatus(
    id: string,
    status: "pending" | "ordered" | "arrived" | "delivered" | "cancelled",
    expectedArrivalDate?: string,
  ): Promise<ContactLensEncargo> {
    const response = await fetch(`/api/admin/contact-lens-encargos?id=${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        expected_arrival_date: expectedArrivalDate,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Error al actualizar encargo");
    }

    return result.data;
  },

  /**
   * Delete an encargo
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/admin/contact-lens-encargos?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error?.message || "Error al eliminar encargo");
    }
  },
};
