/**
 * Customer Service
 * 
 * Service layer for customer-related API operations.
 * Provides type-safe methods for CRUD operations on customers.
 */

import { ApiClient, isSuccess, unwrapData } from '../client-helpers';
import { handleApiError } from '@/lib/services/errorService';

// Import shared types from other services to avoid duplication
import type { Appointment } from './appointmentService';
import type { Quote } from './quoteService';

// Types
// Note: Using 'first_name' and 'last_name' instead of 'name' to match the database schema

export interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string; // Alternative field for compatibility
  email: string | null;
  phone?: string | null;
  rut?: string | null;
  branch_id: string;
  is_active?: boolean;
  is_active_customer?: boolean; // Alias for is_active used in UI
  created_at: string;
  updated_at?: string;
  
  // Personal info
  date_of_birth?: string | null;
  
  // Eye exam info
  last_eye_exam_date?: string | null;
  next_eye_exam_due?: string | null;
  
  // Medical info
  medical_conditions?: string[];
  allergies?: string[];
  
  // Emergency contact
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  
  // Address info (flat structure for UI convenience)
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  
  // Related data
  orders?: any[];
  prescriptions?: Prescription[];
  appointments?: Appointment[];
  quotes?: Quote[];
  lensPurchases?: LensPurchase[];
  
  // Analytics
  analytics?: CustomerAnalytics;
}

export interface Prescription {
  id: string;
  customer_id: string;
  prescription_number?: string;
  prescription_type?: string;
  prescription_date: string;
  expiration_date?: string;
  is_current?: boolean;
  is_active?: boolean;
  issued_by?: string;
  issued_by_license?: string;
  od_sphere?: number | null | undefined;
  od_cylinder?: number | null | undefined;
  od_axis?: number | null | undefined;
  od_add?: number | null | undefined;
  od_pd?: number | null | undefined;
  od_near_pd?: number | null | undefined;
  os_sphere?: number | null | undefined;
  os_cylinder?: number | null | undefined;
  os_axis?: number | null | undefined;
  os_add?: number | null | undefined;
  os_pd?: number | null | undefined;
  os_near_pd?: number | null | undefined;
  frame_pd?: number | null | undefined;
  height_segmentation?: number | null | undefined;
  pd_distance?: number | null | undefined;
  pd_near?: number | null | undefined;
  od_prism?: number | null | undefined;
  od_base?: number | null | undefined;
  os_prism?: number | null | undefined;
  os_base?: number | null | undefined;
  notes?: string;
  created_at?: string;
}

export interface LensPurchase {
  id: string;
  customer_id: string;
  prescription_id?: string;
  product_name: string;
  product_type: string;
  quantity: number;
  purchase_date: string;
  delivery_date?: string;
  status: 'ordered' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
  lens_type?: string;
  lens_material?: string;
  lens_index?: number;
  frame_brand?: string;
  frame_model?: string;
  frame_color?: string;
  total_amount: number;
  total_price?: number;
  unit_price?: number;
  created_at?: string;
}

export interface CustomerAnalytics {
  totalSpent: number;
  orderCount: number;
  lastOrderDate?: string;
  avgOrderValue: number;
  segment: string;
  lifetimeValue: number;
  favoriteProducts?: Array<{
    product?: {
      id: string;
      name?: string;
      featured_image?: string;
    };
    quantity: number;
    totalSpent: number;
  }>;
  orderStatusCounts?: Record<string, number>;
  monthlySpending?: Array<{
    month: string;
    amount: number;
    orderCount: number;
  }>;
}

export interface CreateCustomerData {
  name: string;
  email: string;
  phone?: string;
  rut?: string;
  shipping_info?: {
    address_1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    phone?: string;
  };
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {}

export interface CustomerSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  // Support for branch headers
  branchId?: string;
  isGlobalView?: boolean;
  isSuperAdmin?: boolean;
}

export interface CustomerListResponse {
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Client instance
const client = new ApiClient();

/**
 * Get headers for branch-specific requests
 */
function getBranchHeaders(branchId?: string, isGlobalView?: boolean, isSuperAdmin?: boolean): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (branchId) {
    headers['x-branch-id'] = branchId;
  }
  
  if (isGlobalView && isSuperAdmin) {
    headers['x-branch-id'] = 'global';
  }
  
