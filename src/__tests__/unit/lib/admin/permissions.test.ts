/**
 * Unit Tests for admin/permissions (getDefaultPermissions, PERMISSION_RESOURCES, ACTION_LABELS)
 *
 * Pure logic — no mocks needed.
 */

import { describe, expect, it } from "vitest";

import type { AdminRole } from "@/lib/admin/permissions";
import {
  ACTION_LABELS,
  PERMISSION_RESOURCES,
  getDefaultPermissions,
} from "@/lib/admin/permissions";

// ---------------------------------------------------------------------------
// getDefaultPermissions
// ---------------------------------------------------------------------------
describe("getDefaultPermissions", () => {
  describe("root role", () => {
    const perms = getDefaultPermissions("root");

    it("has full CRUD on every resource", () => {
      const crud = ["read", "create", "update", "delete"];
      for (const resource of [
        "orders",
        "products",
        "customers",
        "settings",
        "admin_users",
        "support",
        "bulk_operations",
        "saas_management",
      ]) {
        expect(perms[resource]).toEqual(crud);
      }
    });

    it("has only read on analytics", () => {
      expect(perms.analytics).toEqual(["read"]);
    });
  });

  describe("dev role", () => {
    const perms = getDefaultPermissions("dev");

    it("has same permissions as root", () => {
      expect(perms).toEqual(getDefaultPermissions("root"));
    });
  });

  describe("super_admin role", () => {
    const perms = getDefaultPermissions("super_admin");

    it("has full CRUD on branches", () => {
      expect(perms.branches).toEqual(["read", "create", "update", "delete"]);
    });

    it("has full CRUD on orders, products, customers, settings, admin_users, support, bulk_operations", () => {
      const crud = ["read", "create", "update", "delete"];
      expect(perms.orders).toEqual(crud);
      expect(perms.products).toEqual(crud);
      expect(perms.customers).toEqual(crud);
      expect(perms.settings).toEqual(crud);
      expect(perms.admin_users).toEqual(crud);
      expect(perms.support).toEqual(crud);
      expect(perms.bulk_operations).toEqual(crud);
    });

    it("has only read on analytics", () => {
      expect(perms.analytics).toEqual(["read"]);
    });

    it("does NOT have saas_management", () => {
      expect(perms.saas_management).toBeUndefined();
    });
  });

  describe("admin role", () => {
    const perms = getDefaultPermissions("admin");

    it("has CRUD on orders, products, customers, appointments, quotes, work_orders", () => {
      const crud = ["read", "create", "update", "delete"];
      expect(perms.orders).toEqual(crud);
      expect(perms.products).toEqual(crud);
      expect(perms.customers).toEqual(crud);
      expect(perms.appointments).toEqual(crud);
      expect(perms.quotes).toEqual(crud);
      expect(perms.work_orders).toEqual(crud);
    });

    it("has only read on analytics", () => {
      expect(perms.analytics).toEqual(["read"]);
    });

    it("has read+update on settings (no create/delete)", () => {
      expect(perms.settings).toEqual(["read", "update"]);
    });

    it("has read only on admin_users", () => {
      expect(perms.admin_users).toEqual(["read"]);
    });

    it("has read+create+update on support (no delete)", () => {
      expect(perms.support).toEqual(["read", "create", "update"]);
    });

    it("has read+create on bulk_operations (no update/delete)", () => {
      expect(perms.bulk_operations).toEqual(["read", "create"]);
    });

    it("does NOT have saas_management or branches", () => {
      expect(perms.saas_management).toBeUndefined();
      expect(perms.branches).toBeUndefined();
    });
  });

  describe("employee role", () => {
    const perms = getDefaultPermissions("employee");

    it("has read+create+update on orders, customers, appointments, quotes (no delete)", () => {
      const rcu = ["read", "create", "update"];
      expect(perms.orders).toEqual(rcu);
      expect(perms.customers).toEqual(rcu);
      expect(perms.appointments).toEqual(rcu);
      expect(perms.quotes).toEqual(rcu);
    });

    it("has read+update on work_orders (no create/delete)", () => {
      expect(perms.work_orders).toEqual(["read", "update"]);
    });

    it("has read only on products", () => {
      expect(perms.products).toEqual(["read"]);
    });

    it("has read+create on support", () => {
      expect(perms.support).toEqual(["read", "create"]);
    });

    it("has read+create on pos", () => {
      expect(perms.pos).toEqual(["read", "create"]);
    });

    it("has empty arrays for analytics, settings, admin_users, bulk_operations", () => {
      expect(perms.analytics).toEqual([]);
      expect(perms.settings).toEqual([]);
      expect(perms.admin_users).toEqual([]);
      expect(perms.bulk_operations).toEqual([]);
    });
  });

  describe("vendedor role", () => {
    const perms = getDefaultPermissions("vendedor");

    it("has same permissions as employee", () => {
      expect(perms).toEqual(getDefaultPermissions("employee"));
    });
  });

  describe("unknown role", () => {
    it("falls back to admin permissions", () => {
      expect(getDefaultPermissions("nonexistent")).toEqual(getDefaultPermissions("admin"));
    });

    it("falls back to admin for empty string", () => {
      expect(getDefaultPermissions("")).toEqual(getDefaultPermissions("admin"));
    });
  });
});

// ---------------------------------------------------------------------------
// PERMISSION_RESOURCES
// ---------------------------------------------------------------------------
describe("PERMISSION_RESOURCES", () => {
  it("includes all expected resources", () => {
    const keys = PERMISSION_RESOURCES.map((r) => r.key);
    expect(keys).toContain("products");
    expect(keys).toContain("orders");
    expect(keys).toContain("customers");
    expect(keys).toContain("analytics");
    expect(keys).toContain("settings");
    expect(keys).toContain("admin_users");
    expect(keys).toContain("support");
    expect(keys).toContain("bulk_operations");
    expect(keys).toContain("appointments");
    expect(keys).toContain("quotes");
    expect(keys).toContain("work_orders");
    expect(keys).toContain("pos");
    expect(keys).toContain("branches");
  });

  it("each resource has a label and valid actions", () => {
    for (const resource of PERMISSION_RESOURCES) {
      expect(resource.label).toBeTruthy();
      expect(resource.actions.length).toBeGreaterThanOrEqual(1);
      for (const action of resource.actions) {
        expect(["read", "create", "update", "delete"]).toContain(action);
      }
    }
  });

  it("has read action in every resource", () => {
    for (const resource of PERMISSION_RESOURCES) {
      expect(resource.actions).toContain("read");
    }
  });
});

// ---------------------------------------------------------------------------
// ACTION_LABELS
// ---------------------------------------------------------------------------
describe("ACTION_LABELS", () => {
  it("has labels for all standard actions", () => {
    expect(ACTION_LABELS.read).toBe("Leer");
    expect(ACTION_LABELS.create).toBe("Crear");
    expect(ACTION_LABELS.update).toBe("Actualizar");
    expect(ACTION_LABELS.delete).toBe("Eliminar");
  });
});
