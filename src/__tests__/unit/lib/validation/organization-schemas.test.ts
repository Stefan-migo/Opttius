/**
 * Unit tests for organization validation schemas (lib/validation/organization-schemas.ts)
 *
 * Tests org slug, name, subscription tier, branch name, and combined schemas
 * with valid, invalid, and edge case inputs.
 *
 * @module __tests__/unit/lib/validation/organization-schemas.test
 */

import { describe, expect, it } from "vitest";

import {
  organizationSlugSchema,
  organizationNameSchema,
  subscriptionTierSchema,
  branchNameSchema,
  createOrganizationSchema,
  activateRealOrgSchema,
} from "@/lib/validation/organization-schemas";

// ============================================================================
// ORGANIZATION SLUG
// ============================================================================
describe("organizationSlugSchema", () => {
  it("should accept a valid slug", () => {
    expect(organizationSlugSchema.parse("my-org")).toBe("my-org");
  });

  it("should accept a slug with numbers", () => {
    expect(organizationSlugSchema.parse("org123")).toBe("org123");
  });

  it("should accept a slug with letters, numbers and hyphens", () => {
    expect(organizationSlugSchema.parse("org-42-beta")).toBe("org-42-beta");
  });

  it("should reject a slug starting with hyphen", () => {
    expect(() => organizationSlugSchema.parse("-org")).toThrow();
  });

  it("should reject a slug ending with hyphen", () => {
    expect(() => organizationSlugSchema.parse("org-")).toThrow();
  });

  it("should reject slugs with consecutive hyphens", () => {
    expect(() => organizationSlugSchema.parse("org--test")).toThrow();
  });

  it("should reject slugs with uppercase letters", () => {
    expect(() => organizationSlugSchema.parse("MyOrg")).toThrow();
  });

  it("should reject slugs with special characters", () => {
    expect(() => organizationSlugSchema.parse("my_org!")).toThrow();
  });

  it("should reject slugs shorter than 2 characters", () => {
    expect(() => organizationSlugSchema.parse("a")).toThrow();
  });

  it("should reject slugs longer than 100 characters", () => {
    expect(() => organizationSlugSchema.parse("a".repeat(101))).toThrow();
  });
});

// ============================================================================
// ORGANIZATION NAME
// ============================================================================
describe("organizationNameSchema", () => {
  it("should accept a valid organization name", () => {
    expect(organizationNameSchema.parse("Óptica Central")).toBe(
      "Óptica Central",
    );
  });

  it("should trim whitespace", () => {
    expect(organizationNameSchema.parse("  My Optica  ")).toBe("My Optica");
  });

  it("should reject names shorter than 2 characters", () => {
    expect(() => organizationNameSchema.parse("A")).toThrow();
  });

  it("should reject names longer than 200 characters", () => {
    expect(() => organizationNameSchema.parse("a".repeat(201))).toThrow();
  });
});

// ============================================================================
// SUBSCRIPTION TIER
// ============================================================================
describe("subscriptionTierSchema", () => {
  it("should accept 'basic'", () => {
    expect(subscriptionTierSchema.parse("basic")).toBe("basic");
  });

  it("should accept 'pro'", () => {
    expect(subscriptionTierSchema.parse("pro")).toBe("pro");
  });

  it("should accept 'premium'", () => {
    expect(subscriptionTierSchema.parse("premium")).toBe("premium");
  });

  it("should reject an invalid tier", () => {
    expect(() => subscriptionTierSchema.parse("enterprise")).toThrow();
  });
});

// ============================================================================
// BRANCH NAME
// ============================================================================
describe("branchNameSchema", () => {
  it("should accept a valid branch name", () => {
    expect(branchNameSchema.parse("Sucursal Centro")).toBe("Sucursal Centro");
  });

  it("should trim whitespace", () => {
    expect(branchNameSchema.parse("  Centro  ")).toBe("Centro");
  });

  it("should accept undefined", () => {
    expect(branchNameSchema.parse(undefined)).toBeUndefined();
  });

  it("should reject empty string", () => {
    expect(() => branchNameSchema.parse("")).toThrow();
  });

  it("should reject names over 200 chars", () => {
    expect(() => branchNameSchema.parse("a".repeat(201))).toThrow();
  });
});

// ============================================================================
// CREATE ORGANIZATION (combined schema)
// ============================================================================
describe("createOrganizationSchema", () => {
  it("should accept valid input with default tier", () => {
    const result = createOrganizationSchema.parse({
      name: "Mi Óptica",
      slug: "mi-optica",
    });
    expect(result.name).toBe("Mi Óptica");
    expect(result.slug).toBe("mi-optica");
    expect(result.subscription_tier).toBe("pro");
  });

  it("should accept valid input with explicit tier", () => {
    const result = createOrganizationSchema.parse({
      name: "Mi Óptica",
      slug: "mi-optica",
      subscription_tier: "premium",
    });
    expect(result.subscription_tier).toBe("premium");
  });

  it("should accept optional branch name", () => {
    const result = createOrganizationSchema.parse({
      name: "Mi Óptica",
      slug: "mi-optica",
      branchName: "Sucursal Norte",
    });
    expect(result.branchName).toBe("Sucursal Norte");
  });

  it("should reject missing name", () => {
    expect(() =>
      createOrganizationSchema.parse({ slug: "mi-optica" }),
    ).toThrow();
  });

  it("should reject missing slug", () => {
    expect(() =>
      createOrganizationSchema.parse({ name: "Mi Óptica" }),
    ).toThrow();
  });
});

// ============================================================================
// ACTIVATE REAL ORG (combined schema)
// ============================================================================
describe("activateRealOrgSchema", () => {
  it("should accept valid input", () => {
    const result = activateRealOrgSchema.parse({
      name: "Real Optics",
      slug: "real-optics",
      branchName: "Main St",
    });
    expect(result.name).toBe("Real Optics");
    expect(result.slug).toBe("real-optics");
    expect(result.branchName).toBe("Main St");
  });

  it("should accept valid input without branch name", () => {
    const result = activateRealOrgSchema.parse({
      name: "Real Optics",
      slug: "real-optics",
    });
    expect(result.branchName).toBeUndefined();
  });

  it("should reject missing name", () => {
    expect(() =>
      activateRealOrgSchema.parse({ slug: "real-optics" }),
    ).toThrow();
  });

  it("should reject missing slug", () => {
    expect(() =>
      activateRealOrgSchema.parse({ name: "Real Optics" }),
    ).toThrow();
  });
});
