/**
 * Unit tests for email template loader (template-loader.ts)
 *
 * Tests loadEmailTemplate and incrementTemplateUsage with mocked Supabase.
 * The mock chain is thenable to support `await query.order(...)` patterns.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  appLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  incrementTemplateUsage,
  loadEmailTemplate,
} from "@/lib/email/template-loader";
// Re-exports (tested in template-utils.test.ts)
import {
  formatOrderItemsHTML,
  formatOrderItemsText,
  getDefaultVariables,
  replaceTemplateVariables,
} from "@/lib/email/template-loader";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

interface Chain {
  then: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}

const MOCK_TEMPLATE_ROW = {
  id: "tpl_1",
  name: "Welcome Email",
  type: "order-confirmation",
  subject: "Your order #{{order_number}}",
  content: "<p>Thanks {{name}}!</p>",
  variables: ["order_number", "name"],
  is_active: true,
  organization_id: null,
  category: "saas",
  usage_count: 5,
  last_used_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

/** Build a thenable supabase chain that resolves to `terminalResult` on await. */
function buildChain(
  terminalResult: { data: unknown; error: unknown } = {
    data: null,
    error: null,
  },
): Chain {
  const chain = {
    then: vi.fn((resolve: (v: unknown) => void) => resolve(terminalResult)),
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
  };

  // Non-terminal methods return the chain for chaining
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);

  // Terminal methods return a proper Promise
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });
  chain.single.mockResolvedValue({ data: null, error: null });

  return chain;
}

/** Wire createClient (async) and createServiceRoleClient (sync) to return a chain */
function wireClient(chain: Chain) {
  const mockSupabase = { from: vi.fn().mockReturnValue(chain) };
  vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
  vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadEmailTemplate", () => {
  it("loads an active template by type", async () => {
    const chain = buildChain({ data: [MOCK_TEMPLATE_ROW], error: null });
    wireClient(chain);

    const result = await loadEmailTemplate("order-confirmation");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("tpl_1");
    expect(result!.subject).toBe("Your order #{{order_number}}");
    expect(result!.variables).toEqual(["order_number", "name"]);
    expect(result!.is_active).toBe(true);
  });

  it("returns null when no matching template is found", async () => {
    const chain = buildChain({ data: [], error: null });
    wireClient(chain);

    const result = await loadEmailTemplate("non-existent");
    expect(result).toBeNull();
  });

  it("returns null on query error", async () => {
    const chain = buildChain({
      data: null,
      error: { message: "DB error", code: "PGRST301" },
    });
    wireClient(chain);

    const result = await loadEmailTemplate("order-confirmation");
    expect(result).toBeNull();
  });

  it("returns null when org override has is_active=false", async () => {
    const chain = buildChain({ data: [MOCK_TEMPLATE_ROW], error: null });
    wireClient(chain);

    // The first maybeSingle call (org override check) returns disabled
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: "tpl_1", is_active: false },
      error: null,
    });

    const result = await loadEmailTemplate(
      "order-confirmation",
      false,
      "org-1",
    );
    expect(result).toBeNull();
  });

  it("respects active org override and loads template", async () => {
    const chain = buildChain({ data: [MOCK_TEMPLATE_ROW], error: null });
    wireClient(chain);

    // Org override exists but is_active=true → proceed to main query
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: "tpl_1", is_active: true },
      error: null,
    });

    const result = await loadEmailTemplate(
      "order-confirmation",
      false,
      "org-1",
    );
    expect(result).not.toBeNull();
  });

  it("loads org-specific template first (order: org then global)", async () => {
    const orgTemplate = {
      ...MOCK_TEMPLATE_ROW,
      id: "tpl_org",
      organization_id: "org-1",
    };
    const chain = buildChain({ data: [orgTemplate], error: null });
    wireClient(chain);

    const result = await loadEmailTemplate(
      "order-confirmation",
      false,
      "org-1",
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("tpl_org");
  });

  it("filters by category when provided", async () => {
    const chain = buildChain({ data: [MOCK_TEMPLATE_ROW], error: null });
    wireClient(chain);

    await loadEmailTemplate("order-confirmation", false, undefined, "saas");

    expect(chain.eq).toHaveBeenCalledWith("category", "saas");
  });

  it("handles variables stored as JSON string", async () => {
    const row = {
      ...MOCK_TEMPLATE_ROW,
      variables: '["order_number","name"]',
    };
    const chain = buildChain({ data: [row], error: null });
    wireClient(chain);

    const result = await loadEmailTemplate("order-confirmation");
    expect(result!.variables).toEqual(["order_number", "name"]);
  });

  it("handles empty variables array", async () => {
    const row = { ...MOCK_TEMPLATE_ROW, variables: [] };
    const chain = buildChain({ data: [row], error: null });
    wireClient(chain);

    const result = await loadEmailTemplate("order-confirmation");
    expect(result!.variables).toEqual([]);
  });

  it("returns null on thrown exception", async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error("Network error") as never);

    const result = await loadEmailTemplate("order-confirmation");
    expect(result).toBeNull();
  });

  it("uses service role client when useServiceRole is true", async () => {
    const chain = buildChain({ data: [MOCK_TEMPLATE_ROW], error: null });
    wireClient(chain);

    await loadEmailTemplate("order-confirmation", true);

    expect(createServiceRoleClient).toHaveBeenCalled();
  });
});

describe("incrementTemplateUsage", () => {
  it("increments usage_count and sets last_used_at", async () => {
    const chain = buildChain();
    wireClient(chain);

    chain.single.mockResolvedValueOnce({
      data: { usage_count: 5 },
      error: null,
    });

    await incrementTemplateUsage("tpl_1");

    expect(chain.single).toHaveBeenCalled();
    expect(chain.update).toHaveBeenCalledWith({
      usage_count: 6,
      last_used_at: expect.any(String),
    });
    expect(chain.eq).toHaveBeenCalledWith("id", "tpl_1");
  });

  it("defaults usage_count to 0 when template not found", async () => {
    const chain = buildChain();
    wireClient(chain);

    chain.single.mockResolvedValueOnce({ data: null, error: null });

    await incrementTemplateUsage("tpl_missing");

    expect(chain.update).toHaveBeenCalledWith({
      usage_count: 1,
      last_used_at: expect.any(String),
    });
  });

  it("does not throw on error", async () => {
    const chain = buildChain();
    wireClient(chain);

    chain.single.mockRejectedValueOnce(new Error("DB error"));

    // Should not throw
    await expect(incrementTemplateUsage("tpl_1")).resolves.toBeUndefined();
  });
});

describe("re-exports", () => {
  it("re-exports template-utils functions", () => {
    expect(typeof formatOrderItemsHTML).toBe("function");
    expect(typeof formatOrderItemsText).toBe("function");
    expect(typeof getDefaultVariables).toBe("function");
    expect(typeof replaceTemplateVariables).toBe("function");
  });
});
