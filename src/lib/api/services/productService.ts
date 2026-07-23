/**
 * Product Service — Client-side service for product API operations.
 */
import { handleApiError } from "@/lib/api/services/errorService";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";
import type { BulkProductData, BulkProductOperationData, CreateProductData, Product, ProductListResponse, ProductSearchParams, UpdateProductData } from "./products/client-types";

const client = new ApiClient();

function extractProductFromResponse(response: unknown): Product {
  const r = response as Record<string, unknown>;
  if (r?.success === true && r?.data) return r.data as Product;
  if (r?.product) return r.product as Product;
  throw new Error("Invalid response format");
}

export async function getProducts(params: ProductSearchParams = {}): Promise<ProductListResponse> {
  try {
    const qs = new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)]) as [string, string][]).toString();
    const response = await client.get<Product[]>(`/api/admin/products${qs ? `?${qs}` : ""}`);
    if (isSuccess(response)) return { data: response.data, pagination: response.meta?.pagination || { page: params.page || 1, limit: params.limit || 10, total: response.data.length, totalPages: 1 } };
    throw new Error(response.success === false && response.error?.message ? response.error.message : "An unknown error occurred");
  } catch (error) { handleApiError(error, "getProducts"); throw error; }
}

export async function getProduct(id: string, branchId?: string): Promise<Product> {
  try {
    const headers: HeadersInit = {};
    if (branchId) headers["x-branch-id"] = branchId;
    return extractProductFromResponse(await client.get(`/api/admin/products/${id}`, { headers }));
  } catch (error) { handleApiError(error, "getProduct"); throw error; }
}

export async function createProduct(data: CreateProductData): Promise<Product> {
  try { return extractProductFromResponse(await client.post("/api/admin/products", data)); }
  catch (error) { handleApiError(error, "createProduct"); throw error; }
}

export async function updateProduct(id: string, data: UpdateProductData, branchId?: string | null): Promise<Product> {
  try {
    const headers: HeadersInit = {};
    if (branchId) headers["x-branch-id"] = branchId;
    return extractProductFromResponse(await client.put(`/api/admin/products/${id}`, data, Object.keys(headers).length ? { headers } : undefined));
  } catch (error) { handleApiError(error, "updateProduct"); throw error; }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    const response = await client.delete(`/api/admin/products/${id}`);
    if (isSuccess(response)) return;
    if (response && typeof response === "object" && "error" in response) throw new Error((response as unknown).error?.message || "Failed to delete product");
  } catch (error) { handleApiError(error, "deleteProduct"); throw error; }
}

export async function searchProducts(query: string, branchId?: string, type?: string, fieldOperationId?: string | null): Promise<Product[]> {
  try {
    const params = new URLSearchParams({ q: query, ...(branchId && { branch_id: branchId }), ...(type && { type }) });
    const headers = getBranchAndOperativoHeaders(branchId ?? null, fieldOperationId ?? undefined);
    const response = await client.get<Product[]>(`/api/admin/products/search?${params.toString()}`, { headers: { "Content-Type": "application/json", ...headers } });
    return Array.isArray(unwrapData(response)) ? unwrapData(response) as Product[] : [];
  } catch (error) { handleApiError(error, "searchProducts"); throw error; }
}

export async function updateProductStock(id: string, quantity: number, branch_id?: string): Promise<Product> {
  try { return unwrapData(await client.put<Product>(`/api/admin/products/${id}/stock`, { quantity, branch_id })); }
  catch (error) { handleApiError(error, "updateProductStock"); throw error; }
}

export async function bulkProducts(data: BulkProductData): Promise<{ success: string[]; failed: { id?: string; error: string }[] }> {
  try { return unwrapData(await client.post<{ success: string[]; failed: { id?: string; error: string }[] }>("/api/admin/products/bulk", data)); }
  catch (error) { handleApiError(error, "bulkProducts"); throw error; }
}

export async function bulkProductOperations(data: BulkProductOperationData): Promise<{ success: string[]; failed: { id?: string; error: string }[] }> {
  try { return unwrapData(await client.post<{ success: string[]; failed: { id?: string; error: string }[] }>("/api/admin/products/bulk", data)); }
  catch (error) { handleApiError(error, "bulkProductOperations"); throw error; }
}

export async function getProductBySlug(slug: string): Promise<Product> {
  try { return extractProductFromResponse(await client.get(`/api/products/${slug}`)); }
  catch (error) { handleApiError(error, "getProductBySlug"); throw error; }
}

export async function exportProducts(format: "csv" | "json" = "csv", filters?: { category?: string; status?: string }): Promise<Blob> {
  const params = new URLSearchParams({ format: format === "csv" ? "csv" : "json", ...(filters?.category && filters.category !== "all" && { category_id: filters.category }), ...(filters?.status && filters.status !== "all" && { status: filters.status }) });
  const response = await fetch(`/api/admin/products/bulk?${params}`);
  if (!response.ok) throw new Error("Failed to export products");
  return response.blob();
}

export async function importProductsFile(file: File, mode: "create" | "update" | "skip" = "create"): Promise<{ success: boolean; summary: { total_processed: number; created: number; updated: number; skipped: number; errors_count: number } }> {
  const formData = new FormData(); formData.append("file", file); formData.append("mode", mode);
  const response = await fetch("/api/admin/products/import", { method: "POST", body: formData });
  if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error((err as unknown).error || "Failed to import products"); }
  return response.json();
}

export const productService = {
  getProducts, getProduct, getProductBySlug, createProduct, updateProduct, deleteProduct,
  searchProducts, updateProductStock, bulkProducts, importProductsFile, exportProducts,
};
