/**
 * Quote Service
 *
 * Service layer for quote-related API operations.
 * Provides type-safe methods for CRUD operations on quotes.
 */

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";
import { handleApiError } from "@/lib/services/errorService";

// Types
export interface Quote {
  id: string;
  customer_id?: string;
  customer?: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  customer_name?: string;
  customer_email?: string;
  quote_number: string;
  quote_date: string;
  expiration_date?: string;
  status:
    | "draft"
    | "sent"
    | "accepted"
    | "rejected"
    | "expired"
    | "converted_to_work";
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  valid_until?: string;
  notes?: string;
  branch_id?: string;
  created_at: string;
  updated_at?: string;
  frame_name?: string;
  frame_brand?: string;
  frame_model?: string;
  frame_color?: string;
  frame_price?: number;
  lens_type?: string;
  lens_material?: string;
  lens_index?: number;
  lens_cost?: number;
  treatments_cost?: number;
  labor_cost?: number;
  converted_to_work_order_id?: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  total_price: number;
}

export interface CreateQuoteData {
  customer_id: string;
  status?: "draft" | "sent" | "accepted" | "rejected" | "expired";
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency?: string;
  valid_until?: string;
  notes?: string;
  branch_id?: string;
  // Frame fields
  prescription_id?: string | null;
  frame_product_id?: string | null;
  customer_own_frame?: boolean;
  frame_name?: string | null;
  frame_brand?: string | null;
  frame_model?: string | null;
  frame_color?: string | null;
  frame_size?: string | null;
  frame_sku?: string | null;
  frame_price?: number;
  frame_cost?: number;
  // Lens fields
  lens_family_id?: string | null;
  lens_type?: string | null;
  lens_material?: string | null;
  lens_index?: number | null;
  lens_treatments?: string[];
  lens_tint_color?: string | null;
  lens_tint_percentage?: number | null;
  lens_cost?: number;
  treatments_cost?: number;
  labor_cost?: number;
  // Presbyopia solution fields
  presbyopia_solution?:
    | "none"
    | "two_separate"
    | "bifocal"
    | "trifocal"
    | "progressive";
  far_lens_family_id?: string | null;
  near_lens_family_id?: string | null;
  far_lens_cost?: number;
  near_lens_cost?: number;
  // Near frame fields
  near_frame_product_id?: string | null;
  near_frame_name?: string | null;
  near_frame_brand?: string | null;
  near_frame_model?: string | null;
  near_frame_color?: string | null;
  near_frame_size?: string | null;
  near_frame_sku?: string | null;
  near_frame_price?: number;
  near_frame_cost?: number;
  customer_own_near_frame?: boolean;
  // Contact lens fields
  contact_lens_family_id?: string | null;
  contact_lens_rx_sphere_od?: number | null;
  contact_lens_rx_cylinder_od?: number | null;
  contact_lens_rx_axis_od?: number | null;
  contact_lens_rx_add_od?: number | null;
  contact_lens_rx_base_curve_od?: number | null;
  contact_lens_rx_diameter_od?: number | null;
  contact_lens_rx_sphere_os?: number | null;
  contact_lens_rx_cylinder_os?: number | null;
  contact_lens_rx_axis_os?: number | null;
  contact_lens_rx_add_os?: number | null;
  contact_lens_rx_base_curve_os?: number | null;
  contact_lens_rx_diameter_os?: number | null;
  contact_lens_quantity?: number;
  contact_lens_cost?: number;
  contact_lens_price?: number;
  items?: Omit<QuoteItem, "id" | "quote_id">[];
}

export interface UpdateQuoteData extends Partial<CreateQuoteData> {}

