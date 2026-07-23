/**
 * Unit tests for contactLensFamilyService.
 *
 * Mocks ApiClient via globalThis-shared mock instance injected through
 * a plain constructor function.
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
import type { ContactLensFamily } from "@/lib/api/services/contactLensFamilyService";
import { contactLensFamilyService } from "@/lib/api/services/contactLensFamilyService";

const mockFamily: ContactLensFamily = {
  id: "clf-001",
  name: "Premium Daily",
  brand: "Acuvue",
  modality: "spherical",
  use_type: "daily",
  packaging: "box_30",
  material: "silicone hydrogel",
  base_curve: 8.5,
  diameter: 14.2,
  description: null,
  category_id: null,
  is_active: true,
  created_at: "2025-07-10T12:00:00Z",
};

const mockFamilyList: ContactLensFamily[] = [
  mockFamily,
  {
    id: "clf-002",
    name: "Toric Monthly",
    brand: "Biofinity",
    modality: "toric",
    use_type: "monthly",
    packaging: "box_6",
    material: "silicone hydrogel",
    base_curve: 8.6,
    diameter: 14.5,
    description: null,
    category_id: null,
    is_active: true,
    created_at: "2025-07-10T12:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("contactLensFamilyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns contact lens families on success", async () => {
      getMockClient().get.mockResolvedValue({
        data: mockFamilyList,
      });

      const result = await contactLensFamilyService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("clf-001");
      expect(result[1].id).toBe("clf-002");
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/contact-lens-families"),
      );
    });

    it("passes include_inactive=true when requested", async () => {
      getMockClient().get.mockResolvedValue({ data: [] });

      await contactLensFamilyService.getAll(true);

      const url = getMockClient().get.mock.calls[0][0] as string;
      expect(url).toContain("include_inactive=true");
    });

    it("passes include_inactive=false by default", async () => {
      getMockClient().get.mockResolvedValue({ data: [] });

      await contactLensFamilyService.getAll();

      const url = getMockClient().get.mock.calls[0][0] as string;
      expect(url).toContain("include_inactive=false");
    });

    it("returns empty array when data is not an array", async () => {
      getMockClient().get.mockResolvedValue({
        data: { id: "clf-001" },
      });

      const result = await contactLensFamilyService.getAll();

      expect(result).toEqual([]);
    });

    it("returns empty array on error response", async () => {
      getMockClient().get.mockResolvedValue({
        error: { message: "Failed to fetch" },
      });

      const result = await contactLensFamilyService.getAll();

      expect(result).toEqual([]);
    });

    it("returns empty array on network error (catch block)", async () => {
      getMockClient().get.mockRejectedValue(new Error("Network failure"));

      const result = await contactLensFamilyService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("returns a contact lens family on success", async () => {
      getMockClient().get.mockResolvedValue({
        data: mockFamily,
      });

      const result = await contactLensFamilyService.getById("clf-001");

      expect(result).toEqual(mockFamily);
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/contact-lens-families/clf-001",
      );
    });

    it("returns null on error response", async () => {
      getMockClient().get.mockResolvedValue({
        error: { message: "Family not found" },
      });

      const result = await contactLensFamilyService.getById("nonexistent");

      expect(result).toBeNull();
    });

    it("returns null on network error (catch block)", async () => {
      getMockClient().get.mockRejectedValue(new Error("Network failure"));

      const result = await contactLensFamilyService.getById("clf-001");

      expect(result).toBeNull();
    });
  });
});
