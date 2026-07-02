import { describe, expect, it } from "vitest";

describe("DashboardCharts module", () => {
  it("can be dynamically imported", async () => {
    const mod = await import("../DashboardCharts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  }, 30000);
});
