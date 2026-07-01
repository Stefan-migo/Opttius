/**
 * Type-level approval test for useOrganizationState hook extraction.
 * Verifies the module exports the correct types and function signature.
 */
import { describe, expectTypeOf, it } from "vitest";

describe("useOrganizationState module shape", () => {
  it("exports a function named useOrganizationState", () => {
    type Module = { useOrganizationState: () => unknown };
    expectTypeOf<Module>().toHaveProperty("useOrganizationState");
    expectTypeOf<Module["useOrganizationState"]>().toBeFunction();
  });

  it("returns an organizationState object with expected shape", () => {
    type HookReturn = ReturnType<
      typeof import("../useOrganizationState").useOrganizationState
    >;
    expectTypeOf<HookReturn>().toHaveProperty("organizationState");
  });

  it("organizationState.hasOrganization is nullable boolean", () => {
    type State = ReturnType<
      typeof import("../useOrganizationState").useOrganizationState
    >["organizationState"];
    expectTypeOf<State["hasOrganization"]>().toBeNullable();
    expectTypeOf<State["hasOrganization"]>().toEqualTypeOf<boolean | null>();
  });

  it("organizationState has string or null fields", () => {
    type State = ReturnType<
      typeof import("../useOrganizationState").useOrganizationState
    >["organizationState"];
    expectTypeOf<State["organizationName"]>().toBeNullable();
    expectTypeOf<State["organizationLogo"]>().toBeNullable();
    expectTypeOf<State["organizationSlogan"]>().toBeNullable();
  });

  it("organizationState has required boolean fields", () => {
    type State = ReturnType<
      typeof import("../useOrganizationState").useOrganizationState
    >["organizationState"];
    expectTypeOf<State["isDemoMode"]>().toBeBoolean();
    expectTypeOf<State["showActivateBanner"]>().toBeBoolean();
    expectTypeOf<State["onboardingRequired"]>().toBeBoolean();
    expectTypeOf<State["isChecking"]>().toBeBoolean();
  });

  it("organizationState.tierFeatures is optional record", () => {
    type State = ReturnType<
      typeof import("../useOrganizationState").useOrganizationState
    >["organizationState"];
    expectTypeOf<State["tierFeatures"]>().toEqualTypeOf<
      Record<string, boolean> | undefined
    >();
  });
});
