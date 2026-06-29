/**
 * Unit tests for prescription helper functions.
 *
 * Tests translatePrescriptionType and getPrescriptionTypes.
 */

import { describe, expect, it } from "vitest";

import {
  getPrescriptionTypes,
  translatePrescriptionType,
} from "@/lib/prescription-helpers";

describe("translatePrescriptionType", () => {
  it("returns 'Sin tipo' for null/undefined/empty", () => {
    expect(translatePrescriptionType(null)).toBe("Sin tipo");
    expect(translatePrescriptionType(undefined)).toBe("Sin tipo");
    expect(translatePrescriptionType("")).toBe("Sin tipo");
  });

  it("translates known types correctly", () => {
    expect(translatePrescriptionType("single_vision")).toBe("Visión Simple");
    expect(translatePrescriptionType("bifocal")).toBe("Bifocal");
    expect(translatePrescriptionType("trifocal")).toBe("Trifocal");
    expect(translatePrescriptionType("progressive")).toBe("Progresivo");
    expect(translatePrescriptionType("reading")).toBe("Lectura");
    expect(translatePrescriptionType("computer")).toBe("Computadora");
    expect(translatePrescriptionType("sports")).toBe("Deportivo");
  });

  it("returns the original value for unknown types", () => {
    expect(translatePrescriptionType("unknown_type")).toBe("unknown_type");
    expect(translatePrescriptionType("custom_lens")).toBe("custom_lens");
  });
});

describe("getPrescriptionTypes", () => {
  it("returns all prescription type entries", () => {
    const types = getPrescriptionTypes();
    expect(types).toHaveLength(7);
    expect(types).toContainEqual({
      value: "single_vision",
      label: "Visión Simple",
    });
    expect(types).toContainEqual({ value: "progressive", label: "Progresivo" });
    expect(types).toContainEqual({ value: "reading", label: "Lectura" });
  });

  it("all entries have value and label", () => {
    const types = getPrescriptionTypes();
    for (const entry of types) {
      expect(entry).toHaveProperty("value");
      expect(entry).toHaveProperty("label");
      expect(typeof entry.value).toBe("string");
      expect(typeof entry.label).toBe("string");
    }
  });
});
