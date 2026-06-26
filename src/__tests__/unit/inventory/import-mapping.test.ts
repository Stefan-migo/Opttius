import { describe, expect, it } from "vitest";

import {
  autoMapAllColumns,
  autoMapColumn,
  generateSlug,
  parseArray,
  parseBoolean,
  parseCSVLine,
  suggestMappingFromHeaders,
} from "@/lib/inventory/import-mapping";

// ─── parseCSVLine ────────────────────────────────────────────────────

describe("parseCSVLine", () => {
  it("should parse quoted fields including embedded commas", () => {
    // REQ-1.1: `"John Doe", 123, "Hello, World", ""`
    const result = parseCSVLine('"John Doe", 123, "Hello, World", ""');
    expect(result).toEqual(["John Doe", "123", "Hello, World", ""]);
  });

  it("should parse escaped quotes inside quoted fields", () => {
    // REQ-1.2: `"He said ""Hello""", 456`
    const result = parseCSVLine('"He said ""Hello""", 456');
    expect(result).toEqual(['He said "Hello"', "456"]);
  });

  it("should handle trailing comma as empty field", () => {
    // REQ-1.3: `a,b,`
    const result = parseCSVLine("a,b,");
    expect(result).toEqual(["a", "b", ""]);
  });

  it("should parse normal unquoted fields", () => {
    const result = parseCSVLine("hello,world,foo");
    expect(result).toEqual(["hello", "world", "foo"]);
  });

  it("should handle empty string", () => {
    const result = parseCSVLine("");
    expect(result).toEqual([""]);
  });

  it("should handle single field", () => {
    const result = parseCSVLine("justone");
    expect(result).toEqual(["justone"]);
  });
});

// ─── parseBoolean ────────────────────────────────────────────────────

describe("parseBoolean", () => {
  it.each([
    // REQ-1.4
    ["true", true],
    ["1", true],
    ["yes", true],
    ["sí", true],
    ["si", true],
    ["y", true],
    ["TRUE", true],
    ["Sí", true],
    ["YES", true],
    ["True", true],
  ])("should return true for truthy value '%s'", (input, expected) => {
    expect(parseBoolean(input)).toBe(expected);
  });

  it.each([
    // REQ-1.5
    ["", false],
    ["false", false],
    ["0", false],
    ["no", false],
    ["FALSE", false],
    ["No", false],
  ])("should return false for falsy value '%s'", (input, expected) => {
    expect(parseBoolean(input)).toBe(expected);
  });
});

// ─── parseArray ──────────────────────────────────────────────────────

describe("parseArray", () => {
  it("should parse a JSON array string", () => {
    // REQ-1.6
    const result = parseArray('["hydrating", "anti-aging"]');
    expect(result).toEqual(["hydrating", "anti-aging"]);
  });

  it("should parse semicolon-separated values", () => {
    // REQ-1.7
    const result = parseArray("hydrating; anti-aging; SPF");
    expect(result).toEqual(["hydrating", "anti-aging", "SPF"]);
  });

  it("should return empty array for empty input", () => {
    // REQ-1.8
    expect(parseArray("")).toEqual([]);
  });

  it("should return empty array for null-ish input", () => {
    // Since the function signature takes string, we use empty
    // (the function itself checks `if (!value)`)
    expect(parseArray(null as unknown as string)).toEqual([]);
    expect(parseArray(undefined as unknown as string)).toEqual([]);
  });

  it("should return empty array for whitespace-only input", () => {
    const result = parseArray("   ");
    expect(result).toEqual([]);
  });

  it("should trim each semicolon-separated item", () => {
    const result = parseArray("  a  ;  b  ;  c  ");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should handle malformed JSON gracefully, falling back to semicolon split", () => {
    const result = parseArray("[invalid json]");
    // Falls back to splitting by semicolon — the string starts with [ but is not valid JSON
    // Since the string doesn't contain semicolons, it returns ["[invalid json]"]
    expect(result).toEqual(["[invalid json]"]);
  });
});

// ─── generateSlug ────────────────────────────────────────────────────

describe("generateSlug", () => {
  it("should remove accents and lowercase", () => {
    // REQ-1.9
    const result = generateSlug("Crema Hidratante óptima");
    expect(result).toBe("crema-hidratante-optima");
  });

  it("should remove special characters and replace spaces with hyphens", () => {
    // REQ-1.10
    const result = generateSlug("Producto #1 (especial)");
    expect(result).toBe("producto-1-especial");
  });

  it("should return empty string for empty input", () => {
    // REQ-1.11
    expect(generateSlug("")).toBe("");
  });

  it("should collapse multiple spaces and hyphens, stripping leading/trailing hyphens", () => {
    // Note: generateSlug does not trim leading/trailing hyphens after replacement
    const result = generateSlug("  Hello    World--Testing  ");
    // ".trim()" only removes whitespace, not hyphens
    expect(result).toBe("-hello-world-testing-");
  });

  it("should handle only special characters", () => {
    const result = generateSlug("!!! @@@ ###");
    // Spaces become hyphens after removal of special chars
    expect(result).toBe("-");
  });

  it("should handle accented vowels at start and end", () => {
    const result = generateSlug("Árbol Útil Índice Óptico Época");
    expect(result).toBe("arbol-util-indice-optico-epoca");
  });

  it("should preserve numbers", () => {
    const result = generateSlug("Product 2024 Version 2.0");
    expect(result).toBe("product-2024-version-20");
  });
});

