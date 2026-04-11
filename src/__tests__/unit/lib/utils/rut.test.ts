import { describe, expect, it } from "vitest";

import { formatRUT, isValidRUTFormat, normalizeRUT } from "@/lib/utils/rut";

describe("RUT Utilities", () => {
  describe("formatRUT", () => {
    it("should format RUT correctly", () => {
      expect(formatRUT("123456789")).toBe("12.345.678-9");
      expect(formatRUT("12345678-9")).toBe("12.345.678-9");
    });

    it("should handle RUT with dots and dash", () => {
      expect(formatRUT("12.345.678-9")).toBe("12.345.678-9");
    });

    it("should return empty string for invalid input", () => {
      expect(formatRUT("")).toBe("");
      expect(formatRUT("abc")).toBe("");
    });

    it("should handle RUT with K as verification digit", () => {
      expect(formatRUT("12345678k")).toBe("12.345.678-K");
      expect(formatRUT("12345678K")).toBe("12.345.678-K");
    });
  });

  describe("isValidRUTFormat", () => {
    it("should validate correct RUT format", () => {
      expect(isValidRUTFormat("12345678-9")).toBe(true);
      expect(isValidRUTFormat("12.345.678-9")).toBe(true);
      expect(isValidRUTFormat("123456789")).toBe(true);
    });

    it("should reject invalid RUT format", () => {
      expect(isValidRUTFormat("abc")).toBe(false);
      expect(isValidRUTFormat("")).toBe(false);
      expect(isValidRUTFormat("123")).toBe(false); // Too short
    });

    it("should accept RUT with K as verification digit", () => {
      expect(isValidRUTFormat("12345678-K")).toBe(true);
      expect(isValidRUTFormat("12345678k")).toBe(true);
    });
  });

  describe("normalizeRUT", () => {
    it("should normalize RUT removing dots and dashes", () => {
      expect(normalizeRUT("12.345.678-9")).toBe("123456789");
      expect(normalizeRUT("12345678-9")).toBe("123456789");
      expect(normalizeRUT("123456789")).toBe("123456789");
    });

    it("should handle empty strings", () => {
      expect(normalizeRUT("")).toBe("");
    });
  });
});
