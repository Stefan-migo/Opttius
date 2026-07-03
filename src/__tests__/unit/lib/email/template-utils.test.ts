/**
 * Unit tests for email template utilities (template-utils.ts)
 *
 * Pure functions — no mocking needed.
 */

import { describe, expect, it } from "vitest";

import {
  formatOrderItemsHTML,
  formatOrderItemsText,
  getDefaultVariables,
  replaceTemplateVariables,
} from "@/lib/email/template-utils";

describe("formatOrderItemsHTML", () => {
  it("returns an HTML table for given items", () => {
    const html = formatOrderItemsHTML([
      { name: "Frame X", quantity: 1, price: 150000 },
    ]);

    expect(html).toContain("<table");
    expect(html).toContain("Frame X");
    expect(html).toContain("$150.000");
    expect(html).toContain("x1");
  });

  it("includes variant_title when present", () => {
    const html = formatOrderItemsHTML([
      { name: "Lentes", quantity: 2, price: 50000, variant_title: "Antireflex" },
    ]);

    expect(html).toContain("Lentes - Antireflex");
  });

  it("returns empty string for empty or null items", () => {
    expect(formatOrderItemsHTML([])).toBe("");
    expect(formatOrderItemsHTML(null as unknown as [])).toBe("");
    expect(formatOrderItemsHTML(undefined as unknown as [])).toBe("");
  });
});

describe("formatOrderItemsText", () => {
  it("returns a bullet list for given items", () => {
    const text = formatOrderItemsText([
      { name: "Frame X", quantity: 1, price: 150000 },
    ]);

    expect(text).toContain("•");
    expect(text).toContain("Frame X");
    expect(text).toContain("$150.000");
    expect(text).toContain("x1");
  });

  it("includes variant_title when present", () => {
    const text = formatOrderItemsText([
      { name: "Lentes", quantity: 2, price: 50000, variant_title: "Antireflex" },
    ]);

    expect(text).toContain("Lentes - Antireflex");
  });

  it("returns empty string for empty or null items", () => {
    expect(formatOrderItemsText([])).toBe("");
    expect(formatOrderItemsText(null as unknown as [])).toBe("");
    expect(formatOrderItemsText(undefined as unknown as [])).toBe("");
  });
});

describe("replaceTemplateVariables", () => {
  it("replaces {{variable}} placeholders", () => {
    const result = replaceTemplateVariables("Hello {{name}}!", { name: "World" });
    expect(result).toBe("Hello World!");
  });

  it("replaces multiple occurrences of the same variable", () => {
    const result = replaceTemplateVariables("{{x}} + {{x}} = {{x}}", { x: 2 });
    expect(result).toBe("2 + 2 = 2");
  });

  it("replaces multiple distinct variables", () => {
    const result = replaceTemplateVariables("Hi {{name}}, your total is ${{amount}}", {
      name: "Juan",
      amount: 25000,
    });
    expect(result).toBe("Hi Juan, your total is $25000");
  });

  it("replaces null and undefined values as empty string", () => {
    const result = replaceTemplateVariables("{{a}}-{{b}}", {
      a: null,
      b: undefined,
    });
    expect(result).toBe("-");
  });

  it("handles whitespace inside brackets", () => {
    const result = replaceTemplateVariables("Hello {{ name }}!", { name: "World" });
    expect(result).toBe("Hello World!");
  });

  it("leaves unmatched variables unchanged (no entry to replace)", () => {
    const result = replaceTemplateVariables("Hello {{name}}!", {});
    // With empty variables, the regex never fires — the template stays as-is
    expect(result).toBe("Hello {{name}}!");
  });

  it("returns empty string for empty template", () => {
    expect(replaceTemplateVariables("", { a: 1 })).toBe("");
  });
});

describe("getDefaultVariables", () => {
  it("returns default variables when no org provided", () => {
    const vars = getDefaultVariables();

    expect(vars.organization_name).toBe("Opttius");
    expect(vars.organization_email).toBe("contacto@opttius.cl");
    expect(vars.organization_support_email).toBe("soporte@opttius.cl");
    expect(vars.website_url).toBe("https://opttius.cl");
    expect(vars.login_url).toBe("https://opttius.cl/login");
  });

  it("uses org name when provided", () => {
    const vars = getDefaultVariables({ name: "Mi Óptica" });
    expect(vars.organization_name).toBe("Mi Óptica");
  });

  it("prefers support_email over contact_email", () => {
    const vars = getDefaultVariables({
      support_email: "ayuda@mioptica.cl",
      contact_email: "info@mioptica.cl",
    });
    expect(vars.organization_support_email).toBe("ayuda@mioptica.cl");
    expect(vars.support_email).toBe("ayuda@mioptica.cl");
  });

  it("falls back to contact_email when support_email is missing", () => {
    const vars = getDefaultVariables({ contact_email: "info@mioptica.cl" });
    expect(vars.organization_support_email).toBe("info@mioptica.cl");
  });

  it("falls back to email when contact_email is missing", () => {
    const vars = getDefaultVariables({ email: "owner@mioptica.cl" });
    expect(vars.organization_email).toBe("owner@mioptica.cl");
  });
});
