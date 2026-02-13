/**
 * POS Service - Centralized API operations for Point of Sale
 * 
 * This service handles all POS-related API calls including:
 * - Cash register status
 * - Sales processing
 * - Pending balance orders
 * - Payment processing
 */

import { ApiClient } from '../client-helpers';
import { isSuccess, unwrapData } from '../client-helpers';
import { handleApiError } from '@/lib/services/errorService';
import { success } from '@/lib/services/notificationService';

// ============================================
// Types
// ============================================

export interface CashRegisterStatus {
  isOpen: boolean;
  session_id?: string;
  branch_id?: string;
  opened_at?: string;
  closing_balance?: number;
  current_balance?: number;
}

export interface PendingBalanceOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_rut?: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: string;
  created_at: string;
}

export interface ProcessSaleRequest {
  // Customer info
  customer_id?: string;
  customer_name?: string;
  customer_rut?: string;
  customer_email?: string;
  customer_phone?: string;
  
  // Cart items
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    discount_type?: "percentage" | "fixed";
    notes?: string;
  }>;
  
  // Payment info
  payment_method: string;
  cash_received?: number;
  card_last_four?: string;
  card_brand?: string;
  transfer_reference?: string;
  
  // Lens data (optional)
  lens_type?: string;
  lens_material?: string;
  lens_index?: number;
  frame_model?: string;
  
  // Prescription
  prescription_id?: string;
  
  // Financial
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  
  // Branch
  branch_id: string;
  
  // Notes
  notes?: string;
  internal_notes?: string;
}

export interface ProcessSaleResponse {
  success: boolean;
  order?: {
    id: string;
    order_number: string;
    total_amount: number;
    payment_status: string;
    sii_invoice_number?: string;
  };
  work_order?: {
    id: string;
    work_order_number: string;
    sii_invoice_number?: string;
  };
  message?: string;
}

export interface PendingPaymentRequest {
  order_id: string;
  payment_amount: number;
  payment_method: string;
  notes?: string;
}

export interface PendingPaymentResponse {
  success: boolean;
  message?: string;
  payment?: {
    id: string;
    amount: number;
    payment_method: string;
  };
}

// ============================================
// Service Class
// ============================================

class POSService {
  private readonly basePath = "/api/admin/pos";
  private client = new ApiClient();

  /**
   * Check if cash register is open
   */
  async getCashStatus(branchId?: string): Promise<CashRegisterStatus | null> {
    try {
      const response = await this.client.get<CashRegisterStatus>(`${this.basePath}/open`, {
        headers: branchId ? { "x-branch-id": branchId } : undefined,
      });

      if (isSuccess(response)) {
        return unwrapData(response);
      }

      handleApiError(response);
      return null;
    } catch (error) {
      console.error("Error fetching cash status:", error);
      handleApiError(error);
      return null;
    }
  }

  /**
   * Get pending balance orders
   */
  async getPendingBalanceOrders(
    searchTerm?: string,
    branchId?: string,
    limit: number = 50
  ): Promise<PendingBalanceOrder[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      if (searchTerm?.trim()) {
        params.append("search", searchTerm.trim());
      }

      const response = await this.client.get<PendingBalanceOrder[]>(`${this.basePath}/pending-balance?${params}`, {
        headers: branchId ? { "x-branch-id": branchId } : undefined,
      });

      if (isSuccess(response)) {
        const data = unwrapData(response);
        return Array.isArray(data) ? data : [];
      }

      handleApiError(response);
      return [];
    } catch (error) {
      console.error("Error fetching pending balance orders:", error);
      handleApiError(error);
      return [];
    }
  }

  /**
   * Process a pending payment
   */
  async processPendingPayment(
    request: PendingPaymentRequest,
    branchId?: string
  ): Promise<PendingPaymentResponse | null> {
    try {
      const response = await this.client.post<PendingPaymentResponse>(`${this.basePath}/pending-balance/pay`, request, {
        headers: branchId ? { "x-branch-id": branchId } : undefined,
      });

      if (isSuccess(response)) {
        const data = unwrapData(response);
        success(data?.message || "Pago procesado exitosamente");
        return data;
      }

      handleApiError(response);
      return null;
    } catch (error) {
      console.error("Error processing pending payment:", error);
      handleApiError(error);
      return null;
    }
  }

  /**
   * Process a complete sale
   */
  async processSale(
    orderData: ProcessSaleRequest,
    branchId?: string
  ): Promise<ProcessSaleResponse | null> {
    try {
      const response = await this.client.post<ProcessSaleResponse>(`${this.basePath}/process-sale`, orderData, {
        headers: branchId ? { "x-branch-id": branchId } : undefined,
      });

      if (isSuccess(response)) {
        const data = unwrapData(response);
        
        const orderNumber = data?.work_order?.work_order_number || data?.order?.order_number;
        success(`Venta procesada: ${orderNumber}`);
        
        return data;
      }

      handleApiError(response);
      return null;
    } catch (error) {
      console.error("Error processing sale:", error);
      handleApiError(error);
      return null;
    }
  }

  /**
   * Get billing settings
   */
  async getBillingSettings(branchId?: string) {
    try {
      const response = await this.client.get<{ settings: Record<string, unknown> }>("/api/admin/billing/settings", {
        headers: branchId ? { "x-branch-id": branchId } : undefined,
      });

      if (isSuccess(response)) {
        const data = unwrapData(response);
        return data?.settings || null;
      }

      handleApiError(response);
      return null;
    } catch (error) {
      console.error("Error fetching billing settings:", error);
      handleApiError(error);
      return null;
    }
  }

  /**
   * Get current organization
   */
  async getCurrentOrganization(branchId?: string) {
    try {
      const response = await this.client.get<{ organization: Record<string, unknown> }>("/api/admin/organizations/current", {
        headers: branchId ? { "x-branch-id": branchId } : undefined,
      });

      if (isSuccess(response)) {
        const data = unwrapData(response);
        return data?.organization || null;
      }

      handleApiError(response);
      return null;
    } catch (error) {
      console.error("Error fetching current organization:", error);
      handleApiError(error);
      return null;
    }
  }
}

// Export singleton instance
export const posService = new POSService();
