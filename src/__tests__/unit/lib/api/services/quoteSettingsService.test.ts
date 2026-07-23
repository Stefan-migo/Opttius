/**
 * Unit tests for quoteSettingsService.
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
import type { QuoteSettings } from "@/lib/api/services/quoteSettingsService";
import { quoteSettingsService } from "@/lib/api/services/quoteSettingsService";

const mockSettings: QuoteSettings = {
  id: "settings-001",
  default_labor_cost: 15000,
  default_discount_percentage: 0,
  default_tax_percentage: 19,
  default_expiration_days: 30,
  default_margin_percentage: 40,
  validity_days: 30,
  currency: "CLP",
  created_at: "2025-07-10T12:00:00Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("quoteSettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("get", () => {
    it("returns quote settings on success", async () => {
      getMockClient().get.mockResolvedValue({
        data: mockSettings,
      });

      const result = await quoteSettingsService.get();

      expect(result).toEqual(mockSettings);
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/quote-settings",
      );
    });

    it("returns null on error response", async () => {
      getMockClient().get.mockResolvedValue({
        error: { message: "Settings not found" },
      });

      const result = await quoteSettingsService.get();

      expect(result).toBeNull();
    });

    it("returns null on network error (catch block)", async () => {
      getMockClient().get.mockRejectedValue(new Error("Network failure"));

      const result = await quoteSettingsService.get();

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("updates and returns quote settings on success", async () => {
      const updateData = { default_labor_cost: 18000 };
      const updated = { ...mockSettings, default_labor_cost: 18000 };
      getMockClient().put.mockResolvedValue({
        data: updated,
      });

      const result = await quoteSettingsService.update(updateData);

      expect(result).toEqual(updated);
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/quote-settings",
        updateData,
      );
    });

    it("returns null on error response", async () => {
      getMockClient().put.mockResolvedValue({
        error: { message: "Update failed" },
      });

      const result = await quoteSettingsService.update({
        default_labor_cost: 99999,
      });

      expect(result).toBeNull();
    });

    it("returns null on network error (catch block)", async () => {
      getMockClient().put.mockRejectedValue(new Error("Network failure"));

      const result = await quoteSettingsService.update({
        default_labor_cost: 99999,
      });

      expect(result).toBeNull();
    });

    it("sends partial update data", async () => {
      getMockClient().put.mockResolvedValue({ data: mockSettings });

      await quoteSettingsService.update({ validity_days: 60 });

      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/quote-settings",
        { validity_days: 60 },
      );
    });
  });
});
