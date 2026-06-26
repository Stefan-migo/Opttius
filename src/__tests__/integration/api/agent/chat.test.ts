import { describe, expect, it, vi } from "vitest";

import { buildSession } from "@/lib/ai/agent/session";
import { buildSystemPrompt } from "@/lib/ai/agent/prompt-builder";
import { getAllTools } from "@/lib/ai/tools";

// ─── Fixtures ───

const validPayload = {
  message: "¿Cuántos clientes tengo?",
  session_id: "test-session-123",
  context: {
    route: "/admin/customers",
    section: "customers",
    branch_id: "branch-1",
    branch_name: "Sucursal Centro",
    role: "admin",
    org_id: "org-1",
  },
};

const payloadWithoutRole = {
  message: "test",
  context: {
    route: "/admin",
    org_id: "org-1",
  },
};

const payloadWithoutMessage = {
  context: {
    route: "/admin",
    role: "admin",
    org_id: "org-1",
  },
};

// ─── Session Builder Tests ───

describe("buildSession", () => {
  it("builds a valid session from complete payload", () => {
    const result = buildSession(
      validPayload as unknown as Record<string, unknown>,
    );
    if ("status" in result) {
      expect.fail("Expected AgentSession, got error: " + result.error);
    }
    expect(result.message).toBe("¿Cuántos clientes tengo?");
    expect(result.sessionId).toBe("test-session-123");
    expect(result.role).toBe("admin");
    expect(result.context.route).toBe("/admin/customers");
    expect(result.context.orgId).toBe("org-1");
  });

  it("generates session_id when not provided", () => {
    const payload = { ...validPayload, session_id: undefined };
    const result = buildSession(payload as unknown as Record<string, unknown>);
    if ("status" in result) {
      expect.fail("Expected AgentSession, got error: " + result.error);
    }
    expect(result.sessionId).toBeDefined();
    expect(result.sessionId).not.toBe("test-session-123");
  });

  it("returns 400 error when message is missing", () => {
    const result = buildSession(
      payloadWithoutMessage as unknown as Record<string, unknown>,
    );
    expect("status" in result).toBe(true);
    if ("status" in result) {
      expect(result.status).toBe(400);
      expect(result.missingFields).toContain("message");
    }
  });

  it("returns 400 error when context.role is missing", () => {
    const result = buildSession(
      payloadWithoutRole as unknown as Record<string, unknown>,
    );
    expect("status" in result).toBe(true);
    if ("status" in result) {
      expect(result.status).toBe(400);
      expect(result.missingFields).toContain("context.role");
    }
  });
});

// ─── Prompt Builder Tests ───

describe("buildSystemPrompt", () => {
  it("builds a 4-layer prompt with all sections", () => {
    const session = buildSession(
      validPayload as unknown as Record<string, unknown>,
    );
    if ("status" in session) {
      expect.fail("Expected AgentSession");
      return;
    }

    const tools = getAllTools(session.role);
    const prompt = buildSystemPrompt({
      session,
      memoryContext: {
        recentFacts: [
          {
            content: "Cliente prefiere lentes progresivos",
            category: "preference",
          },
        ],
        semanticMatches: [
          { content: "Venta de lentes de sol", similarity: 0.85 },
        ],
      },
      tools,
    });

    expect(prompt).toContain("Agente Inteligente de Opttius");
    expect(prompt).toContain("ADMINISTRADOR"); // Layer 2
    expect(prompt).toContain("Sucursal Centro"); // Layer 3
    expect(prompt).toContain("Cliente prefiere lentes progresivos"); // Layer 4
    expect(prompt).toContain("Herramientas Disponibles"); // Tools section
    expect(prompt).toContain("getProducts"); // At least one tool listed
  });

  it("omits memory layer when no memory context provided", () => {
    const session = buildSession(
      validPayload as unknown as Record<string, unknown>,
    );
    if ("status" in session) {
      expect.fail("Expected AgentSession");
      return;
    }

    const tools = getAllTools(session.role);
    const prompt = buildSystemPrompt({ session, tools });

    expect(prompt).toContain("Agente Inteligente de Opttius");
    expect(prompt).not.toContain("Capa 4");
  });

  it("renders layer 2 correctly for vendedor role", () => {
    const session = buildSession({
      message: "test",
      context: { route: "/admin", role: "vendedor", org_id: "org-1" },
    } as unknown as Record<string, unknown>);
    if ("status" in session) {
      expect.fail("Expected AgentSession");
      return;
    }

    const prompt = buildSystemPrompt({ session, tools: [] });
    expect(prompt).toContain("VENDEDOR");
    expect(prompt).not.toContain("ADMINISTRADOR");
  });
});

// ─── Tool Filtering Tests ───

describe("getAllTools(role)", () => {
  it("filters tools correctly for admin role", () => {
    const tools = getAllTools("admin");
    const names = tools.map((t) => t.name);
    expect(names).toContain("deleteCustomer");
    expect(names).toContain("deleteProduct");
    expect(names).not.toContain("updateOrgConfig"); // dueño only
  });

  it("filters tools correctly for vendedor role", () => {
    const tools = getAllTools("vendedor");
    const names = tools.map((t) => t.name);
    expect(names).not.toContain("deleteCustomer");
    expect(names).not.toContain("executeBulkImport");
    expect(names).toContain("getCustomers");
    expect(names).toContain("navigateTo");
    expect(names).toContain("getScreenContext");
  });

  it("returns all tools for dueño", () => {
    const tools = getAllTools("dueño");
    const names = tools.map((t) => t.name);
    expect(names).toContain("deleteCustomer");
    expect(names).toContain("navigateTo");
    expect(names).toContain("getScreenContext");
    expect(names).toContain("saveSessionSummary");
  });

  it("returns all tools when role is undefined (backward-compat)", () => {
    const tools = getAllTools(undefined);
    const names = tools.map((t) => t.name);
    expect(names).toContain("deleteCustomer");
    expect(names).toContain("getCustomers");
  });
});

// ─── Legacy Endpoint Test ───

describe("Legacy endpoint invariant", () => {
  it("getAllTools() without role returns all tools (matching legacy behavior)", () => {
    const unfiltered = getAllTools();
    const filtered = getAllTools("dueño");

    // Both should return the same set (dueño sees all)
    const unfilteredNames = new Set(unfiltered.map((t) => t.name));
    const filteredNames = new Set(filtered.map((t) => t.name));

    // All unfiltered tools should be in filtered
    for (const name of unfilteredNames) {
      expect(filteredNames.has(name)).toBe(true);
    }
  });
});
