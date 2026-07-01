/**
 * Type-level approval test for admin-navigation config extraction.
 * Verifies the module exports NavItem/NavGroup types and createNavigationGroups factory.
 */
import { describe, expectTypeOf, it } from "vitest";

describe("admin-navigation module shape", () => {
  it("exports NavItem interface", () => {
    type Module = typeof import("../admin-navigation");
    expectTypeOf<Module>().toHaveProperty("NavItem");
  });

  it("exports NavGroup interface", () => {
    type Module = typeof import("../admin-navigation");
    expectTypeOf<Module>().toHaveProperty("NavGroup");
  });

  it("exports createNavigationGroups function", () => {
    type Module = typeof import("../admin-navigation");
    expectTypeOf<Module>().toHaveProperty("createNavigationGroups");
    expectTypeOf<Module["createNavigationGroups"]>().toBeFunction();
  });

  it("NavItem has required href, label, icon fields", () => {
    type Item = import("../admin-navigation").NavItem;
    expectTypeOf<Item>().toHaveProperty("href");
    expectTypeOf<Item["href"]>().toBeString();
    expectTypeOf<Item>().toHaveProperty("label");
    expectTypeOf<Item["label"]>().toBeString();
    expectTypeOf<Item>().toHaveProperty("icon");
    expectTypeOf<Item["icon"]>().toBeFunction();
  });

  it("NavItem has optional fields", () => {
    type Item = import("../admin-navigation").NavItem;
    expectTypeOf<Item["badge"]>().toBeNullable();
    expectTypeOf<Item["description"]>().toBeNullable();
    expectTypeOf<Item["requiresFeature"]>().toBeNullable();
    expectTypeOf<Item["superAdminOnly"]>().toBeNullable();
    expectTypeOf<Item["rootOnly"]>().toBeNullable();
    expectTypeOf<Item["adminOrSuperAdminOnly"]>().toBeNullable();
    expectTypeOf<Item["onboardingOnly"]>().toBeNullable();
  });

  it("NavGroup has id, label, icon, items fields", () => {
    type Group = import("../admin-navigation").NavGroup;
    expectTypeOf<Group>().toHaveProperty("id");
    expectTypeOf<Group["id"]>().toBeString();
    expectTypeOf<Group>().toHaveProperty("label");
    expectTypeOf<Group["label"]>().toBeString();
    expectTypeOf<Group>().toHaveProperty("icon");
    expectTypeOf<Group>().toHaveProperty("items");
    expectTypeOf<Group["items"]>().toBeArray();
  });

  it("createNavigationGroups returns NavGroup array", () => {
    type Module = typeof import("../admin-navigation");
    expectTypeOf<ReturnType<Module["createNavigationGroups"]>>().toBeArray();
  });

  it("createNavigationGroups returns groups with NavItem items", () => {
    type Module = typeof import("../admin-navigation");
    type Group = ReturnType<Module["createNavigationGroups"]>[number];
    expectTypeOf<Group["items"]>().toBeArray();
  });
});
