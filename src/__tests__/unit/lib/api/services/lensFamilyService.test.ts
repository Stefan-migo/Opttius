/**
 * Unit tests for lensFamilyService.
 *
 * Mocks ApiClient via globalThis-shared mock instance injected through
 * a plain constructor function.
 * isSuccess and unwrapData are re-implemented inline as pure functions.
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

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/lib/api/services/errorService", () => ({
  handleApiError: vi.fn(),
}));

function getMockClient() {
  return (globalThis as unknown as Record<string, unknown>)
    .__aptMockClient__ as Record<string, ReturnType<typeof vi.fn>>;
}

// Import AFTER mocks
import type { LensFamily } from "@/lib/api/services/lensFamilyService";
import { lensFamilyService } from "@/lib/api/services/lensFamilyService";

const mockFamily: LensFamily = {
  id: "family-001",
  name: "Premium Progressive",
  lens_type: "progressive",
  lens_material: "polycarbonate",
  lens_index: 1.67,
  base_price: 120000,
  is_active: true,
  created_at: "2025-07-10T12:00:00Z",
};

const mockFamilyList: LensFamily[] = [
  mockFamily,
  {
    id: "family-002",
    name: "Standard Single Vision",
    lens_type: "single_vision",
    lens_material: "plastic",
    base_price: 45000,
    is_active: true,
    created_at: "2025-07-10T12:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("lensFamilyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns lens families on success", async () => {
      getMockClient().get.mockResolvedValue({
        data: mockFamilyList,
      });

      const result = await lensFamilyService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("family-001");
      expect(result[1].id).toBe("family-002");
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/lens-families"),
      );
    });

    it("passes include_inactive=true when requested", async () => {
      getMockClient().get.mockResolvedValue({ data: [] });

      await lensFamilyService.getAll(true);

      const url = getMockClient().get.mock.calls[0][0] as string;
      expect(url).toContain("include_inactive=true");
    });

    it("passes include_inactive=false by default", async () => {
      getMockClient().get.mockResolvedValue({ data: [] });

      await lensFamilyService.getAll();

      const url = getMockClient().get.mock.calls[0][0] as string;
      expect(url).toContain("include_inactive=false");
    });

    it("returns empty array when data is not an array", async () => {
      getMockClient().get.mockResolvedValue({
        data: { id: "family-001" },
      });

      const result = await lensFamilyService.getAll();

      expect(result).toEqual([]);
    });

    it("returns empty array on error response", async () => {
      getMockClient().get.mockResolvedValue({
        error: { message: "Failed to fetch" },
      });

      const result = await lensFamilyService.getAll();

      expect(result).toEqual([]);
    });

    it("returns empty array on network error (catch block)", async () => {
      getMockClient().get.mockRejectedValue(new Error("Network failure"));

      const result = await lensFamilyService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("returns a lens family on success", async () => {
      getMockClient().get.mockResolvedValue({
        data: mockFamily,
      });

      const result = await lensFamilyService.getById("family-001");

      expect(result).toEqual(mockFamily);
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/lens-families/family-001",
      );
    });

    it("returns null on error response", async () => {
      getMockClient().get.mockResolvedValue({
        error: { message: "Family not found" },
      });

      const result = await lensFamilyService.getById("nonexistent");

      expect(result).toBeNull();
    });

    it("returns null on network error (catch block)", async () => {
      getMockClient().get.mockRejectedValue(new Error("Network failure"));

      const result = await lensFamilyService.getById("family-001");

      expect(result).toBeNull();
    });
  });
});
