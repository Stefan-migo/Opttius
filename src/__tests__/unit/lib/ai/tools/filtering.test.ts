import { describe, expect, it } from "vitest";

import { getAllTools } from "@/lib/ai/tools";

describe("getAllTools(role?)", () => {
  it("returns all tools when role is undefined (backward-compat)", () => {
    const tools = getAllTools();
    // Should include tools that have minRole set
    expect(tools.length).toBeGreaterThan(0);
    const names = tools.map((t) => t.name);
    // All tools returned regardless of minRole
    expect(names).toContain("deleteCustomer");
    expect(names).toContain("deleteProduct");
    expect(names).toContain("deleteCategory");
    expect(names).toContain("executeBulkImport");
  });

  it("returns all tools when role is undefined (explicit undefined)", () => {
    const tools = getAllTools(undefined);
    expect(tools.length).toBeGreaterThan(0);
    const names = tools.map((t) => t.name);
    expect(names).toContain("deleteCustomer");
    expect(names).toContain("getCustomers");
  });

  it("excludes admin-protected tools for vendedor role", () => {
    const tools = getAllTools("vendedor");
    const names = tools.map((t) => t.name);

    // vendedor should NOT see admin-protected tools
    expect(names).not.toContain("deleteCustomer");
    expect(names).not.toContain("deleteProduct");
    expect(names).not.toContain("deleteCategory");
    expect(names).not.toContain("executeBulkImport");

    // vendedor should see tools without minRole
    expect(names).toContain("getCustomers");
    expect(names).toContain("getProducts");
    expect(names).toContain("getOrders");

    // vendedor should see tools with minRole: vendedor
    expect(names).toContain("searchOrgMemory");
    expect(names).toContain("getScreenContext");
    expect(names).toContain("navigateTo");
  });

  it("includes admin-protected tools for admin role", () => {
    const tools = getAllTools("admin");
    const names = tools.map((t) => t.name);

    // admin should see tools with minRole: admin
    expect(names).toContain("deleteCustomer");
    expect(names).toContain("deleteProduct");
    expect(names).toContain("deleteCategory");
    expect(names).toContain("executeBulkImport");

    // admin should also see tools without minRole
    expect(names).toContain("getCustomers");
    expect(names).toContain("getProducts");

    // admin should see memory tools
    expect(names).toContain("saveSessionSummary"); // minRole: admin
  });

  it("includes all tools for dueño role", () => {
    const tools = getAllTools("dueño");
    const names = tools.map((t) => t.name);

    // dueño sees ALL tools including admin-protected ones
    expect(names).toContain("deleteCustomer");
    expect(names).toContain("deleteProduct");
    expect(names).toContain("deleteCategory");
    expect(names).toContain("executeBulkImport");

    // dueño sees regular tools
    expect(names).toContain("getCustomers");
    expect(names).toContain("getProducts");
    expect(names).toContain("getOrders");

    // dueño sees memory and navigation tools
    expect(names).toContain("saveSessionSummary");
    expect(names).toContain("navigateTo");
    expect(names).toContain("searchOrgMemory");
  });

  it("includes tools without minRole for every role", () => {
    const roles = ["vendedor", "admin", "dueño"] as const;

    for (const role of roles) {
      const tools = getAllTools(role);
      const names = tools.map((t) => t.name);
      expect(names).toContain("getCustomers");
      expect(names).toContain("getProducts");
      expect(names).toContain("getOrders");
      expect(names).toContain("navigateTo");
      expect(names).toContain("getScreenContext");
    }
  });
});
