import { describe, expect, it } from "vitest";

describe("SupportMetrics chart imports", () => {
  it("can load EnhancedBarChart module", async () => {
    const mod = await import("@/components/admin/charts/EnhancedBarChart");
    expect(mod.EnhancedBarChart).toBeDefined();
  }, 30000);

  it("can load EnhancedColumnChart module", async () => {
    const mod = await import("@/components/admin/charts/EnhancedColumnChart");
    expect(mod.EnhancedColumnChart).toBeDefined();
  }, 30000);

  it("can load EnhancedPieChart module", async () => {
    const mod = await import("@/components/admin/charts/EnhancedPieChart");
    expect(mod.EnhancedPieChart).toBeDefined();
  }, 30000);

  it("can load SupportMetrics module", async () => {
    const mod = await import("../SupportMetrics");
    expect(mod.SupportMetrics).toBeDefined();
    expect(typeof mod.SupportMetrics).toBe("function");
  }, 30000);
});
