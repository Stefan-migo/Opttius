/**
 * Unit tests for branch middleware (branch-middleware.ts)
 *
 * Tests getBranchFromRequest, getOperativoContext, validateBranchAccess,
 * getFieldOperationFromRequest, addBranchFilter, addBranchFilterForBranchScopedTable.
 *
 * @module __tests__/unit/lib/api/branch-middleware.test
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addBranchFilter,
  addBranchFilterForBranchScopedTable,
  type BranchContext,
  getBranchFromRequest,
  getFieldOperationFromRequest,
  getOperativoContext,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { createClient } from "@/utils/supabase/server";

// Mock dependencies
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  appLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

function makeRequest(overrides: Partial<NextRequest> = {}): NextRequest {
  return {
    url: "http://localhost:3000/api/test",
    headers: new Headers(),
    ...overrides,
  } as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getFieldOperationFromRequest
// ---------------------------------------------------------------------------
describe("getFieldOperationFromRequest", () => {
  it("should return field_operation_id from header", () => {
    const req = makeRequest({
      headers: new Headers({ "x-field-operation-id": "op-42" }),
    });
    expect(getFieldOperationFromRequest(req)).toBe("op-42");
  });

  it("should return field_operation_id from query param", () => {
    const req = makeRequest({
      url: "http://localhost:3000/api/test?field_operation_id=op-99",
    });
    expect(getFieldOperationFromRequest(req)).toBe("op-99");
  });

  it("should return null when not present", () => {
    const req = makeRequest();
    expect(getFieldOperationFromRequest(req)).toBeNull();
  });

  it("should prefer header over query param", () => {
    const req = makeRequest({
      url: "http://localhost:3000/api/test?field_operation_id=query-op",
      headers: new Headers({ "x-field-operation-id": "header-op" }),
    });
    expect(getFieldOperationFromRequest(req)).toBe("header-op");
  });
});

// ---------------------------------------------------------------------------
// getOperativoContext
// ---------------------------------------------------------------------------
describe("getOperativoContext", () => {
  it("should return context with fieldOperationId when present", () => {
    const req = makeRequest({
      headers: new Headers({ "x-field-operation-id": "op-1" }),
    });
    const ctx = getOperativoContext(req);
    expect(ctx).toEqual({ fieldOperationId: "op-1" });
  });

  it("should return context with null when absent", () => {
    const req = makeRequest();
    const ctx = getOperativoContext(req);
    expect(ctx).toEqual({ fieldOperationId: null });
  });
});

// ---------------------------------------------------------------------------
// getBranchFromRequest
// ---------------------------------------------------------------------------
describe("getBranchFromRequest", () => {
  it("should return branch from x-branch-id header", async () => {
    const req = makeRequest({
      headers: new Headers({ "x-branch-id": "branch-1" }),
    });
    await expect(getBranchFromRequest(req)).resolves.toBe("branch-1");
  });

  it("should return branch from branch_id query param", async () => {
    const req = makeRequest({
      url: "http://localhost:3000/api/test?branch_id=branch-2",
    });
    await expect(getBranchFromRequest(req)).resolves.toBe("branch-2");
  });

  it("should prefer header over query param", async () => {
    const req = makeRequest({
      url: "http://localhost:3000/api/test?branch_id=query-branch",
      headers: new Headers({ "x-branch-id": "header-branch" }),
    });
    await expect(getBranchFromRequest(req)).resolves.toBe("header-branch");
  });

  it("should return null when no branch identifier is present", async () => {
    const req = makeRequest();
    await expect(getBranchFromRequest(req)).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateBranchAccess
// ---------------------------------------------------------------------------
describe("validateBranchAccess", () => {
  it("should return true when branchId is null and user is super admin", async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown);

    await expect(validateBranchAccess("uid-1", null)).resolves.toBe(true);
  });

  it("should return false when branchId is null and user is not super admin", async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown);

    await expect(validateBranchAccess("uid-1", null)).resolves.toBe(false);
  });

  it("should return false when branchId is null and RPC errors", async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: undefined, error: new Error("err") }),
    } as unknown);

    await expect(validateBranchAccess("uid-1", null)).resolves.toBe(false);
  });

  it("should return true when user can access specific branch", async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown);

    await expect(validateBranchAccess("uid-1", "branch-1")).resolves.toBe(true);
  });

  it("should return false when user cannot access specific branch", async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown);

    await expect(
      validateBranchAccess("uid-1", "branch-99"),
    ).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addBranchFilter
// ---------------------------------------------------------------------------
describe("addBranchFilter", () => {
  it("should filter by organization_id when super admin in global view with org", () => {
    const query = { eq: vi.fn().mockReturnValue("filtered") };
    const result = addBranchFilter(query, null, true, "org-1");
    expect(query.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(result).toBe("filtered");
  });

  it("should filter by zero UUID when super admin in global view without org", () => {
    const query = { eq: vi.fn().mockReturnValue("filtered") };
    const result = addBranchFilter(query, null, true, null);
    expect(query.eq).toHaveBeenCalledWith(
      "organization_id",
      "00000000-0000-0000-0000-000000000000",
    );
    expect(result).toBe("filtered");
  });

  it("should filter by branch_id when branch is specified", () => {
    const query = { eq: vi.fn().mockReturnValue("filtered") };
    const result = addBranchFilter(query, "branch-x", false);
    expect(query.eq).toHaveBeenCalledWith("branch_id", "branch-x");
    expect(result).toBe("filtered");
  });

  it("should filter by zero UUID when neither global nor branch", () => {
    const query = { eq: vi.fn().mockReturnValue("filtered") };
    const result = addBranchFilter(query, null, false);
    expect(query.eq).toHaveBeenCalledWith(
      "branch_id",
      "00000000-0000-0000-0000-000000000000",
    );
    expect(result).toBe("filtered");
  });
});

// ---------------------------------------------------------------------------
// addBranchFilterForBranchScopedTable
// ---------------------------------------------------------------------------
describe("addBranchFilterForBranchScopedTable", () => {
  const supabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  } as unknown;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter by branch_id when branch is set", async () => {
    const query = { eq: vi.fn().mockReturnValue("filtered") };
    const ctx = {
      branchId: "branch-1",
      isSuperAdmin: false,
      organizationId: null,
      accessibleBranches: [],
    } as BranchContext;

    const result = await addBranchFilterForBranchScopedTable(
      query,
      ctx,
      supabase,
    );
    expect(query.eq).toHaveBeenCalledWith("branch_id", "branch-1");
    expect(result).toBe("filtered");
  });

  it("should filter by org branches when super admin in global view", async () => {
    const query = { in: vi.fn().mockReturnValue("filtered") };
    const ctx = {
      branchId: null,
      isSuperAdmin: true,
      organizationId: "org-1",
      accessibleBranches: [],
    } as BranchContext;

    supabase.from = vi.fn().mockReturnThis();
    supabase.select = vi.fn().mockReturnThis();
    supabase.eq = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "b1" }, { id: "b2" }], error: null });

    const result = await addBranchFilterForBranchScopedTable(
      query,
      ctx,
      supabase,
    );
    expect(result).toBe("filtered");
    expect(query.in).toHaveBeenCalledWith("branch_id", ["b1", "b2"]);
  });

  it("should filter by zero UUID when super admin has no org branches", async () => {
    const query = { eq: vi.fn().mockReturnValue("filtered") };
    const ctx = {
      branchId: null,
      isSuperAdmin: true,
      organizationId: "org-1",
      accessibleBranches: [],
    } as BranchContext;

    supabase.from = vi.fn().mockReturnThis();
    supabase.select = vi.fn().mockReturnThis();
    supabase.eq = vi.fn().mockResolvedValue({ data: [], error: null });

    const result = await addBranchFilterForBranchScopedTable(
      query,
      ctx,
      supabase,
    );
    expect(result).toBe("filtered");
    expect(query.eq).toHaveBeenCalledWith(
      "branch_id",
      "00000000-0000-0000-0000-000000000000",
    );
  });

  it("should fall back to primary branch for regular admin without branch", async () => {
    const query = { eq: vi.fn().mockReturnValue("filtered") };
    const ctx = {
      branchId: null,
      isSuperAdmin: false,
      organizationId: null,
      accessibleBranches: [
        { id: "b1", name: "B1", code: "01", role: "admin", isPrimary: true },
      ],
    } as unknown as BranchContext;

    const result = await addBranchFilterForBranchScopedTable(
      query,
      ctx,
      supabase,
    );
    expect(result).toBe("filtered");
    expect(query.eq).toHaveBeenCalledWith("branch_id", "b1");
  });

  it("should fall back to zero UUID when admin has no branches", async () => {
    const query = { eq: vi.fn().mockReturnValue("filtered") };
    const ctx = {
      branchId: null,
      isSuperAdmin: false,
      organizationId: null,
      accessibleBranches: [],
    } as BranchContext;

    const result = await addBranchFilterForBranchScopedTable(
      query,
      ctx,
      supabase,
    );
    expect(result).toBe("filtered");
    expect(query.eq).toHaveBeenCalledWith(
      "branch_id",
      "00000000-0000-0000-0000-000000000000",
    );
  });
});
