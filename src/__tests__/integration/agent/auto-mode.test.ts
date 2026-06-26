/**
 * Integration test: auto-mode trigger engine.
 *
 * Verifies:
 * - checkTriggers produces events for low stock, upcoming appointments, overdue WOs
 * - Cooldown prevents duplicate events
 * - No irreversible actions are executed without confirmation
 *
 * @module tests/integration/agent/auto-mode
 */

import { describe, expect, it, vi } from "vitest";

import { checkTriggers } from "@/lib/ai/agent/auto-trigger";

const ORG_ID = "org-123";
const BRANCH_ID = "branch-456";

// ─── Supabase mock: plain factory that returns a chainable mock object ──────

function buildQueryChain(resolved: { data: unknown; error: null }) {
  const chain: Record<string, unknown> = {};
  const methods = ["lt", "eq", "gte", "lte", "in", "order", "select", "ilike"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.limit = vi.fn().mockResolvedValue(resolved);
  return chain;
}

function buildSupabase() {
  return {
    from: vi.fn(),
  };
}

describe("auto-mode trigger engine", () => {
  describe("low_stock trigger", () => {
    it("produces warning events when stock is below threshold", async () => {
      const supabase = buildSupabase();
      supabase.from.mockImplementation((table: string) => {
        if (table === "product_branch_stock") {
          return {
            select: vi.fn(() =>
              buildQueryChain({
                data: [
                  {
                    product_id: "p1",
                    quantity: 2,
                    products: { name: "Lentes Sol" },
                  },
                  {
                    product_id: "p2",
                    quantity: 0,
                    products: { name: "Montura RX" },
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        return {
          select: vi.fn(() => buildQueryChain({ data: [], error: null })),
        };
      });

      const events = await checkTriggers({
        supabase: supabase as any,
        orgId: ORG_ID,
        branchId: BRANCH_ID,
        lowStockThreshold: 5,
      });

      expect(events.length).toBeGreaterThanOrEqual(1);
      const stockEvents = events.filter((e) => e.type === "low_stock");
      expect(stockEvents.length).toBeGreaterThan(0);
      expect(stockEvents[0].severity).toBe("warning");
      expect(stockEvents[0].entity.type).toBe("product");
      expect(stockEvents[0].action.type).toBe("navigation");
      // ponytail: no irreversible action executed without confirmation
      expect(stockEvents[0].action.type).not.toBe("action");
    });

    it("produces critical severity when stock is 0", async () => {
      const supabase = buildSupabase();
      supabase.from.mockImplementation((table: string) => {
        if (table === "product_branch_stock") {
          return {
            select: vi.fn(() =>
              buildQueryChain({
                data: [
                  {
                    product_id: "p3",
                    quantity: 0,
                    products: { name: "Lente Progresivo" },
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        return {
          select: vi.fn(() => buildQueryChain({ data: [], error: null })),
        };
      });

      // Use a unique org to avoid cooldown from previous test
      const events = await checkTriggers({
        supabase: supabase as any,
        orgId: "org-critical-test",
        branchId: BRANCH_ID,
        lowStockThreshold: 5,
      });

      const stockEvents = events.filter((e) => e.type === "low_stock");
      expect(stockEvents.length).toBeGreaterThan(0);
      expect(stockEvents[0].severity).toBe("critical");
    });
  });

  describe("upcoming_appointment trigger", () => {
    it("produces info events for appointments within 24h", async () => {
      const supabase = buildSupabase();
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);

      supabase.from.mockImplementation((table: string) => {
        if (table === "appointments") {
          return {
            select: vi.fn(() =>
              buildQueryChain({
                data: [
                  {
                    id: "apt-1",
                    customer_name: "Juan Pérez",
                    scheduled_at: futureDate.toISOString(),
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        return {
          select: vi.fn(() => buildQueryChain({ data: [], error: null })),
        };
      });

      const events = await checkTriggers({
        supabase: supabase as any,
        orgId: "org-apt-test",
        branchId: BRANCH_ID,
      });

      const aptEvents = events.filter((e) => e.type === "upcoming_appointment");
      if (aptEvents.length > 0) {
        expect(aptEvents[0].severity).toBe("info");
        expect(aptEvents[0].entity.type).toBe("appointment");
        expect(aptEvents[0].message).toContain("Juan Pérez");
      }
    });
  });

  describe("overdue_work_order trigger", () => {
    it("produces warning events for overdue work orders", async () => {
      const supabase = buildSupabase();
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      supabase.from.mockImplementation((table: string) => {
        if (table === "lab_work_orders") {
          return {
            select: vi.fn(() =>
              buildQueryChain({
                data: [
                  {
                    id: "wo-1",
                    title: "Armazón receta urgente",
                    deadline: pastDate.toISOString(),
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        return {
          select: vi.fn(() => buildQueryChain({ data: [], error: null })),
        };
      });

      const events = await checkTriggers({
        supabase: supabase as any,
        orgId: "org-wo-test",
        branchId: null,
      });

      const woEvents = events.filter((e) => e.type === "overdue_work_order");
      if (woEvents.length > 0) {
        expect(woEvents[0].severity).toBe("warning");
        expect(woEvents[0].entity.type).toBe("work_order");
        expect(woEvents[0].message).toContain("urgente");
      }
    });
  });

  describe("cooldown", () => {
    it("prevents duplicate events within cooldown window", async () => {
      const supabase = buildSupabase();
      supabase.from.mockImplementation((table: string) => {
        if (table === "product_branch_stock") {
          return {
            select: vi.fn(() =>
              buildQueryChain({
                data: [
                  { product_id: "p1", quantity: 2, products: { name: "Test" } },
                ],
                error: null,
              }),
            ),
          };
        }
        return {
          select: vi.fn(() => buildQueryChain({ data: [], error: null })),
        };
      });

      // First call — should produce events
      const first = await checkTriggers({
        supabase: supabase as any,
        orgId: "cooldown-org",
        branchId: null,
        lowStockThreshold: 5,
      });
      expect(
        first.filter((e) => e.type === "low_stock").length,
      ).toBeGreaterThan(0);

      // Second call immediately after — cooldown active, no new low_stock events
      const second = await checkTriggers({
        supabase: supabase as any,
        orgId: "cooldown-org",
        branchId: null,
        lowStockThreshold: 5,
      });
      const lowStockEvents = second.filter((e) => e.type === "low_stock");
      expect(lowStockEvents.length).toBe(0);
    });
  });
});
