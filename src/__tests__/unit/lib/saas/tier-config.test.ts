/**
 * Unit Tests for tier-config (TIER_LIMITS, hasFeature, getTierConfig, etc.)
 *
 * Pure logic — no mocks needed.
 */

import { describe, expect, it } from "vitest";

import {
  TIER_LIMITS,
  canUpgrade,
  getNextTier,
  getTierConfig,
  hasFeature,
  isUnlimited,
} from "@/lib/saas/tier-config";
import type { SubscriptionTier, TierFeature, TierLimits } from "@/lib/saas/tier-config";

// ---------------------------------------------------------------------------
// TIER_LIMITS structure
// ---------------------------------------------------------------------------
describe("TIER_LIMITS", () => {
  it("has all three tiers defined", () => {
    expect(TIER_LIMITS.basic).toBeDefined();
    expect(TIER_LIMITS.pro).toBeDefined();
    expect(TIER_LIMITS.premium).toBeDefined();
  });

  it("price increases with tier", () => {
    expect(TIER_LIMITS.basic.price).toBeLessThan(TIER_LIMITS.pro.price);
    expect(TIER_LIMITS.pro.price).toBeLessThan(TIER_LIMITS.premium.price);
  });

  it("limits are progressive (or equal) across tiers", () => {
    const tiers: SubscriptionTier[] = ["basic", "pro", "premium"];
    const fields: (keyof TierLimits)[] = ["max_branches", "max_users", "max_customers", "max_products"];

    for (const field of fields) {
      for (let i = 1; i < tiers.length; i++) {
        const prev = TIER_LIMITS[tiers[i - 1]][field];
        const curr = TIER_LIMITS[tiers[i]][field];
        // Unlimited is considered higher than any number
        if (curr === "unlimited") {
          expect(curr).toBe("unlimited");
        } else if (prev === "unlimited") {
          // Shouldn't happen since earlier tiers are more restrictive
          expect(false).toBe(true);
        } else {
          expect(curr as number).toBeGreaterThanOrEqual(prev as number);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getTierConfig
// ---------------------------------------------------------------------------
describe("getTierConfig", () => {
  it("returns the basic config", () => {
    const config = getTierConfig("basic");
    expect(config.name).toBe("Basic");
    expect(config.price).toBe(49);
    expect(config.max_branches).toBe(1);
    expect(config.max_users).toBe(2);
    expect(config.max_customers).toBe(200);
    expect(config.max_products).toBe(100);
  });

  it("returns the pro config", () => {
    const config = getTierConfig("pro");
    expect(config.name).toBe("Pro");
    expect(config.price).toBe(99);
    expect(config.max_branches).toBe(4);
    expect(config.max_users).toBe(8);
    expect(config.max_customers).toBe(2000);
    expect(config.max_products).toBe(500);
  });

  it("returns the premium config with unlimited fields", () => {
    const config = getTierConfig("premium");
    expect(config.name).toBe("Premium");
    expect(config.price).toBe(299);
    expect(config.max_branches).toBe(20);
    expect(config.max_users).toBe(50);
    expect(config.max_customers).toBe("unlimited");
    expect(config.max_products).toBe("unlimited");
  });
});

// ---------------------------------------------------------------------------
// hasFeature
// ---------------------------------------------------------------------------
describe("hasFeature", () => {
  it("basic tier has core features but no advanced", () => {
    const core: TierFeature[] = ["pos", "appointments", "quotes", "work_orders", "prescriptions", "custom_branding"];
    const advanced: TierFeature[] = ["chat_ia", "advanced_analytics", "field_operations", "agreements", "whatsapp", "api_access"];

    for (const f of core) expect(hasFeature("basic", f)).toBe(true);
    for (const f of advanced) expect(hasFeature("basic", f)).toBe(false);
  });

  it("pro tier has most features except api_access", () => {
    const available: TierFeature[] = ["pos", "appointments", "quotes", "work_orders", "prescriptions", "custom_branding", "chat_ia", "advanced_analytics", "field_operations", "agreements", "whatsapp"];

    for (const f of available) expect(hasFeature("pro", f)).toBe(true);
    expect(hasFeature("pro", "api_access")).toBe(false);
  });

  it("premium tier has all features except api_access", () => {
    const allFeatures: TierFeature[] = [
      "pos", "appointments", "quotes", "work_orders", "prescriptions",
      "custom_branding", "chat_ia", "advanced_analytics", "field_operations",
      "agreements", "whatsapp", "api_access",
    ];

    for (const f of allFeatures) {
      if (f === "api_access") {
        expect(hasFeature("premium", f)).toBe(false);
      } else {
        expect(hasFeature("premium", f)).toBe(true);
      }
    }
  });

  it("progressive feature coverage: lower tier features are a subset of higher tier", () => {
    const allFeatures: TierFeature[] = [
      "pos", "appointments", "quotes", "work_orders", "prescriptions",
      "custom_branding", "chat_ia", "advanced_analytics", "field_operations",
      "agreements", "whatsapp", "api_access",
    ];

    for (const feature of allFeatures) {
      const basicHas = hasFeature("basic", feature);
      const proHas = hasFeature("pro", feature);
      const premiumHas = hasFeature("premium", feature);

      // If a lower tier has a feature, higher tiers must also have it
      expect(basicHas ? proHas : true).toBe(true);
      expect(proHas ? premiumHas : true).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// isUnlimited
// ---------------------------------------------------------------------------
describe("isUnlimited", () => {
  it("returns true for 'unlimited' string", () => {
    expect(isUnlimited("unlimited")).toBe(true);
  });

  it("returns false for numeric values", () => {
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(1)).toBe(false);
    expect(isUnlimited(100)).toBe(false);
    expect(isUnlimited(Infinity)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canUpgrade
// ---------------------------------------------------------------------------
describe("canUpgrade", () => {
  it("allows upgrade from any tier to a higher tier", () => {
    expect(canUpgrade("basic", "pro")).toBe(true);
    expect(canUpgrade("basic", "premium")).toBe(true);
    expect(canUpgrade("pro", "premium")).toBe(true);
  });

  it("disallows upgrade to same or lower tier", () => {
    expect(canUpgrade("basic", "basic")).toBe(false);
    expect(canUpgrade("pro", "basic")).toBe(false);
    expect(canUpgrade("premium", "basic")).toBe(false);
    expect(canUpgrade("premium", "pro")).toBe(false);
    expect(canUpgrade("premium", "premium")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getNextTier
// ---------------------------------------------------------------------------
describe("getNextTier", () => {
  it("returns pro after basic", () => {
    expect(getNextTier("basic")).toBe("pro");
  });

  it("returns premium after pro", () => {
    expect(getNextTier("pro")).toBe("premium");
  });

  it("returns null after premium", () => {
    expect(getNextTier("premium")).toBeNull();
  });
});
