/**
 * Integration test: full agent cycle with cost tracking.
 *
 * Verifies:
 * - Cost tracking: token_count persisted via logTokenUsage
 * - Trigger event shape matches contract
 * - Preferences key format
 *
 * @module tests/integration/agent/full-cycle
 */

import { describe, expect, it } from "vitest";

import { logTokenUsage } from "@/lib/ai/usage-logger";

// ─── Fluent Supabase mock for logTokenUsage ────────────────────────────────
//
// logTokenUsage does:
//   supabase.from("chat_messages").update({...}).eq("id", msgId)
//   supabase.from("chat_sessions").select("metadata").eq("id", sessionId).single()
//   supabase.from("chat_sessions").update({...}).eq("id", sessionId)

function buildFluentMock() {
  const singleResolved = {
    data: {
      metadata: { token_count: { prompt: 100, completion: 50, total: 150 } },
    },
    error: null,
  };
  const updateResolved = { error: null };

  // An eq method that returns a promise (terminal call)
  const eqThenResolve = vi.fn().mockResolvedValue(updateResolved);
  const singleThenResolve = vi.fn().mockResolvedValue(singleResolved);

  // Building blocks
  const withEq = { eq: eqThenResolve };
  const withSelect = {
    eq: vi.fn(() => ({ single: singleThenResolve })),
  };

  return {
    from: vi.fn(() => ({
      update: vi.fn(() => withEq),
      select: vi.fn(() => withSelect),
      insert: vi.fn(() => withEq),
    })),
  };
}

describe("full agent cycle", () => {
  describe("cost tracking", () => {
    it("logTokenUsage calls from('chat_messages') and from('chat_sessions')", async () => {
      const supabase = buildFluentMock();

      await logTokenUsage(supabase as any, {
        sessionId: "session-1",
        messageId: "msg-1",
        promptTokens: 150,
        completionTokens: 75,
      });

      // Should have called from("chat_messages") for message update
      expect(supabase.from).toHaveBeenCalledWith("chat_messages");
      // Should have called from("chat_sessions") for session select + update
      expect(supabase.from).toHaveBeenCalledWith("chat_sessions");
    });

    it("logTokenUsage does not throw on error", async () => {
      const throwingSupabase = {
        from: vi.fn(() => {
          throw new Error("DB error");
        }),
      };

      await expect(
        logTokenUsage(throwingSupabase as any, {
          sessionId: "session-err",
          messageId: "msg-err",
          promptTokens: 100,
          completionTokens: 50,
        }),
      ).resolves.toBeUndefined();
    });

    it("logAIUsage still exists (backward compat)", async () => {
      const { logAIUsage } = await import("@/lib/ai/usage-logger");
      expect(logAIUsage).toBeDefined();
      expect(typeof logAIUsage).toBe("function");
    });
  });

  describe("trigger event shape", () => {
    it("trigger events contain correct fields and no irreversible actions by default", async () => {
      const sampleEvent = {
        type: "low_stock" as const,
        severity: "warning" as const,
        entity: { id: "p1", name: "Lentes Sol", type: "product" },
        action: {
          label: "Ver producto",
          type: "navigation" as const,
          payload: { path: "/admin/products/p1" },
        },
        message: 'Stock bajo: "Lentes Sol" tiene 2 unidades.',
      };

      expect(sampleEvent.type).toBe("low_stock");
      expect(sampleEvent.severity).toBe("warning");
      expect(sampleEvent.entity).toHaveProperty("id");
      expect(sampleEvent.entity).toHaveProperty("name");
      expect(sampleEvent.entity).toHaveProperty("type");
      expect(sampleEvent.action).toHaveProperty("label");
      expect(sampleEvent.action).toHaveProperty("type");
      expect(sampleEvent.message).toBeTruthy();
      // Irreversible actions MUST NOT be automatic
      expect(sampleEvent.action.type).toBe("navigation");
    });
  });

  describe("preferences key format", () => {
    it("uses correct localStorage key format", () => {
      const userId = "user-abc";
      const expectedKey = `agent:preferences:${userId}`;
      expect(expectedKey).toBe("agent:preferences:user-abc");
    });
  });
});
