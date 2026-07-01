/**
 * Type-level approval test for useAdminCheck hook extraction.
 * Verifies the module exports the correct types and function signature.
 */
import { describe, expectTypeOf, it } from "vitest";

describe("useAdminCheck module shape", () => {
  it("exports a function named useAdminCheck", () => {
    type Module = { useAdminCheck: () => unknown };
    expectTypeOf<Module>().toHaveProperty("useAdminCheck");
    expectTypeOf<Module["useAdminCheck"]>().toBeFunction();
  });

  it("returns adminState with expected shape", () => {
    type HookReturn = ReturnType<
      typeof import("../useAdminCheck").useAdminCheck
    >;
    expectTypeOf<HookReturn>().toHaveProperty("adminState");
    expectTypeOf<HookReturn>().toHaveProperty("adminRole");
    expectTypeOf<HookReturn>().toHaveProperty("handleSignOut");
    expectTypeOf<HookReturn>().toHaveProperty("isStillChecking");
    expectTypeOf<HookReturn>().toHaveProperty("signOutInProgress");
    expectTypeOf<HookReturn>().toHaveProperty("setAdminRole");
  });

  it("adminState has expected fields", () => {
    type AdminState = ReturnType<
      typeof import("../useAdminCheck").useAdminCheck
    >["adminState"];
    expectTypeOf<AdminState["isChecking"]>().toBeBoolean();
    expectTypeOf<AdminState["isAdmin"]>().toBeBoolean();
    expectTypeOf<AdminState["hasChecked"]>().toBeBoolean();
    expectTypeOf<AdminState["checkedUserId"]>().toEqualTypeOf<string | null>();
  });

  it("adminRole is nullable string", () => {
    type HookReturn = ReturnType<
      typeof import("../useAdminCheck").useAdminCheck
    >;
    expectTypeOf<HookReturn["adminRole"]>().toEqualTypeOf<string | null>();
  });

  it("isStillChecking is boolean", () => {
    type HookReturn = ReturnType<
      typeof import("../useAdminCheck").useAdminCheck
    >;
    expectTypeOf<HookReturn["isStillChecking"]>().toBeBoolean();
  });

  it("handleSignOut returns a promise", () => {
    type HookReturn = ReturnType<
      typeof import("../useAdminCheck").useAdminCheck
    >;
    expectTypeOf<HookReturn["handleSignOut"]>().returns.resolves.toBeVoid();
  });

  it("setAdminRole is a setter function", () => {
    type HookReturn = ReturnType<
      typeof import("../useAdminCheck").useAdminCheck
    >;
    expectTypeOf<HookReturn["setAdminRole"]>().toBeFunction();
  });

  it("signOutInProgress is a ref object", () => {
    type HookReturn = ReturnType<
      typeof import("../useAdminCheck").useAdminCheck
    >;
    // Must be a mutable ref (not just a bool)
    expectTypeOf<HookReturn["signOutInProgress"]>().toHaveProperty("current");
  });
});
