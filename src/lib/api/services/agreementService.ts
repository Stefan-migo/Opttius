/**
 * Agreement Service
 *
 * Service layer for agreement (convenio) related API operations.
 * Provides type-safe methods for CRUD and management of B2B agreements.
 */

import {
  ApiClient,
  isSuccess,
  unwrapData,
  handlePaginatedResponse,
} from "../client-helpers";
import { handleApiError } from "@/lib/services/errorService";

export interface Agreement {
  id: string;
  organization_id: string;
  branch_id: string | null;
  name: string;
  agreement_type: "empresa" | "sindicato" | "mutual";
  institution_name: string;
  institution_rut: string;
  representative_name: string | null;
  representative_email: string | null;
  representative_phone: string | null;
  valid_from: string;
  valid_until: string | null;
  status: "active" | "suspended" | "expired" | "cancelled";
  billing_rules?: Record<string, unknown>;
  max_installments_by_product?: Record<string, number>;
  discount_percent: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  purchase_orders?: AgreementPurchaseOrder[];
  pending_balances?: AgreementInstitutionalBalance[];
}

export interface AgreementPurchaseOrder {
  id: string;
  agreement_id: string;
  oc_number: string;
  issued_at: string | null;
  valid_until: string | null;
  max_amount: number | null;
  used_amount: number;
  status: "active" | "exhausted" | "expired" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgreementInstitutionalBalance {
  id: string;
  agreement_id: string;
  order_id: string;
  purchase_order_id: string | null;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
  order_number?: string;
  order_total?: number;
  customer_name?: string;
  order_created_at?: string;
}

export interface CreateAgreementData {
  name: string;
  agreement_type: "empresa" | "sindicato" | "mutual";
  institution_name: string;
  institution_rut: string;
  representative_name?: string | null;
  representative_email?: string | null;
  representative_phone?: string | null;
  valid_from: string;
  valid_until?: string | null;
  branch_id?: string | null;
  billing_rules?: Record<string, unknown>;
  max_installments_by_product?: Record<string, number>;
  discount_percent?: number | null;
  notes?: string | null;
}

export interface CreatePurchaseOrderData {
  agreement_id: string;
  oc_number: string;
  issued_at?: string | null;
  valid_until?: string | null;
  max_amount?: number | null;
  notes?: string | null;
}

export interface ReconcileData {
  balance_ids: string[];
  paid_at: string;
  payment_reference?: string | null;
  emit_invoice?: boolean;
}

export interface AgreementInstitutionalInvoice {
  id: string;
  folio: string;
  status: string;
  total_amount: number;
  period_from: string;
  period_to: string;
  emitted_at: string | null;
  pdf_url: string | null;
  created_at: string;
}

export interface AgreementListParams {
  status?: "active" | "suspended" | "expired" | "cancelled";
  branch_id?: string | null;
  agreement_type?: "empresa" | "sindicato" | "mutual";
  page?: number;
  limit?: number;
  branchId?: string;
}

export interface AgreementListResponse {
  data: Agreement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const client = new ApiClient();

function getHeaders(branchId?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (branchId) headers["x-branch-id"] = branchId;
  return headers;
}

export async function getAgreements(
  params: AgreementListParams = {},
): Promise<AgreementListResponse> {
  try {
    const { branchId, ...queryParams } = params;
    const queryString = new URLSearchParams(
      Object.entries(queryParams)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();

    const response = await client.get<Agreement[]>(
      `/api/admin/agreements${queryString ? `?${queryString}` : ""}`,
      { headers: getHeaders(branchId) },
    );

    if (isSuccess(response)) {
      return {
        data: response.data,
        pagination: response.meta?.pagination || {
          page: params.page || 1,
          limit: params.limit || 20,
          total: response.data.length,
          totalPages: 1,
        },
      };
    }
    throw new Error(
      (response as any).error?.message || "Error al obtener convenios",
    );
  } catch (error) {
    handleApiError(error, "getAgreements");
    throw error;
  }
}

export async function getAgreement(id: string): Promise<Agreement> {
  try {
    const response = await client.get<Agreement>(`/api/admin/agreements/${id}`);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "getAgreement");
    throw error;
  }
}

export async function createAgreement(
  data: CreateAgreementData,
): Promise<Agreement> {
  try {
    const response = await client.post<Agreement>(
      "/api/admin/agreements",
      data,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "createAgreement");
    throw error;
  }
}

export async function updateAgreement(
  id: string,
  data: Partial<CreateAgreementData>,
): Promise<Agreement> {
  try {
    const response = await client.put<Agreement>(
      `/api/admin/agreements/${id}`,
      data,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updateAgreement");
    throw error;
  }
}

export async function updateAgreementStatus(
  id: string,
  status: "active" | "suspended" | "expired" | "cancelled",
): Promise<Agreement> {
  try {
    const res = await fetch(`/api/admin/agreements/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al actualizar estado");
    return json.data;
  } catch (error) {
    handleApiError(error, "updateAgreementStatus");
    throw error;
  }
}

export async function getPurchaseOrders(
  agreementId: string,
): Promise<AgreementPurchaseOrder[]> {
  try {
    const response = await client.get<AgreementPurchaseOrder[]>(
      `/api/admin/agreements/${agreementId}/purchase-orders`,
    );
    return isSuccess(response) ? response.data : [];
  } catch (error) {
    handleApiError(error, "getPurchaseOrders");
    throw error;
  }
}

export async function createPurchaseOrder(
  agreementId: string,
  data: Omit<CreatePurchaseOrderData, "agreement_id">,
): Promise<AgreementPurchaseOrder> {
  try {
    const response = await client.post<AgreementPurchaseOrder>(
      `/api/admin/agreements/${agreementId}/purchase-orders`,
      { ...data, agreement_id: agreementId },
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "createPurchaseOrder");
    throw error;
  }
}

export async function updatePurchaseOrder(
  purchaseOrderId: string,
  data: Partial<Omit<CreatePurchaseOrderData, "agreement_id">> & {
    status?: "active" | "exhausted" | "expired" | "cancelled";
  },
): Promise<AgreementPurchaseOrder> {
  try {
    const response = await client.put<AgreementPurchaseOrder>(
      `/api/admin/agreements/purchase-orders/${purchaseOrderId}`,
      data,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updatePurchaseOrder");
    throw error;
  }
}

export async function getInstitutionalBalances(
  agreementId: string,
  status?: string,
): Promise<AgreementInstitutionalBalance[]> {
  try {
    const query = status ? `?status=${status}` : "";
    const response = await client.get<AgreementInstitutionalBalance[]>(
      `/api/admin/agreements/${agreementId}/institutional-balances${query}`,
    );
    return isSuccess(response) ? response.data : [];
  } catch (error) {
    handleApiError(error, "getInstitutionalBalances");
    throw error;
  }
}

export async function reconcileBalances(data: ReconcileData): Promise<{
  reconciled_count: number;
  balances: AgreementInstitutionalBalance[];
  invoice?: { id: string; folio: string; pdf_url: string };
}> {
  try {
    const response = await client.post<{
      reconciled_count: number;
      balances: AgreementInstitutionalBalance[];
      invoice?: { id: string; folio: string; pdf_url: string };
    }>("/api/admin/agreements/reconcile", data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "reconcileBalances");
    throw error;
  }
}

export async function getAgreementInvoices(
  agreementId: string,
  params?: { page?: number; limit?: number; status?: string },
): Promise<{
  data: AgreementInstitutionalInvoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    const queryStr = query.toString() ? `?${query.toString()}` : "";
    const response = await client.get<AgreementInstitutionalInvoice[]>(
      `/api/admin/agreements/${agreementId}/invoices${queryStr}`,
    );
    const result = handlePaginatedResponse(response);
    if (!result.isSuccess) throw new Error(result.error);
    return {
      data: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    handleApiError(error, "getAgreementInvoices");
    throw error;
  }
}

export async function getAgreementInvoice(
  agreementId: string,
  invoiceId: string,
): Promise<
  AgreementInstitutionalInvoice & {
    items?: Array<{
      balance_id: string;
      amount: number;
      order_number: string;
      oc_number: string | null;
      customer_name: string | null;
      order_created_at: string | null;
    }>;
  }
> {
  try {
    const response = await client.get(
      `/api/admin/agreements/${agreementId}/invoices/${invoiceId}`,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "getAgreementInvoice");
    throw error;
  }
}

export interface AgreementCustomer {
  customer_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  rut: string | null;
  order_count: number;
  last_order_at: string;
  total_copago: number;
  total_institutional: number;
}

export async function getAgreementCustomers(
  agreementId: string,
  params?: { page?: number; limit?: number },
): Promise<{
  data: AgreementCustomer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const queryStr = query.toString() ? `?${query.toString()}` : "";
    const response = await client.get<AgreementCustomer[]>(
      `/api/admin/agreements/${agreementId}/customers${queryStr}`,
    );
    if (isSuccess(response)) {
      return {
        data: response.data,
        pagination: response.meta?.pagination || {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: response.data.length,
          totalPages: 1,
        },
      };
    }
    throw new Error("Error al obtener clientes del convenio");
  } catch (error) {
    handleApiError(error, "getAgreementCustomers");
    throw error;
  }
}

export async function getAgreementAnalytics(
  agreementId: string,
  from?: string,
  to?: string,
): Promise<{
  total_orders: number;
  unique_customers?: number;
  total_sales: number;
  total_copago: number;
  total_institutional: number;
  pending_amount: number;
  paid_amount: number;
  collection_efficiency: number;
}> {
  try {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(
      `/api/admin/agreements/${agreementId}/analytics${query}`,
    );
    const json = await response.json();
    if (!response.ok)
      throw new Error(json.error || "Error al obtener analítica");
    return json.data;
  } catch (error) {
    handleApiError(error, "getAgreementAnalytics");
    throw error;
  }
}

export const agreementService = {
  getAgreements,
  getAgreement,
  createAgreement,
  updateAgreement,
  updateAgreementStatus,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  getInstitutionalBalances,
  reconcileBalances,
  getAgreementInvoices,
  getAgreementInvoice,
  getAgreementAnalytics,
  getAgreementCustomers,
};
