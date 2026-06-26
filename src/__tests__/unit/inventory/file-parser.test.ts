import { describe, expect, it } from "vitest";

import {
  parseCSV,
  parseExcel,
  parseImportFile,
} from "@/lib/ai/utils/file-parser";

/**
 * Helper to encode a string into an ArrayBuffer (mimics file read).
 */
function csvToBuffer(csv: string): ArrayBuffer {
  return new TextEncoder().encode(csv).buffer;
}

// ─── parseCSV ────────────────────────────────────────────────────────

describe("parseCSV", () => {
  it("should parse standard CSV with headers and data rows", async () => {
    // REQ-3.1
    const csv = `name,price,stock,sku
"Producto A",19900,10,SKU-001
"Producto B",29900,5,SKU-002
"Producto C",9900,20,SKU-003`;

    const result = await parseCSV(csvToBuffer(csv));

    expect(result.headers).toEqual(["name", "price", "stock", "sku"]);
    expect(result.rowCount).toBe(3);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toEqual({
      name: "Producto A",
      price: "19900",
      stock: "10",
      sku: "SKU-001",
    });
    expect(result.rows[1]).toEqual({
      name: "Producto B",
      price: "29900",
      stock: "5",
      sku: "SKU-002",
    });
    expect(result.rows[2]).toEqual({
      name: "Producto C",
      price: "9900",
      stock: "20",
      sku: "SKU-003",
    });
  });

  it("should handle empty file returning empty result", async () => {
    // REQ-3.2
    const result = await parseCSV(csvToBuffer(""));
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(0);
  });

  it("should handle CSV with only headers and no data rows", async () => {
    const csv = `name,price,stock`;
    const result = await parseCSV(csvToBuffer(csv));
    expect(result.headers).toEqual(["name", "price", "stock"]);
    expect(result.rowCount).toBe(0);
    expect(result.rows).toHaveLength(0);
  });

  it("should handle quoted fields with commas inside values", async () => {
    const csv = `name,description,price
"Lens Cleaner","Cleans lenses, removes smudges",5000`;

    const result = await parseCSV(csvToBuffer(csv));
    expect(result.rows[0].name).toBe("Lens Cleaner");
    expect(result.rows[0].description).toBe("Cleans lenses, removes smudges");
    expect(result.rows[0].price).toBe("5000");
  });

  it("should handle semicolons as delimiters", async () => {
    const csv = `name;price;stock
"Product A";19900;10`;

    const result = await parseCSV(csvToBuffer(csv));
    expect(result.headers).toEqual(["name", "price", "stock"]);
    expect(result.rows[0].name).toBe("Product A");
    expect(result.rows[0].price).toBe("19900");
    expect(result.rows[0].stock).toBe("10");
  });

  it("should treat missing trailing fields as null", async () => {
    const csv = `a,b,c
1,2`;

    const result = await parseCSV(csvToBuffer(csv));
    expect(result.rows[0].a).toBe("1");
    expect(result.rows[0].b).toBe("2");
    expect(result.rows[0].c).toBeNull();
  });

  it("should handle trailing newline", async () => {
    const csv = `name,price\n"Test",100\n`;
    const result = await parseCSV(csvToBuffer(csv));
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].name).toBe("Test");
  });
});

// ─── parseExcel ───────────────────────────────────────────────────────

describe("parseExcel", () => {
  /**
   * Generate an in-memory Excel buffer using the xlsx library.
   * This avoids committing binary fixtures to the repo.
   */
  async function makeExcelBuffer(
    headers: string[],
    rows: unknown[][],
  ): Promise<ArrayBuffer> {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const data = [headers, ...rows];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buf = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  it("should parse valid Excel file with headers and data rows", async () => {
    // REQ-3.3
    const buffer = await makeExcelBuffer(
      ["name", "price", "stock"],
      [
        ["Producto A", 19900, 10],
        ["Producto B", 29900, 5],
      ],
    );

    const result = await parseExcel(buffer);

    expect(result.headers).toEqual(["name", "price", "stock"]);
    expect(result.rowCount).toBe(2);
    expect(result.rows[0]).toEqual({
      name: "Producto A",
      price: 19900,
      stock: 10,
    });
    expect(result.rows[1]).toEqual({
      name: "Producto B",
      price: 29900,
      stock: 5,
    });
  });

  it("should return empty result for empty workbook", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buf = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );

    const result = await parseExcel(ab);
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(0);
  });

  it("should handle numeric values correctly", async () => {
    const buffer = await makeExcelBuffer(
      ["name", "price", "stock"],
      [["Test", 5000, 0]],
    );

    const result = await parseExcel(buffer);
    expect(result.rows[0].price).toBe(5000);
    expect(result.rows[0].stock).toBe(0);
  });

  it("should treat empty cells as null", async () => {
    const buffer = await makeExcelBuffer(
      ["name", "description", "price"],
      [["Test", "", 100]],
    );

    const result = await parseExcel(buffer);
    expect(result.rows[0].name).toBe("Test");
    expect(result.rows[0].description).toBeNull();
    expect(result.rows[0].price).toBe(100);
  });
});

// ─── parseImportFile ─────────────────────────────────────────────────

describe("parseImportFile", () => {
  it("should dispatch .csv files to parseCSV", async () => {
    // REQ-3.4 — CSV
    const csv = `name,price\n"Test",100`;
    const buffer = new TextEncoder().encode(csv).buffer;

    const result = await parseImportFile(buffer, "products.csv");
    expect(result.headers).toEqual(["name", "price"]);
    expect(result.rowCount).toBe(1);
  });

  it("should dispatch .xlsx files to parseExcel", async () => {
    // REQ-3.4 — Excel
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const data = [
      ["name", "price"],
      ["Product A", 19900],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buf = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );

    const result = await parseImportFile(ab, "products.xlsx");
    expect(result.headers).toEqual(["name", "price"]);
    expect(result.rowCount).toBe(1);
  });

  it("should dispatch .txt files as CSV", async () => {
    const csv = `name,price\n"Test",100`;
    const buffer = new TextEncoder().encode(csv).buffer;

    const result = await parseImportFile(buffer, "products.txt");
    expect(result.headers).toEqual(["name", "price"]);
    expect(result.rowCount).toBe(1);
  });

  it("should throw for unsupported file formats", async () => {
    // REQ-3.4 — unsupported
    const buffer = new ArrayBuffer(0);

    await expect(parseImportFile(buffer, "document.pdf")).rejects.toThrow(
      "Unsupported file format",
    );
  });

  it("should throw for unsupported .png format", async () => {
    const buffer = new ArrayBuffer(0);

    await expect(parseImportFile(buffer, "image.png")).rejects.toThrow(
      "Unsupported file format",
    );
  });
});
