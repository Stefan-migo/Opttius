/**
 * Unit tests for contactLensMatrixService.
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
import type { ContactLensMatrixCalculationResult } from "@/lib/api/services/contactLensMatrixService";
import { contactLensMatrixService } from "@/lib/api/services/contactLensMatrixService";

const mockCalculation: ContactLensMatrixCalculationResult = {
  price: 45000,
  cost: 22500,
  family_id: "clf-001",
  family_name: "Premium Daily",
  brand: "Acuvue",
  sphere: -2.0,
  cylinder: 0,
  axis: null,
  addition: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("contactLensMatrixService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculate", () => {
    it("returns calculation result on success", async () => {
      getMockClient().post.mockResolvedValue({
        data: { calculation: mockCalculation },
      });

      const result = await contactLensMatrixService.calculate(
        "clf-001",
        -2.0,
        0,
      );

      expect(result).toEqual(mockCalculation);
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/contact-lens-matrices/calculate",
        {
          contact_lens_family_id: "clf-001",
          sphere: -2.0,
          cylinder: 0,
          axis: null,
          addition: null,
        },
      );
    });

    it("returns calculation with full prescription parameters", async () => {
      getMockClient().post.mockResolvedValue({
        data: {
          calculation: {
            ...mockCalculation,
            cylinder: -1.25,
            axis: 180,
            addition: 2.0,
          },
        },
      });

      const result = await contactLensMatrixService.calculate(
        "clf-001",
        -3.0,
        -1.25,
        180,
        2.0,
      );

      expect(result?.cylinder).toBe(-1.25);
      expect(result?.axis).toBe(180);
      expect(result?.addition).toBe(2.0);
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/contact-lens-matrices/calculate",
        {
          contact_lens_family_id: "clf-001",
          sphere: -3.0,
          cylinder: -1.25,
          axis: 180,
          addition: 2.0,
        },
      );
    });

    it("returns null when calculation is missing from response", async () => {
      getMockClient().post.mockResolvedValue({
        data: {},
      });

      const result = await contactLensMatrixService.calculate(
        "clf-001",
        -2.0,
        0,
      );

      expect(result).toBeNull();
    });

    it("returns null on error response", async () => {
      getMockClient().post.mockResolvedValue({
        error: { message: "No matrix found for prescription" },
      });

      const result = await contactLensMatrixService.calculate(
        "clf-999",
        -2.0,
        0,
      );

      expect(result).toBeNull();
    });

    it("returns null on network error (catch block)", async () => {
      getMockClient().post.mockRejectedValue(new Error("Network failure"));

      const result = await contactLensMatrixService.calculate(
        "clf-001",
        -2.0,
        0,
      );

      expect(result).toBeNull();
    });
  });
});
