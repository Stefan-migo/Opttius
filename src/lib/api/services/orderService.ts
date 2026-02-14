/**
 * Order Service
 *
 * Service layer for order-related API operations.
 * Provides type-safe methods for CRUD operations on orders.
 */

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";
import { handleApiError } from "@/lib/services/errorService";

// Types
export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  order_number: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_method?: string;
  mp_payment_id?: string | null;
  mp_payment_method?: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  branch_id?: string;
  order_items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  variant_title?: string | null;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  total_price: number;
}

export interface ShippingInfo {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
}

export interface CreateOrderData {
  customer_id: string;
  status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_status?: "pending" | "paid" | "failed" | "refunded";
  payment_method?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency?: string;
  notes?: string;
  branch_id?: string;
  shipping?: ShippingInfo;
  items?: Omit<OrderItem, "id" | "order_id">[];
}

export interface UpdateOrderData extends Partial<CreateOrderData> {}

export interface OrderSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  payment_status?: string;
  customer_id?: string;
  branch_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface OrderListResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  shipping?: ShippingInfo;
}

// API Client instance
const client = new ApiClient();

/**
 * Get all orders with optional filters
 */
export async function getOrders(
  params: OrderSearchParams = {},
): Promise<OrderListResponse> {
  try {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();

    const response = await client.get<Order[]>(
      `/api/admin/orders${queryString ? `?${queryString}` : ""}`,
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
    handleApiError(error, "getOrders");
    throw error;
  }
}

/**
 * Get a single order by ID
 */
export async function getOrder(id: string): Promise<OrderWithItems> {
  try {
    const response = await client.get<OrderWithItems>(
      `/api/admin/orders/${id}`,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "getOrder");
    throw error;
  }
}

/**
 * Create a new order
 */
export async function createOrder(data: CreateOrderData): Promise<Order> {
  try {
    const response = await client.post<Order>("/api/admin/orders", data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "createOrder");
    throw error;
  }
}

/**
 * Create a manual order
 */
export async function createManualOrder(data: CreateOrderData): Promise<Order> {
  try {
    const response = await client.post<Order>("/api/admin/orders/manual", data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "createManualOrder");
    throw error;
  }
}

/**
 * Update an existing order
 */
export async function updateOrder(
  id: string,
  data: UpdateOrderData,
): Promise<Order> {
  try {
    const response = await client.put<Order>(`/api/admin/orders/${id}`, data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updateOrder");
    throw error;
  }
}

/**
 * Delete an order
 */
export async function deleteOrder(id: string): Promise<void> {
  try {
    const response = await client.delete(`/api/admin/orders/${id}`);
    unwrapData(response);
  } catch (error) {
    handleApiError(error, "deleteOrder");
    throw error;
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  id: string,
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled",
): Promise<Order> {
  try {
    const response = await client.put<Order>(`/api/admin/orders/${id}/status`, {
      status,
    });
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updateOrderStatus");
    throw error;
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  id: string,
  payment_status: "pending" | "paid" | "failed" | "refunded",
  payment_method?: string,
): Promise<Order> {
  try {
    const response = await client.put<Order>(
      `/api/admin/orders/${id}/payment`,
      {
        payment_status,
        payment_method,
      },
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updatePaymentStatus");
    throw error;
  }
}

/**
 * Add an item to an order
 */
export async function addOrderItem(
  orderId: string,
  item: Omit<OrderItem, "id" | "order_id">,
): Promise<OrderItem> {
  try {
    const response = await client.post<OrderItem>(
      `/api/admin/orders/${orderId}/items`,
      item,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "addOrderItem");
    throw error;
  }
}

/**
 * Update an order item
 */
export async function updateOrderItem(
  orderId: string,
  itemId: string,
  item: Partial<Omit<OrderItem, "id" | "order_id">>,
): Promise<OrderItem> {
  try {
    const response = await client.put<OrderItem>(
      `/api/admin/orders/${orderId}/items/${itemId}`,
      item,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updateOrderItem");
    throw error;
  }
}

/**
 * Remove an order item
 */
export async function removeOrderItem(
  orderId: string,
  itemId: string,
): Promise<void> {
  try {
    const response = await client.delete(
      `/api/admin/orders/${orderId}/items/${itemId}`,
    );
    unwrapData(response);
  } catch (error) {
    handleApiError(error, "removeOrderItem");
    throw error;
  }
}

/**
 * Process refund
 */
export async function processRefund(
  id: string,
  amount: number,
  reason?: string,
): Promise<Order> {
  try {
    const response = await client.post<Order>(
      `/api/admin/orders/${id}/refund`,
      {
        amount,
        reason,
      },
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "processRefund");
    throw error;
  }
}

// Export service object for convenience
export const orderService = {
  getOrders,
  getOrder,
  createOrder,
  createManualOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  updatePaymentStatus,
  addOrderItem,
  updateOrderItem,
  removeOrderItem,
  processRefund,
};
