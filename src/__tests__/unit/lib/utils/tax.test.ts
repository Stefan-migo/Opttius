import { describe, expect, it } from "vitest";

import {
  calculatePriceWithTax,
  calculateSubtotal,
  calculateTotal,
  calculateTotalTax,
} from "@/lib/utils/tax";

describe("Tax Utilities", () => {
  describe("calculatePriceWithTax", () => {
    it("should calculate tax when price does not include tax", () => {
      const result = calculatePriceWithTax(10000, false, 19);
      expect(result.subtotal).toBe(10000);
      expect(result.tax).toBe(1900);
      expect(result.total).toBe(11900);
    });

    it("should extract tax when price includes tax", () => {
      const result = calculatePriceWithTax(11900, true, 19);
      expect(result.subtotal).toBeCloseTo(10000, 0);
      expect(result.tax).toBeCloseTo(1900, 0);
      expect(result.total).toBe(11900);
    });

    it("should handle zero tax rate", () => {
      const result = calculatePriceWithTax(10000, false, 0);
      expect(result.subtotal).toBe(10000);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(10000);
    });

    it("should round to 2 decimal places", () => {
      const result = calculatePriceWithTax(1000, false, 19);
      expect(result.tax).toBe(190);
      expect(result.total).toBe(1190);
    });
  });

  describe("calculateTotalTax", () => {
    it("should calculate total tax for multiple items", () => {
      const items = [
        { price: 10000, includesTax: false },
        { price: 20000, includesTax: false },
      ];
      const totalTax = calculateTotalTax(items, 19);
      expect(totalTax).toBe(5700); // (10000 * 0.19) + (20000 * 0.19) = 5700
    });

    it("should handle mixed tax-inclusive and tax-exclusive items", () => {
      const items = [
        { price: 11900, includesTax: true },
        { price: 10000, includesTax: false },
      ];
      const totalTax = calculateTotalTax(items, 19);
      expect(totalTax).toBeCloseTo(3800, 0); // ~1900 + 1900
    });
  });

  describe("calculateSubtotal", () => {
    it("should calculate subtotal for multiple items", () => {
      const items = [
        { price: 10000, includesTax: false },
        { price: 20000, includesTax: false },
      ];
      const subtotal = calculateSubtotal(items, 19);
      expect(subtotal).toBe(30000);
    });
  });

  describe("calculateTotal", () => {
    it("should calculate total for multiple items", () => {
      const items = [
        { price: 10000, includesTax: false },
        { price: 20000, includesTax: false },
      ];
      const total = calculateTotal(items, 19);
      expect(total).toBe(35700); // 30000 + 5700
    });
  });
});
