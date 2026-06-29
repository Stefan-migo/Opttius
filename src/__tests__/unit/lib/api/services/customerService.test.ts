/**
 * Unit tests for customerService.
 *
 * Mocks ApiClient via globalThis-shared mock instance injected through
 * a plain constructor function.
 * isSuccess and unwrapData are re-implemented inline as pure functions.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock ApiClient — share mock client instance via globalThis
// ---------------------------------------------------------------------------
vi.mock("@/lib/api/client-helpers", () => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  (globalThis as unknown as Record<string, unknown>).__aptMockClient__ = client;

  function isSuccess(r: Record<string, unknown>): boolean {
    return r?.success === true;
  }
  function unwrapData<T>(response: Record<string, unknown>): T {
    if (isSuccess(response)) return response.data as T;
    const err = response?.error as Record<string, unknown> | undefined;
    const m = err?.message ?? "An unknown error occurred";
    throw new Error(m as string);
  }

  class MockApiClient {
    constructor() {
      return client;
    }
  }

  return { ApiClient: MockApiClient, isSuccess, unwrapData };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/utils/branch", () => ({
  getBranchAndOperativoHeaders: vi.fn(() => ({
    "x-branch-id": "branch-001",
  })),
}));

function getMockClient() {
  return (globalThis as unknown as Record<string, unknown>)
    .__aptMockClient__ as Record<string, ReturnType<typeof vi.fn>>;
}

// Import AFTER mocks
import {
  customerService,
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerStats,
  getPrescriptions,
  createPrescription,
} from "@/lib/api/services/customerService";

const mockCustomer = {
  id: "cust-001",
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@example.com",
  phone: "+56912345678",
  rut: "12345678-9",
  branch_id: "branch-001",
  is_active: true,
  created_at: "2025-07-10T12:00:00Z",
  updated_at: "2025-07-10T12:00:00Z",
};

const mockCustomerList = [mockCustomer];

const validCreateData = {
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@example.com",
  phone: "+56912345678",
  branch_id: "branch-001",
};

const mockPrescription = {
  id: "rx-001",
  customer_id: "cust-001",
  prescription_date: "2025-07-10",
  expiration_date: "2026-07-10",
  is_current: true,
  od_sphere: -2.0,
  os_sphere: -1.5,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("customerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCustomers", () => {
    it("returns paginated list on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockCustomerList,
        meta: {
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await getCustomers({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("cust-001");
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/customers"),
        expect.any(Object),
      );
    });

    it("falls back to default pagination when meta is missing", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockCustomerList,
      });

      const result = await getCustomers();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("throws on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Database connection failed",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getCustomers()).rejects.toThrow("Database connection failed");
    });

    it("passes branch headers from search params", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockCustomerList,
        meta: {
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await getCustomers({ branchId: "branch-001" });

      const callOptions = getMockClient().get.mock.calls[0][1] as Record<string, unknown>;
      expect(callOptions.headers).toHaveProperty("x-branch-id");
    });
  });

  describe("getCustomer", () => {
    it("returns a single customer on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockCustomer,
      });

      const result = await getCustomer("cust-001");

      expect(result.id).toBe("cust-001");
      expect(result.first_name).toBe("Juan");
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/customers/cust-001",
      );
    });

    it("throws on not-found error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Customer not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getCustomer("nonexistent")).rejects.toThrow(
        "Customer not found",
      );
    });
  });

  describe("createCustomer", () => {
    it("creates and returns the new customer", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockCustomer,
      });

      const result = await createCustomer(validCreateData);

      expect(result.id).toBe("cust-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/customers",
        validCreateData,
      );
    });

    it("throws on creation failure", async () => {
      getMockClient().post.mockResolvedValue({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid customer data",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(createCustomer(validCreateData)).rejects.toThrow(
        "Invalid customer data",
      );
    });
  });

  describe("updateCustomer", () => {
    it("updates and returns the customer", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockCustomer, first_name: "Pedro" },
      });

      const result = await updateCustomer("cust-001", { first_name: "Pedro" });

      expect(result.first_name).toBe("Pedro");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/customers/cust-001",
        { first_name: "Pedro" },
      );
    });

    it("throws on update failure", async () => {
      getMockClient().put.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Customer not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(
        updateCustomer("nonexistent", { first_name: "Pedro" }),
      ).rejects.toThrow("Customer not found");
    });
  });

  describe("deleteCustomer", () => {
    it("succeeds on successful delete", async () => {
      getMockClient().delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(deleteCustomer("cust-001")).resolves.toBeUndefined();
      expect(getMockClient().delete).toHaveBeenCalledWith(
        "/api/admin/customers/cust-001",
      );
    });

    it("throws on delete failure", async () => {
      getMockClient().delete.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Customer not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(deleteCustomer("nonexistent")).rejects.toThrow(
        "Customer not found",
      );
    });
  });

  describe("searchCustomers", () => {
    it("returns customers matching query", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockCustomerList,
      });

      const result = await searchCustomers("Juan");

      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe("Juan");
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/customers/search"),
        expect.any(Object),
      );
    });

    it("returns empty array when data is not an array", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: { id: "cust-001" },
      });

      const result = await searchCustomers("Juan");

      expect(result).toEqual([]);
    });

    it("throws on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Search failed",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(searchCustomers("error")).rejects.toThrow("Search failed");
    });
  });

  describe("getCustomerStats", () => {
    it("returns customer statistics", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: {
          summary: {
            totalCustomers: 100,
            activeCustomers: 75,
            newCustomersThisMonth: 10,
          },
        },
      });

      const result = await getCustomerStats("branch-001");

      expect(result.totalCustomers).toBe(100);
      expect(result.activeCustomers).toBe(75);
      expect(result.newCustomersThisMonth).toBe(10);
    });

    it("throws on API error", async () => {
      getMockClient().post.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Stats unavailable",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getCustomerStats()).rejects.toThrow("Stats unavailable");
    });
  });

  describe("getPrescriptions", () => {
    it("returns prescriptions for a customer", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: [mockPrescription],
      });

      const result = await getPrescriptions("cust-001");

      expect(result).toHaveLength(1);
      expect(result[0].od_sphere).toBe(-2.0);
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/customers/cust-001/prescriptions",
      );
    });

    it("returns empty array when data is not an array", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await getPrescriptions("cust-001");

      expect(result).toEqual([]);
    });
  });

  describe("createPrescription", () => {
    it("creates and returns a prescription", async () => {
      const createData = {
        prescription_date: "2025-07-10",
        od_sphere: -2.0,
        os_sphere: -1.5,
      };
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockPrescription,
      });

      const result = await createPrescription("cust-001", createData);

      expect(result.id).toBe("rx-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/customers/cust-001/prescriptions",
        createData,
      );
    });
  });

  describe("service object", () => {
    it("exposes all methods on customerService", () => {
      expect(customerService.getCustomers).toBe(getCustomers);
      expect(customerService.getCustomer).toBe(getCustomer);
      expect(customerService.createCustomer).toBe(createCustomer);
      expect(customerService.updateCustomer).toBe(updateCustomer);
      expect(customerService.deleteCustomer).toBe(deleteCustomer);
      expect(customerService.searchCustomers).toBe(searchCustomers);
      expect(customerService.getCustomerStats).toBe(getCustomerStats);
      expect(customerService.getPrescriptions).toBe(getPrescriptions);
      expect(customerService.createPrescription).toBe(createPrescription);
    });
  });
});
