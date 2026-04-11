/**
 * Unit Tests for tier-validator and tier-config utilities
 */

import { describe, expect, it } from "vitest";

import {
  canUpgrade,
  getNextTier,
  getTierConfig,
  isUnlimited,
} from "@/lib/saas/tier-config";
import {
  TIER_DISPLAY_NAMES,
  TIER_FEATURE_LABELS,
} from "@/lib/saas/tier-constants";
import { getTierUpgradeMessage } from "@/lib/saas/tier-validator";

describe("tier-config", () => {
  describe("isUnlimited", () => {
    it("returns true for 'unlimited'", () => {
      expect(isUnlimited("unlimited")).toBe(true);
    });

    it("returns false for numbers", () => {
      expect(isUnlimited(100)).toBe(false);
      expect(isUnlimited(0)).toBe(false);
    });
  });

  describe("canUpgrade", () => {
    it("returns true when toTier is higher", () => {
      expect(canUpgrade("basic", "pro")).toBe(true);
      expect(canUpgrade("basic", "premium")).toBe(true);
      expect(canUpgrade("pro", "premium")).toBe(true);
    });

    it("returns false when toTier is same or lower", () => {
      expect(canUpgrade("basic", "basic")).toBe(false);
      expect(canUpgrade("pro", "basic")).toBe(false);
      expect(canUpgrade("premium", "pro")).toBe(false);
    });
  });

  describe("getNextTier", () => {
    it("returns next tier in order", () => {
      expect(getNextTier("basic")).toBe("pro");
      expect(getNextTier("pro")).toBe("premium");
    });

    it("returns null for premium", () => {
      expect(getNextTier("premium")).toBeNull();
    });
  });

  describe("getTierConfig", () => {
    it("returns config for each tier", () => {
      const basic = getTierConfig("basic");
      expect(basic.name).toBe("Basic");
      expect(basic.max_branches).toBe(1);
      expect(basic.max_customers).toBe(200);

      const premium = getTierConfig("premium");
      expect(premium.max_customers).toBe("unlimited");
      expect(premium.max_products).toBe("unlimited");
    });
  });
});

describe("getTierUpgradeMessage", () => {
  it("returns message for basic tier", () => {
    const msg = getTierUpgradeMessage("basic", "branches");
    expect(msg).toContain("Pro");
    expect(msg).toContain("branches");
  });

  it("returns max message for premium", () => {
    const msg = getTierUpgradeMessage("premium", "branches");
    expect(msg).toContain("máximo");
  });
});

describe("tier-constants", () => {
  it("TIER_FEATURE_LABELS has all expected keys", () => {
    const expected = [
      "pos",
      "appointments",
      "quotes",
      "work_orders",
      "prescriptions",
      "custom_branding",
      "chat_ia",
      "advanced_analytics",
      "field_operations",
      "agreements",
      "whatsapp",
      "api_access",
    ];
    expected.forEach((key) => {
      expect(TIER_FEATURE_LABELS).toHaveProperty(key);
      expect(
        typeof TIER_FEATURE_LABELS[key as keyof typeof TIER_FEATURE_LABELS],
      ).toBe("string");
    });
  });

  it("TIER_DISPLAY_NAMES has all tiers", () => {
    expect(TIER_DISPLAY_NAMES.basic).toBe("Básico");
    expect(TIER_DISPLAY_NAMES.pro).toBe("Pro");
    expect(TIER_DISPLAY_NAMES.premium).toBe("Premium");
  });
});
