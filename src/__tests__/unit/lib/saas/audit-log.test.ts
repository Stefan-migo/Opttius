/**
 * Unit tests for SaaS audit log module
 *
 * Tests recordAuditLog, getAuditLogsForTarget, getRecentAuditLogs,
 * and getClientInfoFromRequest.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  appLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  getAuditLogsForTarget,
  getClientInfoFromRequest,
  getRecentAuditLogs,
  recordAuditLog,
} from "@/lib/saas/audit-log";
import { createServiceRoleClient } from "@/utils/supabase/server";
import type { Mock } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFrom(returnValue: unknown) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
    single: vi.fn().mockResolvedValue(returnValue),
  };

  // Override .select / .insert etc. to return the chain, not undefined
  chain.select.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.range.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);

  return chain;
}

function setupClient(mockReturn: Record<string, Mock> | undefined) {
  const from = mockReturn ?? {};
  (createServiceRoleClient as Mock).mockReturnValue({
    from: vi.fn((_table: string) => {
      return from[_table] ?? mockChainResult({ data: null, error: null });
    }),
  });
}

function mockChainResult(res: { data: unknown; error: unknown }) {
  const chain = mockFrom(res);
  chain.insert.mockResolvedValue(res);
  // For select chains
  return chain;
}

function setupInsert(error: unknown) {
  const insert = vi.fn().mockResolvedValue({ error });
  const chain = { insert };
  (createServiceRoleClient as Mock).mockReturnValue({
    from: vi.fn(() => chain),
  });
  return { insert, chain };
}

function setupSelect(response: {
  data: unknown[];
  count: number | null;
  error: unknown;
}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };
  // @ts-expect-error - chaining mock
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.range.mockResolvedValue(response);

  (createServiceRoleClient as Mock).mockReturnValue({
    from: vi.fn(() => chain),
  });
  return chain;
}

// ---------------------------------------------------------------------------
// recordAuditLog
// ---------------------------------------------------------------------------

describe("recordAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a valid audit log entry", async () => {
    const { insert } = setupInsert(null);

    await recordAuditLog({
      userId: "user-1",
      userEmail: "admin@test.cl",
      action: "change_tier",
      targetType: "organization",
      targetId: "org-1",
      targetName: "Test Óptica",
      oldValue: { tier: "basic" },
      newValue: { tier: "pro" },
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      metadata: { source: "admin" },
    });

    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0];
    expect(payload.user_id).toBe("user-1");
    expect(payload.action).toBe("change_tier");
    expect(payload.target_type).toBe("organization");
    expect(payload.old_value).toBe(JSON.stringify({ tier: "basic" }));
    expect(payload.new_value).toBe(JSON.stringify({ tier: "pro" }));
    expect(payload.metadata).toEqual({ source: "admin" });
  });

  it("handles missing optional fields as null", async () => {
    const { insert } = setupInsert(null);

    await recordAuditLog({
      action: "delete",
      targetType: "user",
    });

    const payload = insert.mock.calls[0][0];
    expect(payload.user_id).toBeNull();
    expect(payload.user_email).toBeNull();
    expect(payload.target_id).toBeNull();
    expect(payload.old_value).toBeNull();
    expect(payload.new_value).toBeNull();
  });

  it("does not throw on insert error (non-blocking)", async () => {
    setupInsert(new Error("DB error"));

    await expect(
      recordAuditLog({ action: "create", targetType: "tier" }),
    ).resolves.toBeUndefined();
  });

  it("uses empty object as metadata when not provided", async () => {
    const { insert } = setupInsert(null);

    await recordAuditLog({
      action: "create",
      targetType: "branch",
    });

    expect(insert.mock.calls[0][0].metadata).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getAuditLogsForTarget
// ---------------------------------------------------------------------------

describe("getAuditLogsForTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated logs for a target", async () => {
    const mockLogs = [
      {
        id: "log-1",
        user_email: "admin@test.cl",
        action: "update",
        target_type: "organization",
        target_id: "org-1",
        target_name: "Test Óptica",
        old_value: JSON.stringify({ name: "Old" }),
        new_value: null,
        created_at: "2025-06-01T00:00:00Z",
      },
    ];

    setupSelect({ data: mockLogs, count: 1, error: null });

    const result = await getAuditLogsForTarget("organization", "org-1");

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].userEmail).toBe("admin@test.cl");
    expect(result.logs[0].action).toBe("update");
    expect(result.logs[0].oldValue).toEqual({ name: "Old" });
    expect(result.total).toBe(1);
  });

  it("returns empty logs array when no data", async () => {
    setupSelect({ data: null, count: 0, error: null });

    const result = await getAuditLogsForTarget("organization", "org-1");

    expect(result.logs).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("throws on database error", async () => {
    setupSelect({ data: null, count: null, error: new Error("Connection failed") });

    await expect(
      getAuditLogsForTarget("organization", "org-1"),
    ).rejects.toThrow("Failed to fetch audit logs");
  });

  it("applies custom limit and offset", async () => {
    const chain = setupSelect({ data: [], count: 0, error: null });

    await getAuditLogsForTarget("organization", "org-1", { limit: 5, offset: 10 });

    expect(chain.range).toHaveBeenCalledWith(10, 14);
  });
});

// ---------------------------------------------------------------------------
// getRecentAuditLogs
// ---------------------------------------------------------------------------

describe("getRecentAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recent logs with default limit", async () => {
    const mockLogs = [
      {
        id: "log-1",
        user_email: "root@opttius.com",
        action: "create",
        target_type: "organization",
        target_name: "New Org",
        created_at: "2025-06-10T00:00:00Z",
      },
    ];

    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
    };
    // @ts-expect-error - chaining mock
    chain.select.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);

    (createServiceRoleClient as Mock).mockReturnValue({
      from: vi.fn(() => chain),
    });

    const result = await getRecentAuditLogs();

    expect(result).toHaveLength(1);
    expect(result[0].userEmail).toBe("root@opttius.com");
    expect(result[0].action).toBe("create");
  });

  it("throws on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error("DB fail") }),
    };
    // @ts-expect-error - chaining mock
    chain.select.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);

    (createServiceRoleClient as Mock).mockReturnValue({
      from: vi.fn(() => chain),
    });

    await expect(getRecentAuditLogs()).rejects.toThrow("Failed to fetch recent audit logs");
  });

  it("accepts custom limit", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit,
    };
    // @ts-expect-error - chaining mock
    chain.select.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);

    (createServiceRoleClient as Mock).mockReturnValue({
      from: vi.fn(() => chain),
    });

    await getRecentAuditLogs(10);
    expect(limit).toHaveBeenCalledWith(10);
  });
});

// ---------------------------------------------------------------------------
// getClientInfoFromRequest
// ---------------------------------------------------------------------------

describe("getClientInfoFromRequest", () => {
  it("extracts ip from cf-connecting-ip header", () => {
    const req = {
      headers: new Map([
        ["cf-connecting-ip", "203.0.113.1"],
        ["user-agent", "TestAgent/1.0"],
      ]),
    } as unknown as Request;

    const info = getClientInfoFromRequest(req);
    expect(info.ipAddress).toBe("203.0.113.1");
    expect(info.userAgent).toBe("TestAgent/1.0");
  });

  it("falls back to x-forwarded-for", () => {
    const req = {
      headers: new Map([
        ["x-forwarded-for", "198.51.100.1, 10.0.0.1"],
        ["user-agent", "curl/7.68"],
      ]),
    } as unknown as Request;

    const info = getClientInfoFromRequest(req);
    expect(info.ipAddress).toBe("198.51.100.1");
  });

  it("falls back to x-real-ip", () => {
    const req = {
      headers: new Map([["x-real-ip", "192.0.2.1"]]),
    } as unknown as Request;

    const info = getClientInfoFromRequest(req);
    expect(info.ipAddress).toBe("192.0.2.1");
  });

  it("returns 'unknown' when no ip headers present", () => {
    const req = { headers: new Map() } as unknown as Request;

    const info = getClientInfoFromRequest(req);
    expect(info.ipAddress).toBe("unknown");
    expect(info.userAgent).toBe("unknown");
  });
});
