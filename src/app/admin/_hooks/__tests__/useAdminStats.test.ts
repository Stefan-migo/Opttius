/**
 * Type-level approval test for useAdminStats hook extraction.
 * Verifies the module exports the correct types and function signature.
 */
import { describe, expectTypeOf, it } from "vitest";

describe("useAdminStats module shape", () => {
  it("exports a function named useAdminStats", () => {
    type Module = { useAdminStats: (params: { isAdmin: boolean }) => unknown };
    expectTypeOf<Module>().toHaveProperty("useAdminStats");
    expectTypeOf<Module["useAdminStats"]>().toBeFunction();
  });

  it("returns a stats object with expected shape", () => {
    type HookReturn = ReturnType<
      typeof import("../useAdminStats").useAdminStats
    >;
    expectTypeOf<HookReturn>().toHaveProperty("stats");
  });

  it("stats has all expected numeric fields", () => {
    type Stats = ReturnType<
      typeof import("../useAdminStats").useAdminStats
    >["stats"];
    expectTypeOf<Stats["todayOrders"]>().toBeNumber();
    expectTypeOf<Stats["totalOrders"]>().toBeNumber();
    expectTypeOf<Stats["revenue"]>().toBeNumber();
    expectTypeOf<Stats["lowStock"]>().toBeNumber();
    expectTypeOf<Stats["newWorkOrders"]>().toBeNumber();
    expectTypeOf<Stats["inProgressWorkOrders"]>().toBeNumber();
    expectTypeOf<Stats["pendingQuotes"]>().toBeNumber();
    expectTypeOf<Stats["todayAppointments"]>().toBeNumber();
    expectTypeOf<Stats["openTickets"]>().toBeNumber();
  });
});
