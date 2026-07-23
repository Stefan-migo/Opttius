/**
 * Customer Service — Client-side service for customer API operations.
 */
import { handleApiError } from "@/lib/api/services/errorService";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";
import type { CreateCustomerData, CreatePrescriptionData, Customer, CustomerListResponse, CustomerSearchParams, Prescription, UpdateCustomerData } from "./customerTypes";

const client = new ApiClient();

function getBranchHeaders(branchId?: string, isGlobalView?: boolean, isSuperAdmin?: boolean, fieldOperationId?: string): HeadersInit {
  return { "Content-Type": "application/json", ...getBranchAndOperativoHeaders(isGlobalView && isSuperAdmin ? "global" : branchId, fieldOperationId) };
}

export async function getCustomers(params: CustomerSearchParams = {}): Promise<CustomerListResponse> {
  try {
    const { branchId, isGlobalView, isSuperAdmin, fieldOperationId, ...queryParams } = params;
    const qs = new URLSearchParams(Object.entries(queryParams).filter(([_, v]) => v !== undefined).map(([k, v]) => [k === "agreementId" ? "agreement_id" : k, String(v)]) as [string, string][]).toString();
    const response = await client.get<Customer[]>(`/api/admin/customers${qs ? `?${qs}` : ""}`, { headers: getBranchHeaders(branchId, isGlobalView, isSuperAdmin, params.fieldOperationId) });
    if (isSuccess(response)) return { data: response.data, pagination: response.meta?.pagination || { page: params.page || 1, limit: params.limit || 10, total: response.data.length, totalPages: 1 } };
    throw new Error(response.success === false && response.error?.message ? response.error.message : "An unknown error occurred");
  } catch (error) { handleApiError(error, "getCustomers"); throw error; }
}

export async function getCustomer(id: string): Promise<Customer> { try { return unwrapData(await client.get<Customer>(`/api/admin/customers/${id}`)); } catch (error) { handleApiError(error, "getCustomer"); throw error; } }
export async function createCustomer(data: CreateCustomerData): Promise<Customer> { try { return unwrapData(await client.post<Customer>("/api/admin/customers", data)); } catch (error) { handleApiError(error, "createCustomer"); throw error; } }
export async function updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> { try { return unwrapData(await client.put<Customer>(`/api/admin/customers/${id}`, data)); } catch (error) { handleApiError(error, "updateCustomer"); throw error; } }
export async function deleteCustomer(id: string): Promise<void> { try { unwrapData(await client.delete(`/api/admin/customers/${id}`)); } catch (error) { handleApiError(error, "deleteCustomer"); throw error; } }

export async function searchCustomers(query: string, branchId?: string | null, fieldOperationId?: string | null): Promise<Customer[]> {
  try {
    const headers = getBranchAndOperativoHeaders(branchId ?? null, fieldOperationId ?? undefined);
    const data = unwrapData(await client.get<Customer[]>(`/api/admin/customers/search?q=${encodeURIComponent(query)}`, { headers: { "Content-Type": "application/json", ...headers } }));
    return Array.isArray(data) ? data : [];
  } catch (error) { handleApiError(error, "searchCustomers"); throw error; }
}

export async function getCustomerStats(branchId?: string, isGlobalView?: boolean, isSuperAdmin?: boolean): Promise<{ totalCustomers: number; activeCustomers: number; newCustomersThisMonth: number }> {
  try {
    const response = await client.post<{ summary: { totalCustomers: number; activeCustomers: number; newCustomersThisMonth: number } }>("/api/admin/customers", {}, { headers: getBranchHeaders(branchId, isGlobalView, isSuperAdmin) });
    if (isSuccess(response)) return response.data.summary;
    throw new Error(response.success === false && response.error?.message ? response.error.message : "An unknown error occurred");
  } catch (error) { handleApiError(error, "getCustomerStats"); throw error; }
}

export const customerService = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, searchCustomers, getCustomerStats, getPrescriptions, createPrescription };

// Prescription Methods
export async function getPrescriptions(customerId: string): Promise<Prescription[]> {
  try { const data = unwrapData(await client.get<Prescription[]>(`/api/admin/customers/${customerId}/prescriptions`)); return Array.isArray(data) ? data : []; }
  catch (error) { handleApiError(error, "getPrescriptions"); throw error; }
}

export async function createPrescription(customerId: string, data: CreatePrescriptionData): Promise<Prescription> {
  try { return unwrapData(await client.post<Prescription>(`/api/admin/customers/${customerId}/prescriptions`, data)); }
  catch (error) { handleApiError(error, "createPrescription"); throw error; }
}