export interface QuoteSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customer_id?: string;
  branch_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface QuoteListResponse {
  data: Quote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuoteWithItems extends Quote {
  items: QuoteItem[];
}

// API Client instance
const client = new ApiClient();

/**
 * Get all quotes with optional filters
 */
export async function getQuotes(
  params: QuoteSearchParams = {},
): Promise<QuoteListResponse> {
  try {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();

    const response = await client.get<Quote[]>(
      `/api/admin/quotes${queryString ? `?${queryString}` : ""}`,
    );

    if (isSuccess(response)) {
      return {
        data: response.data,
        pagination: response.meta?.pagination || {
          page: params.page || 1,
          limit: params.limit || 10,
          total: response.data.length,
          totalPages: 1,
        },
      };
    }

    const errorMessage =
      response.success === false && response.error?.message
        ? response.error.message
        : "An unknown error occurred";
    throw new Error(errorMessage);
  } catch (error) {
    handleApiError(error, "getQuotes");
    throw error;
  }
}

/**
 * Get a single quote by ID
 */
export async function getQuote(id: string): Promise<QuoteWithItems> {
  try {
    const response = await client.get<QuoteWithItems>(
      `/api/admin/quotes/${id}`,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "getQuote");
    throw error;
  }
}

/**
 * Create a new quote
 */
export async function createQuote(data: CreateQuoteData): Promise<Quote> {
  try {
    const response = await client.post<Quote>("/api/admin/quotes", data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "createQuote");
    throw error;
  }
}

/**
 * Update an existing quote
 */
export async function updateQuote(
  id: string,
  data: UpdateQuoteData,
): Promise<Quote> {
  try {
    const response = await client.put<Quote>(`/api/admin/quotes/${id}`, data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updateQuote");
    throw error;
  }
}

/**
 * Delete a quote
 */
export async function deleteQuote(id: string): Promise<void> {
  try {
    const response = await client.delete(`/api/admin/quotes/${id}`);
    unwrapData(response);
  } catch (error) {
    handleApiError(error, "deleteQuote");
    throw error;
  }
}

/**
 * Send a quote to customer
 */
export async function sendQuote(id: string, email?: string): Promise<Quote> {
  try {
    const response = await client.post<Quote>(
      `/api/admin/quotes/${id}/send`,
      email ? { email } : {},
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "sendQuote");
    throw error;
  }
}

/**
 * Accept a quote
 */
export async function acceptQuote(id: string): Promise<Quote> {
  try {
    const response = await client.post<Quote>(
      `/api/admin/quotes/${id}/accept`,
      {},
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "acceptQuote");
    throw error;
  }
}

/**
 * Reject a quote
 */
export async function rejectQuote(id: string, reason?: string): Promise<Quote> {
  try {
    const response = await client.post<Quote>(
      `/api/admin/quotes/${id}/reject`,
      { reason },
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "rejectQuote");
    throw error;
  }
}

/**
 * Convert a quote to an order
 */
export async function convertQuoteToOrder(
  id: string,
): Promise<{ order_id: string }> {
  try {
    const response = await client.post<{ order_id: string }>(
      `/api/admin/quotes/${id}/convert`,
      {},
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "convertQuoteToOrder");
    throw error;
  }
}

/**
 * Add an item to a quote
 */
export async function addQuoteItem(
  quoteId: string,
  item: Omit<QuoteItem, "id" | "quote_id">,
): Promise<QuoteItem> {
  try {
    const response = await client.post<QuoteItem>(
      `/api/admin/quotes/${quoteId}/items`,
      item,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "addQuoteItem");
    throw error;
  }
}

/**
 * Update a quote item
 */
export async function updateQuoteItem(
  quoteId: string,
  itemId: string,
  item: Partial<Omit<QuoteItem, "id" | "quote_id">>,
): Promise<QuoteItem> {
  try {
    const response = await client.put<QuoteItem>(
      `/api/admin/quotes/${quoteId}/items/${itemId}`,
      item,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updateQuoteItem");
    throw error;
  }
}

/**
 * Remove a quote item
 */
export async function removeQuoteItem(
  quoteId: string,
  itemId: string,
): Promise<void> {
  try {
    const response = await client.delete(
      `/api/admin/quotes/${quoteId}/items/${itemId}`,
    );
    unwrapData(response);
  } catch (error) {
    handleApiError(error, "removeQuoteItem");
    throw error;
  }
}

// Export service object for convenience
export const quoteService = {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  sendQuote,
  acceptQuote,
  rejectQuote,
  convertQuoteToOrder,
  addQuoteItem,
  updateQuoteItem,
  removeQuoteItem,
};