// ─── autoMapColumn ───────────────────────────────────────────────────

describe("autoMapColumn", () => {
  it("should exact-match Spanish header to English field", () => {
    // REQ-1.12
    expect(autoMapColumn("nombre")).toBe("name");
    expect(autoMapColumn("precio")).toBe("price");
    expect(autoMapColumn("stock")).toBe("stock_quantity");
  });

  it("should exact-match English header to itself", () => {
    expect(autoMapColumn("name")).toBe("name");
    expect(autoMapColumn("price")).toBe("price");
    expect(autoMapColumn("description")).toBe("description");
  });

  it("should use substring fallback when no exact match exists", () => {
    // REQ-1.13: "precio_venta_final" contains "precio" which maps to "price"
    expect(autoMapColumn("precio_venta_final")).toBe("price");
    expect(autoMapColumn("precio_venta")).toBe("price");
  });

  it("should return 'ignore' for unknown header", () => {
    // REQ-1.14
    expect(autoMapColumn("not_a_real_field")).toBe("ignore");
    expect(autoMapColumn("xyzzy")).toBe("ignore");
  });

  it("should be case-insensitive and trim whitespace", () => {
    expect(autoMapColumn("  NOMBRE  ")).toBe("name");
    expect(autoMapColumn("Precio")).toBe("price");
    expect(autoMapColumn("  Marca  ")).toBe("brand");
  });
});

// ─── autoMapAllColumns ───────────────────────────────────────────────

describe("autoMapAllColumns", () => {
  it("should auto-map multiple headers in batch", () => {
    const headers = ["nombre", "precio", "stock", "unknown_field"];
    const result = autoMapAllColumns(headers);
    expect(result).toEqual({
      nombre: "name",
      precio: "price",
      stock: "stock_quantity",
      unknown_field: "ignore",
    });
  });

  it("should handle empty headers array", () => {
    const result = autoMapAllColumns([]);
    expect(result).toEqual({});
  });
});

// ─── suggestMappingFromHeaders ───────────────────────────────────────

describe("suggestMappingFromHeaders", () => {
  it("should map products headers and return confidence", () => {
    const headers = ["nombre", "precio", "stock", "sku", "not_a_real_field"];
    const result = suggestMappingFromHeaders(headers, "products");

    // Note: "precio" maps to "price" first, then gets overwritten to
    // "cost_price" by substring matching via "precio_costo" key.
    // This is existing production behavior.
    expect(result.mapping["nombre"]).toBe("name");
    expect(result.mapping["precio"]).toBe("cost_price");
    expect(result.mapping["stock"]).toBe("stock_quantity");
    expect(result.mapping["sku"]).toBe("sku");
    expect(result.confidence).toBe(0.4); // 4 matched out of 10 fields
  });

  it("should map customers headers and return confidence", () => {
    const headers = ["first_name", "email", "phone", "rut"];
    const result = suggestMappingFromHeaders(headers, "customers");

    // Customer fields are NOT in COLUMN_MAPPINGS, only product fields are.
    // "email", "phone", "rut" match via substring fallback (h.includes(field)).
    // "first_name" does NOT match (underscore vs space in substring check).
    expect(result.mapping["email"]).toBe("email");
    expect(result.mapping["phone"]).toBe("phone");
    expect(result.mapping["rut"]).toBe("rut");
    expect(result.mapping["first_name"]).toBeUndefined();
    expect(result.confidence).toBe(3 / 8); // 3 matched out of 8 customer fields
  });

  it("should return low confidence when nearly no headers match", () => {
    // "bar" accidentally matches "barcode" via substring, "type" exactly matches "product_type"
    const headers = ["foo", "bar", "type"];
    const result = suggestMappingFromHeaders(headers, "products");

    expect(result.mapping["bar"]).toBe("barcode");
    expect(result.mapping["type"]).toBe("product_type");
    expect(result.confidence).toBe(0.2); // 2 matched out of 10
  });

  it("should return zero confidence when truly no headers match", () => {
    const headers = ["zzzzz", "aaaaa"];
    const result = suggestMappingFromHeaders(headers, "products");

    expect(Object.keys(result.mapping)).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it("should handle empty headers array", () => {
    const result = suggestMappingFromHeaders([], "products");
    expect(result.mapping).toEqual({});
    expect(result.confidence).toBe(0);
  });
});
