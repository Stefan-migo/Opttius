import { appLogger as logger } from "@/lib/logger";

/**
 * POS Service - Centralized API operations for Point of Sale
 *
 * This service handles all POS-related API calls including:
 * - Cash register status
 * - Sales processing
 * - Pending balance orders
 * - Payment processing
 */

import { handleApiError } from "@/lib/api/services/errorService";
import { success } from "@/lib/api/services/notificationService";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";

import { ApiClient, isError, isSuccess, unwrapData } from "../client-helpers";

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
  /** Session details from GET /api/admin/cash-register/open */
  session?: {
    id?: string;
    opening_cash_amount?: number;
    opening_time?: string;
    status?: string;
    [key: string]: unknown;
  };
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

  // Agreement (convenio)
  agreement_id?: string;
  purchase_order_id?: string;

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
  fiscal_reference?: string;
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
   * @param fieldOperationId - When in operativo mode, checks operativo's independent cash register
   */
  async getCashStatus(
    branchId?: string,
    fieldOperationId?: string | null,
  ): Promise<CashRegisterStatus | null> {
    try {
      const headers = getBranchAndOperativoHeaders(
        branchId ?? null,
        fieldOperationId ?? undefined,
      );
      const response = await this.client.get<CashRegisterStatus>(
        `/api/admin/cash-register/open`,
        {
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        },
      );

      if (isSuccess(response)) {
        return unwrapData(response);
      }

      handleApiError(response);
      return null;
    } catch (error) {
      logger.error("Error fetching cash status:", error);
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
    limit: number = 500,
  ): Promise<PendingBalanceOrder[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      if (searchTerm?.trim()) {
        params.append("search", searchTerm.trim());
      }

      const response = await this.client.get<PendingBalanceOrder[]>(
        `${this.basePath}/pending-balance?${params}`,
        {
          headers: branchId ? { "x-branch-id": branchId } : undefined,
        },
      );

      if (isSuccess(response)) {
        const data = unwrapData(response);
        return Array.isArray(data) ? data : [];
      }

      handleApiError(response);
      return [];
    } catch (error) {
      logger.error("Error fetching pending balance orders:", error);
      handleApiError(error);
      return [];
    }
  }

  /**
   * Process a pending payment
   */
  async processPendingPayment(
    request: PendingPaymentRequest,
    branchId?: string,
  ): Promise<PendingPaymentResponse | null> {
    try {
      const response = await this.client.post<PendingPaymentResponse>(
        `${this.basePath}/pending-balance/pay`,
        request,
        {
          headers: branchId ? { "x-branch-id": branchId } : undefined,
        },
      );

      if (isSuccess(response)) {
        const data = unwrapData(response);
        // Removed success toast from service layer to avoid double toasts
        return data;
      }

      // If response is not success, throw error with message from response
      const errorMessage =
        response.error?.message || "Error processing payment";
      throw new Error(errorMessage);
    } catch (error) {
      logger.error("Error processing pending payment:", error);
      throw error;
    }
  }

  /**
   * Process a complete sale
   */
  async processSale(
    orderData: ProcessSaleRequest,
    branchId?: string,
    fieldOperationId?: string,
  ): Promise<ProcessSaleResponse | null> {
    try {
      const headers = getBranchAndOperativoHeaders(branchId, fieldOperationId);
      const response = await this.client.post<ProcessSaleResponse>(
        `${this.basePath}/process-sale`,
        orderData,
        {
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        },
      );

      if (isSuccess(response)) {
        const data = unwrapData(response);

        const orderNumber =
          data?.work_order?.work_order_number || data?.order?.order_number;
        success(
          orderNumber
            ? `Venta procesada: ${orderNumber}`
            : "Venta procesada correctamente",
        );

        return data;
      }

      // For 5xx/network errors: show specific message (sale may have gone through)
      const errMsg = isError(response) ? (response.error?.message ?? "") : "";
      const errCode = isError(response) ? (response.error?.code ?? "") : "";
      const isServerOrNetwork =
        errCode === "NETWORK_ERROR" ||
        /internal server error|500|timeout|network error|failed to fetch/i.test(
          errMsg,
        );
      if (isServerOrNetwork) {
        const { error: showError } = await import(
          "@/lib/api/services/notificationService"
        );
        showError(
          "La venta puede haberse procesado. Revise en Caja u Órdenes antes de reintentar.",
        );
        return null;
      }

      handleApiError(response);
      return null;
    } catch (error) {
      logger.error("Error processing sale:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      const isServerOrNetwork = /network|timeout|failed to fetch/i.test(errMsg);
      if (isServerOrNetwork) {
        const { error: showError } = await import(
          "@/lib/api/services/notificationService"
        );
        showError(
          "La venta puede haberse procesado. Revise en Caja u Órdenes antes de reintentar.",
        );
        return null;
      }
      handleApiError(error);
      return null;
    }
  }

  /**
   * Process a refund for an order
   */
  async processRefund(
    request: {
      order_id: string;
      items: Array<{ order_item_id: string; quantity: number }>;
      reason: string;
      refund_type: "full" | "partial";
    },
    branchId?: string,
  ): Promise<{
    success: boolean;
    refund_amount: number;
    items_refunded: number;
  } | null> {
    try {
      const response = await this.client.post<{
        success: boolean;
        refund_amount: number;
        items_refunded: number;
      }>(`${this.basePath}/refund`, request, {
        headers: branchId ? { "x-branch-id": branchId } : undefined,
      });

      if (isSuccess(response)) {
        return unwrapData(response);
      }

      handleApiError(response);
      return null;
    } catch (error) {
      logger.error("Error processing refund:", error);
      handleApiError(error);
      return null;
    }
  }

  /**
   * Get billing settings
   */
  async getBillingSettings(
    branchId?: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.client.get<{
        settings: Record<string, unknown>;
      }>("/api/admin/billing/settings", {
        headers: branchId ? { "x-branch-id": branchId } : undefined,
      });

      if (isSuccess(response)) {
        const data = unwrapData(response);
        // Handle both wrapped {settings: {...}} and direct {...} responses
        if (data && typeof data === "object" && "settings" in data) {
          return (data as { settings: Record<string, unknown> }).settings;
        }
        return data as Record<string, unknown>;
      }

      handleApiError(response);
      return null;
    } catch (error) {
      logger.error("Error fetching billing settings:", error);
      handleApiError(error);
      return null;
    }
  }

  /**
   * Get current organization
   */
  async getCurrentOrganization(branchId?: string) {
    try {
      const response = await this.client.get<{
        organization: Record<string, unknown>;
      }>("/api/admin/organizations/current", {
        headers: branchId ? { "x-branch-id": branchId } : undefined,
      });

      if (isSuccess(response)) {
        const data = unwrapData(response);
        return data?.organization || null;
      }

      handleApiError(response);
      return null;
    } catch (error) {
      logger.error("Error fetching current organization:", error);
      handleApiError(error);
      return null;
    }
  }
}

// Export singleton instance
export const posService = new POSService();
