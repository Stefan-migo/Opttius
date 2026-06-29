/**
 * Unit tests for lens type label mappings.
 *
 * Tests getLensTypeLabel and LENS_TYPE_LABELS constants.
 */

import { describe, expect, it } from "vitest";

import { LENS_TYPE_LABELS, getLensTypeLabel } from "@/lib/lens-type-labels";

describe("getLensTypeLabel", () => {
  it("returns em-dash for null/undefined/empty", () => {
    expect(getLensTypeLabel(null)).toBe("—");
    expect(getLensTypeLabel(undefined)).toBe("—");
    expect(getLensTypeLabel("")).toBe("—");
  });

  it("returns correct Spanish labels for known slugs", () => {
    expect(getLensTypeLabel("single_vision")).toBe("Monofocal");
    expect(getLensTypeLabel("bifocal")).toBe("Bifocal");
    expect(getLensTypeLabel("trifocal")).toBe("Trifocal");
    expect(getLensTypeLabel("progressive")).toBe("Progresivo");
    expect(getLensTypeLabel("reading")).toBe("Lectura");
    expect(getLensTypeLabel("computer")).toBe("Computadora");
    expect(getLensTypeLabel("sports")).toBe("Deportivo");
  });

  it("returns the slug itself for unknown types", () => {
    expect(getLensTypeLabel("custom_type")).toBe("custom_type");
    expect(getLensTypeLabel("unknown")).toBe("unknown");
  });

  it("handles contact lens edge case", () => {
    expect(getLensTypeLabel("Lentes de contacto")).toBe("Lentes de contacto");
  });
});

describe("LENS_TYPE_LABELS", () => {
  it("contains all expected keys", () => {
    const keys = Object.keys(LENS_TYPE_LABELS);
    expect(keys).toContain("single_vision");
    expect(keys).toContain("bifocal");
    expect(keys).toContain("trifocal");
    expect(keys).toContain("progressive");
    expect(keys).toContain("reading");
    expect(keys).toContain("computer");
    expect(keys).toContain("sports");
    expect(keys).toContain("Lentes de contacto");
  });

  it("all labels are non-empty strings", () => {
    for (const [key, label] of Object.entries(LENS_TYPE_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
