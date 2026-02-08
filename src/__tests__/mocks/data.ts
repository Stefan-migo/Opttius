/**
 * Mock Data Utilities for Testing
 * Provides realistic mock data for various entities
 */

import { vi } from "vitest";

// Mock User Data
export const mockUsers = {
  admin: {
    id: "user-admin-1",
    email: "admin@test.com",
    role: "admin",
    full_name: "Admin User",
    phone: "+1234567890",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },

  customer: {
    id: "user-customer-1",
    email: "customer@test.com",
    role: "customer",
    full_name: "Customer User",
    phone: "+1234567891",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },

  staff: {
    id: "user-staff-1",
    email: "staff@test.com",
    role: "staff",
    full_name: "Staff User",
    phone: "+1234567892",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

// Mock Organization Data
export const mockOrganizations = {
  primary: {
    id: "org-1",
    name: "Test Optical Store",
    slug: "test-optical-store",
    email: "contact@testoptical.com",
    phone: "+1234567890",
    address: "123 Main St, City, State 12345",
    subscription_status: "active",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },

  secondary: {
    id: "org-2",
    name: "Another Optical Store",
    slug: "another-optical-store",
    email: "contact@anotheroptical.com",
    phone: "+1234567891",
    address: "456 Oak Ave, City, State 12345",
    subscription_status: "trial",
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  },
};

// Mock Product Data
export const mockProducts = {
  frames: {
    id: "prod-frame-1",
    name: "Designer Frames",
    description: "Premium eyeglass frames",
    price: 199.99,
    cost_price: 89.99,
    sku: "FRAME-001",
    category: "frames",
    brand: "Designer Brand",
    stock_quantity: 50,
    status: "active",
    organization_id: "org-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },

  lenses: {
    id: "prod-lens-1",
    name: "Prescription Lenses",
    description: "Custom prescription lenses",
    price: 149.99,
    cost_price: 49.99,
    sku: "LENS-001",
    category: "lenses",
    brand: "Optical Labs",
    stock_quantity: 100,
    status: "active",
    organization_id: "org-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

// Mock Order Data
export const mockOrders = {
  pending: {
    id: "order-1",
    order_number: "ORD-001",
    customer_id: "user-customer-1",
    organization_id: "org-1",
    status: "pending",
    total_amount: 349.98,
    subtotal: 299.98,
    tax_amount: 30.0,
    shipping_amount: 20.0,
    currency: "USD",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  },

  completed: {
    id: "order-2",
    order_number: "ORD-002",
    customer_id: "user-customer-1",
    organization_id: "org-1",
    status: "completed",
    total_amount: 299.99,
    subtotal: 249.99,
    tax_amount: 25.0,
    shipping_amount: 25.0,
    currency: "USD",
    created_at: "2024-01-10T14:20:00Z",
    updated_at: "2024-01-12T09:15:00Z",
    shipped_at: "2024-01-11T16:45:00Z",
  },
};

// Mock Customer Data
export const mockCustomers = {
  regular: {
    id: "cust-1",
    email: "customer1@test.com",
    full_name: "John Doe",
    phone: "+1234567890",
    address: "789 Pine St, City, State 12345",
    organization_id: "org-1",
    created_at: "2024-01-05T08:00:00Z",
    updated_at: "2024-01-05T08:00:00Z",
  },

  vip: {
    id: "cust-2",
    email: "customer2@test.com",
    full_name: "Jane Smith",
    phone: "+1234567891",
    address: "321 Elm St, City, State 12345",
    organization_id: "org-1",
    created_at: "2024-01-03T12:00:00Z",
    updated_at: "2024-01-03T12:00:00Z",
  },
};

// Mock API Responses
export const mockApiResponses = {
  success: {
    status: 200,
    ok: true,
    json: () => Promise.resolve({ success: true }),
  },

  created: {
    status: 201,
    ok: true,
    json: () => Promise.resolve({ id: "new-id", success: true }),
  },

  validationError: {
    status: 400,
    ok: false,
    json: () =>
      Promise.resolve({
        error: "Validation failed",
        details: { field: "Required field" },
      }),
  },

  unauthorized: {
    status: 401,
    ok: false,
    json: () => Promise.resolve({ error: "Unauthorized" }),
  },

  notFound: {
    status: 404,
    ok: false,
    json: () => Promise.resolve({ error: "Not found" }),
  },

  serverError: {
    status: 500,
    ok: false,
    json: () => Promise.resolve({ error: "Internal server error" }),
  },
};

// Mock Database Query Results
export const mockDbResults = {
  users: [mockUsers.admin, mockUsers.customer, mockUsers.staff],
  organizations: [mockOrganizations.primary, mockOrganizations.secondary],
  products: [mockProducts.frames, mockProducts.lenses],
  orders: [mockOrders.pending, mockOrders.completed],
  customers: [mockCustomers.regular, mockCustomers.vip],
};

// Utility functions
export const createMockListResponse = (items: any[], page = 1, limit = 10) => ({
  data: items.slice((page - 1) * limit, page * limit),
  pagination: {
    page,
    limit,
    total: items.length,
    totalPages: Math.ceil(items.length / limit),
  },
});

export const createMockEntityWithTimestamps = (
  entity: any,
  overrides = {},
) => ({
  ...entity,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockError = (message: string, code = "UNKNOWN_ERROR") => ({
  message,
  code,
  name: "MockError",
});

// Mock Supabase Client
export const createMockSupabaseClient = () => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: vi.fn().mockResolvedValue({ data: [], error: null }),
});
