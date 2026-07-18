import { beforeEach, describe, expect, it, vi } from "vitest";

import { marketTrendsTools } from "@/lib/ai/tools/analyzeMarketTrends";
import { recommendationTools } from "@/lib/ai/tools/generateRecommendations";
import { inventoryTools } from "@/lib/ai/tools/optimizeInventory";

// Mock Organizational Memory since it uses helper function
vi.mock("@/lib/ai/memory/organizational", () => ({
  createOrganizationalMemory: vi.fn(() => ({
    getMaturityLevel: vi.fn().mockResolvedValue({
      level: "growing",
      description: "Test Phase",
      daysSinceCreation: 100,
    }),
    getOrganizationalContext: vi.fn().mockResolvedValue({
      name: "Test Optica",
      topProducts: [],
      customerCount: 50,
      monthlyOrders: 20,
    }),
    getActivityMetrics: vi.fn().mockResolvedValue({
      totalOrders: 100,
      customerRetentionRate: 45,
      monthlyOrders: 10,
    }),
  })),
}));

describe("Analytics Tools", () => {
  let mockSupabase: unknown;
  let mockContext: unknown;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    mockContext = {
      supabase: mockSupabase,
      userId: "test-user-id",
      organizationId: "org-123",
    };
  });

  describe("analyzeMarketTrends", () => {
    const tool = marketTrendsTools[0];

    it("should calculate trends correctly", async () => {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const mockData = [
        {
          quantity: 10,
          total_price: 1000,
          created_at: now.toISOString(),
          products: { id: "p1", name: "Product 1", price: 100, category: { name: "Cat 1" } },
          orders: { created_at: now.toISOString() },
        },
        {
          quantity: 5,
          total_price: 500,
          created_at: lastMonth.toISOString(),
          products: { id: "p1", name: "Product 1", price: 100, category: { name: "Cat 1" } },
          orders: { created_at: lastMonth.toISOString() },
        },
      ];

      // query: from("order_items").select(...).gte(..., date).order("created_at", ...)
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }));

      const result = await tool.execute({ months: 3 }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.topProducts).toHaveLength(1);
      expect(result.data.topProducts[0].name).toBe("Product 1");
    });
  });

  describe("optimizeInventory", () => {
    const tool = inventoryTools[0];

    it("should identify low stock items", async () => {
      const productsData = {
        data: [
          { id: "p1", name: "Low Item", inventory_quantity: 1, low_stock_threshold: 5, category_id: "cat1", cost_price: 10, price: 20 },
          { id: "p2", name: "Good Item", inventory_quantity: 100, low_stock_threshold: 5, category_id: "cat1", cost_price: 10, price: 20 },
        ],
        error: null,
      };

      const salesData = {
        data: [{ product_id: "p1", quantity: 5 }],
        error: null,
      };

      // Two queries: products (select → eq → eq → thenable) and order_items (select → gte → promise)
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "products") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            // thenable — all methods return chain, await calls .then()
            then: (resolve: (v: unknown) => void) => resolve(productsData),
          };
        }
        if (table === "order_items") {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockResolvedValue(salesData),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (r: unknown) => r };
      });

      const result = await tool.execute({ lowStockThreshold: 5 }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.summary.criticalLow).toBe(1); // p1 has stock=1 < threshold=5
    });
  });

  describe("generateRecommendations", () => {
    const tool = recommendationTools[0];

    it("should generate recommendations based on maturity", async () => {
      // createOrganizationalMemory is fully mocked at module level,
      // no supabase queries needed — the tool just needs organizationId in context
      const result = await tool.execute({ focus: "growth" }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.maturityLevel).toBe("growing"); // From top-level mock
      expect(result.data.recommendations.length).toBeGreaterThan(0);
    });
  });
});