  return headers;
}

/**
 * Get all customers with optional filters
 */
export async function getCustomers(
  params: CustomerSearchParams = {}
): Promise<CustomerListResponse> {
  try {
    // Build query params, excluding branch-related params
    const { branchId, isGlobalView, isSuperAdmin, ...queryParams } = params;
    
    const queryString = new URLSearchParams(
      Object.entries(queryParams)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][]
    ).toString();

    const headers = getBranchHeaders(branchId, isGlobalView, isSuperAdmin);

    const response = await client.get<Customer[]>(
      `/api/admin/customers${queryString ? `?${queryString}` : ''}`,
      { headers }
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

    throw new Error(response.error.message);
  } catch (error) {
    handleApiError(error, 'getCustomers');
    throw error;
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomer(id: string): Promise<Customer> {
  try {
    const response = await client.get<Customer>(`/api/admin/customers/${id}`);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, 'getCustomer');
    throw error;
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(data: CreateCustomerData): Promise<Customer> {
  try {
    const response = await client.post<Customer>('/api/admin/customers', data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, 'createCustomer');
    throw error;
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  id: string,
  data: UpdateCustomerData
): Promise<Customer> {
  try {
    const response = await client.put<Customer>(`/api/admin/customers/${id}`, data);
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, 'updateCustomer');
    throw error;
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(id: string): Promise<void> {
  try {
    const response = await client.delete(`/api/admin/customers/${id}`);
    unwrapData(response);
  } catch (error) {
    handleApiError(error, 'deleteCustomer');
    throw error;
  }
}

/**
 * Search customers by query
 */
export async function searchCustomers(query: string): Promise<Customer[]> {
  try {
    const response = await client.get<Customer[]>(
      `/api/admin/customers/search?q=${encodeURIComponent(query)}`
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, 'searchCustomers');
    throw error;
  }
}

/**
 * Get customer statistics (total, active, new this month)
 */
export async function getCustomerStats(
  branchId?: string,
  isGlobalView?: boolean,
  isSuperAdmin?: boolean
): Promise<{
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
}> {
  try {
    const headers = getBranchHeaders(branchId, isGlobalView, isSuperAdmin);
    
    const response = await client.post<{
      summary: {
        totalCustomers: number;
        activeCustomers: number;
        newCustomersThisMonth: number;
      };
    }>('/api/admin/customers', {}, { headers });
    
    if (isSuccess(response)) {
      return {
        totalCustomers: response.data.summary.totalCustomers,
        activeCustomers: response.data.summary.activeCustomers,
        newCustomersThisMonth: response.data.summary.newCustomersThisMonth,
      };
    }

    throw new Error(response.error.message);
  } catch (error) {
    handleApiError(error, 'getCustomerStats');
    throw error;
  }
}

// Export service object for convenience
export const customerService = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerStats,
  getPrescriptions,
  createPrescription,
};

// ============================================
// Prescription Methods (for POS) - Uses unified Prescription interface above
// ============================================

export interface CreatePrescriptionData {
  prescription_date: string;
  expiration_date?: string;
  prescription_number?: string;
  issued_by?: string;
  issued_by_license?: string;
  od_sphere?: number | null;
  od_cylinder?: number | null;
  od_axis?: number | null;
  od_add?: number | null;
  od_pd?: number | null;
  od_near_pd?: number | null;
  os_sphere?: number | null;
  os_cylinder?: number | null;
  os_axis?: number | null;
  os_add?: number | null;
  os_pd?: number | null;
  os_near_pd?: number | null;
  frame_pd?: number | null;
  height_segmentation?: number | null;
  is_current?: boolean;
}

/**
 * Get prescriptions for a customer
 */
export async function getPrescriptions(customerId: string): Promise<Prescription[]> {
  try {
    const response = await client.get<Prescription[]>(
      `/api/admin/customers/${customerId}/prescriptions`
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, 'getPrescriptions');
    throw error;
  }
}

/**
 * Create a prescription for a customer
 */
export async function createPrescription(
  customerId: string,
  data: CreatePrescriptionData
): Promise<Prescription> {
  try {
    const response = await client.post<Prescription>(
      `/api/admin/customers/${customerId}/prescriptions`,
      data
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, 'createPrescription');
    throw error;
  }
}
