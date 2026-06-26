import { describe, expect, it, vi } from "vitest";

// Mock Redis before importing the unit under test
vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => {
    throw new Error("Redis not available");
  }),
}));

// Mock embeddings — always fail so we exercise the ILIKE fallback
vi.mock("@/lib/ai/embeddings", () => ({
  getEmbeddingFactory: vi.fn(() => ({
    embed: vi.fn().mockRejectedValue(new Error("Embedding unavailable")),
  })),
}));

import { getRecentContext, searchOrgMemory } from "@/lib/ai/memory/agent-loop";

const ORG_ID = "org-123";

describe("agent-loop", () => {
  describe("getRecentContext", () => {
    it("returns empty array when supabase returns no data", async () => {
      const supabase = buildMockSupabase({
        fromSelectResolved: { data: null, error: null },
      });

      const facts = await getRecentContext(ORG_ID, supabase);
      expect(facts).toEqual([]);
    });

    it("returns formatted facts when supabase has data", async () => {
      const mockData = [
        {
          content: "Cliente Juan prefiere lentes de sol",
          category: "preference",
        },
        { content: "Vendimos 20 monturas este mes", category: "insight" },
      ];

      const supabase = buildMockSupabase({
        fromSelectResolved: { data: mockData, error: null },
      });

      const facts = await getRecentContext(ORG_ID, supabase);
      expect(facts).toHaveLength(2);
      expect(facts[0].content).toBe("Cliente Juan prefiere lentes de sol");
      expect(facts[0].category).toBe("preference");
      expect(facts[1].content).toBe("Vendimos 20 monturas este mes");
    });

    it("returns empty array on error", async () => {
      const supabase = buildMockSupabase({
        fromSelectResolved: { data: null, error: new Error("DB error") },
      });

      const facts = await getRecentContext(ORG_ID, supabase);
      expect(facts).toEqual([]);
    });
  });

  describe("searchOrgMemory", () => {
    it("falls back to ILIKE when RPC embedding search fails", async () => {
      const ilikeData = [{ content: "Match from ILIKE" }];
      const supabase = buildMockSupabase({
        rpcResolved: { data: null, error: new Error("RPC error") },
        ilikeResolved: { data: ilikeData, error: null },
      });

      const result = await searchOrgMemory("lentes", ORG_ID, supabase);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Match from ILIKE");
    });

    it("returns empty array when both RPC and ILIKE fail", async () => {
      const supabase = buildMockSupabase({
        rpcResolved: { data: null, error: new Error("RPC error") },
        ilikeResolved: { data: null, error: new Error("ILIKE error") },
      });

      const result = await searchOrgMemory("test", ORG_ID, supabase);
      expect(result).toEqual([]);
    });
  });
});

// ─── Mock builder — returns a minimal supabase-like object ───

function buildMockSupabase(opts: {
  fromSelectResolved?: { data: unknown[] | null; error: Error | null };
  rpcResolved?: { data: unknown[] | null; error: Error | null };
  ilikeResolved?: { data: unknown[] | null; error: Error | null };
}) {
  const fromSelectResolved = opts.fromSelectResolved ?? {
    data: [{ content: "default", category: "context" }],
    error: null,
  };
  const rpcResolved = opts.rpcResolved ?? { data: [], error: null };
  const ilikeResolved = opts.ilikeResolved ?? { data: [], error: null };

  // Chain builder: each method returns the parent object so calls can be chained
  function chain<T extends Record<string, unknown>>(methods: T): T {
    return new Proxy({} as T, {
      get(_target, prop) {
        if (prop in methods) return methods[prop as keyof T];
        // For .limit() or .order() etc, return function that returns the chain itself
        return () => chain(methods);
      },
    });
  }

  // The `limit` method is the terminal — it resolves with data
  const limitFn = vi.fn().mockResolvedValue(fromSelectResolved);
  const ilikeLimitFn = vi.fn().mockResolvedValue(ilikeResolved);

  // Build the query chain as a flat object
  const queryChain = {
    // .eq().ilike().order().limit() path
    ilike: vi.fn(() => ({ order: vi.fn(() => ({ limit: ilikeLimitFn })) })),
    // .eq().order().limit() path
    order: vi.fn(() => ({ limit: limitFn })),
    // .eq() itself returns the chain with both ilike and order
    eq: vi.fn(() => ({
      ilike: vi.fn(() => ({ order: vi.fn(() => ({ limit: ilikeLimitFn })) })),
      order: vi.fn(() => ({ limit: limitFn })),
    })),
  };

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => queryChain),
    })),
    rpc: vi.fn().mockResolvedValue(rpcResolved),
  };
}
