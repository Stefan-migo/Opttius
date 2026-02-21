import { describe, it, expect } from "vitest";
import { mergeConfigsByScope } from "@/lib/admin/system-config-utils";

const mkConfig = (
  key: string,
  orgId: string | null,
  branchId: string | null,
  value: unknown = "value",
) => ({
  config_key: key,
  config_value: value,
  organization_id: orgId,
  branch_id: branchId,
});

describe("mergeConfigsByScope", () => {
  it("branch has priority over org and global for same config_key", () => {
    const configs = [
      mkConfig("tax_rate", null, null, 19),
      mkConfig("tax_rate", "org-1", null, 18),
      mkConfig("tax_rate", "org-1", "branch-1", 17),
    ];
    const result = mergeConfigsByScope(configs);
    expect(result).toHaveLength(1);
    expect(result[0].config_key).toBe("tax_rate");
    expect(result[0].config_value).toBe(17);
    expect(result[0].branch_id).toBe("branch-1");
  });

  it("org has priority over global", () => {
    const configs = [
      mkConfig("site_name", null, null, "Global Site"),
      mkConfig("site_name", "org-1", null, "Org Site"),
    ];
    const result = mergeConfigsByScope(configs);
    expect(result).toHaveLength(1);
    expect(result[0].config_value).toBe("Org Site");
    expect(result[0].organization_id).toBe("org-1");
  });

  it("keeps multiple configs with different keys", () => {
    const configs = [
      mkConfig("tax_rate", null, null, 19),
      mkConfig("currency", "org-1", null, "CLP"),
      mkConfig("low_stock_threshold", "org-1", "branch-1", 5),
    ];
    const result = mergeConfigsByScope(configs);
    expect(result).toHaveLength(3);
    const keys = result.map((c) => c.config_key).sort();
    expect(keys).toEqual(["currency", "low_stock_threshold", "tax_rate"]);
  });

  it("duplicate same key same scope keeps one (first wins when same priority)", () => {
    const configs = [
      mkConfig("tax_rate", null, null, 19),
      mkConfig("tax_rate", null, null, 20),
    ];
    const result = mergeConfigsByScope(configs);
    expect(result).toHaveLength(1);
    expect(result[0].config_value).toBe(19);
  });

  it("empty array returns empty array", () => {
    const result = mergeConfigsByScope([]);
    expect(result).toEqual([]);
  });

  it("global-only configs are preserved", () => {
    const configs = [
      mkConfig("maintenance_mode", null, null, false),
      mkConfig("debug_mode", null, null, false),
    ];
    const result = mergeConfigsByScope(configs);
    expect(result).toHaveLength(2);
    expect(
      result.every((c) => c.organization_id === null && c.branch_id === null),
    ).toBe(true);
  });
});
