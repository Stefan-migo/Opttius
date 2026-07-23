/**
 * Unit tests for contactLensInventoryService.
 *
 * Mocks ApiClient via globalThis-shared mock instance injected through
 * a plain constructor function. Uses `isSuccess: r?.error == null` to
 * match the service's error-checking pattern.
 */

import { beforeEach,describe, expect, it, vi } from "vitest";

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

  class MockApiClient {
    constructor() {
      return client;
    }
  }

  return {
    ApiClient: MockApiClient,
    isSuccess: (r: Record<string, unknown>) => r?.error == null,
    unwrapData: <T>(r: Record<string, unknown>) => r?.data as T,
  };
});

vi.mock("@/lib/api/services/errorService", () => ({
  handleApiError: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function getMockClient() {
  return (globalThis as unknown as Record<string, unknown>)
    .__aptMockClient__ as Record<string, ReturnType<typeof vi.fn>>;
}

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------
import type { ContactLensInventory } from "@/lib/api/services/contactLensInventoryService";
import { contactLensInventoryService } from "@/lib/api/services/contactLensInventoryService";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockInventory: ContactLensInventory = {
  id: "cli-001",
  contact_lens_family_id: "clf-001",
  branch_id: "branch-001",
  sphere_min: -6.0,
  sphere_max: -4.01,
  cylinder_min: 0,
  cylinder_max: 0,
  quantity: 10,
  min_stock_threshold: 3,
  notes: undefined,
  is_active: true,
  created_at: "2025-01-01T12:00:00Z",
};

const multiStock: ContactLensInventory[] = [
  mockInventory,
  {
    ...mockInventory,
    id: "cli-002",
    sphere_min: -4.0,
    sphere_max: -2.01,
    quantity: 0,
  },
  {
    ...mockInventory,
    id: "cli-003",
    sphere_min: -2.0,
    sphere_max: 0,
    quantity: 2,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("contactLensInventoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getInventory", () => {
    it("returns inventory list on success", async () => {
      getMockClient().get.mockResolvedValue({ data: [mockInventory] });

      const result = await contactLensInventoryService.getInventory(
        "clf-001",
        "branch-001",
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("cli-001");
      expect(result[0].quantity).toBe(10);
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/contact-lens-inventory"),
      );
    });

    it("returns empty array on error response", async () => {
      getMockClient().get.mockResolvedValue({
        error: { message: "Failed to fetch inventory" },
      });

      const result = await contactLensInventoryService.getInventory(
        "clf-001",
        "branch-001",
      );

      expect(result).toEqual([]);
    });

    it("returns empty array on network error (catch block)", async () => {
      getMockClient().get.mockRejectedValue(new Error("Network failure"));

      const result = await contactLensInventoryService.getInventory(
        "clf-001",
        "branch-001",
      );

      expect(result).toEqual([]);
    });
  });

  describe("checkStock", () => {
    it("returns available when a matching active entry has stock", async () => {
      getMockClient().get.mockResolvedValue({ data: multiStock });

      // sphere -5.0 is within cli-001 range (-6.0 to -4.01, qty 10)
      const result = await contactLensInventoryService.checkStock(
        "clf-001",
        "branch-001",
        -5.0,
      );

      expect(result.available).toBe(true);
      expect(result.quantity).toBe(10);
      expect(result.message).toContain("Stock disponible");
    });

    it("returns out of stock when match has zero quantity", async () => {
      getMockClient().get.mockResolvedValue({ data: multiStock });

      // sphere -3.0 is within cli-002 range (-4.0 to -2.01, qty 0)
      const result = await contactLensInventoryService.checkStock(
        "clf-001",
        "branch-001",
        -3.0,
      );

      expect(result.available).toBe(false);
      expect(result.quantity).toBe(0);
      expect(result.message).toContain("Sin stock");
    });

    it("returns unavailable when no matching prescription range", async () => {
      getMockClient().get.mockResolvedValue({ data: multiStock });

      // sphere -10.0 doesn't match any entry
      const result = await contactLensInventoryService.checkStock(
        "clf-001",
        "branch-001",
        -10.0,
      );

      expect(result.available).toBe(false);
      expect(result.quantity).toBe(0);
      expect(result.message).toContain("Graduación no disponible");
    });

    it("uses cylinder parameter in range matching", async () => {
      const toricStock: ContactLensInventory[] = [
        {
          ...mockInventory,
          id: "cli-t1",
          sphere_min: -10,
          sphere_max: 10,
          cylinder_min: -0.75,
          cylinder_max: -0.25,
          quantity: 5,
        },
        {
          ...mockInventory,
          id: "cli-t2",
          sphere_min: -10,
          sphere_max: 10,
          cylinder_min: -1.75,
          cylinder_max: -1.0,
          quantity: 3,
        },
      ];
      getMockClient().get.mockResolvedValue({ data: toricStock });

      // cylinder -0.5 matches cli-t1 range (-0.75 to -0.25)
      const result = await contactLensInventoryService.checkStock(
        "clf-001",
        "branch-001",
        0,
        -0.5,
      );

      expect(result.available).toBe(true);
      expect(result.quantity).toBe(5);
    });

    it("defaults cylinder to 0 when not provided", async () => {
      getMockClient().get.mockResolvedValue({ data: [mockInventory] });

      // sphere -5.0, cylinder defaults to 0 → matches mockInventory (cyl 0-0)
      const result = await contactLensInventoryService.checkStock(
        "clf-001",
        "branch-001",
        -5.0,
      );

      expect(result.available).toBe(true);
    });

    it("returns unavailable when getInventory fails (error swallowed by getInventory)", async () => {
      getMockClient().get.mockRejectedValue(new Error("Network failure"));

      const result = await contactLensInventoryService.checkStock(
        "clf-001",
        "branch-001",
        -5.0,
      );

      // getInventory catches the error and returns [], so checkStock finds no match
      expect(result.available).toBe(false);
      expect(result.quantity).toBe(0);
      expect(result.message).toContain("Graduación no disponible");
    });

    it("skips inactive inventory entries", async () => {
      const stock: ContactLensInventory[] = [
        {
          ...mockInventory,
          id: "cli-inactive",
          sphere_min: -10,
          sphere_max: 10,
          is_active: false,
          quantity: 99,
        },
      ];
      getMockClient().get.mockResolvedValue({ data: stock });

      // Should NOT match the inactive entry even though range fits
      const result = await contactLensInventoryService.checkStock(
        "clf-001",
        "branch-001",
        0,
      );

      expect(result.available).toBe(false);
      expect(result.message).toContain("Graduación no disponible");
    });
  });

  describe("createInventory", () => {
    it("creates and returns the new inventory entry", async () => {
      getMockClient().post.mockResolvedValue({ data: mockInventory });

      const result = await contactLensInventoryService.createInventory({
        contact_lens_family_id: "clf-001",
        branch_id: "branch-001",
        sphere_min: -6.0,
        sphere_max: -4.01,
        cylinder_min: 0,
        cylinder_max: 0,
        quantity: 10,
      });

      expect(result?.id).toBe("cli-001");
      expect(result?.quantity).toBe(10);
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/contact-lens-inventory",
        expect.objectContaining({
          contact_lens_family_id: "clf-001",
          branch_id: "branch-001",
        }),
      );
    });

    it("returns null on API error", async () => {
      getMockClient().post.mockResolvedValue({
        error: { message: "Validation failed" },
      });

      const result = await contactLensInventoryService.createInventory({
        contact_lens_family_id: "clf-001",
        branch_id: "branch-001",
        sphere_min: -6.0,
        sphere_max: -4.01,
        cylinder_min: 0,
        cylinder_max: 0,
        quantity: 10,
      });

      expect(result).toBeNull();
    });

    it("returns null on network error (catch block)", async () => {
      getMockClient().post.mockRejectedValue(new Error("Network failure"));

      const result = await contactLensInventoryService.createInventory({
        contact_lens_family_id: "clf-001",
        branch_id: "branch-001",
        sphere_min: -6.0,
        sphere_max: -4.01,
        cylinder_min: 0,
        cylinder_max: 0,
        quantity: 10,
      });

      expect(result).toBeNull();
    });
  });
});
