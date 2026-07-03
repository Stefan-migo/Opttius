import { describe, expect, it } from "vitest";

import {
  getBranchFilter,
  formatBranchName,
  getBranchHeader,
  getBranchQueryParam,
  getOperativoHeader,
  getBranchAndOperativoHeaders,
} from "@/lib/utils/branch";

describe("getBranchFilter", () => {
  it("returns branchId as null for super admin with global view", () => {
    const result = getBranchFilter("branch-1", true, true);
    expect(result).toEqual({
      branchId: null,
      isGlobalView: true,
      isSuperAdmin: true,
    });
  });

  it("keeps branchId when super admin but not in global view", () => {
    const result = getBranchFilter("branch-1", false, true);
    expect(result).toEqual({
      branchId: "branch-1",
      isGlobalView: false,
      isSuperAdmin: true,
    });
  });

  it("keeps branchId for non-super admin even in global view", () => {
    const result = getBranchFilter("branch-1", true, false);
    expect(result).toEqual({
      branchId: "branch-1",
      isGlobalView: true,
      isSuperAdmin: false,
    });
  });

  it("allows null branchId for non-super admin", () => {
    const result = getBranchFilter(null, false, false);
    expect(result).toEqual({
      branchId: null,
      isGlobalView: false,
      isSuperAdmin: false,
    });
  });
});

describe("formatBranchName", () => {
  it("returns 'Vista Global' for null", () => {
    expect(formatBranchName(null)).toBe("Vista Global");
  });

  it("formats branch name and code", () => {
    const branch = { name: "Sucursal Centro", code: "CENTRO" };
    expect(formatBranchName(branch)).toBe("Sucursal Centro (CENTRO)");
  });
});

describe("getBranchHeader", () => {
  it("returns 'global' for null", () => {
    expect(getBranchHeader(null)).toEqual({ "x-branch-id": "global" });
  });

  it("returns 'global' for undefined", () => {
    expect(getBranchHeader(undefined)).toEqual({ "x-branch-id": "global" });
  });

  it("returns 'global' for empty string", () => {
    expect(getBranchHeader("")).toEqual({ "x-branch-id": "global" });
  });

  it("returns the branch ID for a valid id", () => {
    expect(getBranchHeader("branch-abc")).toEqual({ "x-branch-id": "branch-abc" });
  });
});

describe("getBranchQueryParam", () => {
  it("returns 'branch_id=global' for null", () => {
    expect(getBranchQueryParam(null)).toBe("branch_id=global");
  });

  it("returns the branch ID query param", () => {
    expect(getBranchQueryParam("branch-abc")).toBe("branch_id=branch-abc");
  });
});

describe("getOperativoHeader", () => {
  it("returns empty object for null", () => {
    expect(getOperativoHeader(null)).toEqual({});
  });

  it("returns empty object for undefined", () => {
    expect(getOperativoHeader(undefined)).toEqual({});
  });

  it("returns empty object for empty string", () => {
    expect(getOperativoHeader("")).toEqual({});
  });

  it("returns the field operation header for a valid id", () => {
    expect(getOperativoHeader("op-xyz")).toEqual({ "x-field-operation-id": "op-xyz" });
  });
});

describe("getBranchAndOperativoHeaders", () => {
  it("returns branch header without operativo when not provided", () => {
    expect(getBranchAndOperativoHeaders("branch-1")).toEqual({
      "x-branch-id": "branch-1",
    });
  });

  it("returns branch header without operativo when null", () => {
    expect(getBranchAndOperativoHeaders("branch-1", null)).toEqual({
      "x-branch-id": "branch-1",
    });
  });

  it("combines branch and operativo headers", () => {
    expect(getBranchAndOperativoHeaders("branch-1", "op-xyz")).toEqual({
      "x-branch-id": "branch-1",
      "x-field-operation-id": "op-xyz",
    });
  });

  it("returns global branch header when branchId is null", () => {
    expect(getBranchAndOperativoHeaders(null)).toEqual({
      "x-branch-id": "global",
    });
  });
});
