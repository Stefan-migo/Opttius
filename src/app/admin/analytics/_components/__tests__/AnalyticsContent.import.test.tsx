import { describe, expect, it } from "vitest";

describe("AnalyticsContent chart imports", () => {
  it("can load EnhancedAreaChart module", async () => {
    const mod = await import("@/components/admin/charts/EnhancedAreaChart");
    expect(mod.EnhancedAreaChart).toBeDefined();
  }, 30000);

  it("can load EnhancedBarChart module", async () => {
    const mod = await import("@/components/admin/charts/EnhancedBarChart");
    expect(mod.EnhancedBarChart).toBeDefined();
  }, 30000);

  it("can load EnhancedColumnChart module", async () => {
    const mod = await import("@/components/admin/charts/EnhancedColumnChart");
    expect(mod.EnhancedColumnChart).toBeDefined();
  }, 30000);

  it("can load EnhancedLineChart module", async () => {
    const mod = await import("@/components/admin/charts/EnhancedLineChart");
    expect(mod.EnhancedLineChart).toBeDefined();
  }, 30000);

  it("can load EnhancedPieChart module", async () => {
    const mod = await import("@/components/admin/charts/EnhancedPieChart");
    expect(mod.EnhancedPieChart).toBeDefined();
  }, 30000);

  it("can load AnalyticsContent module", async () => {
    const mod = await import("../AnalyticsContent");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  }, 30000);
});
