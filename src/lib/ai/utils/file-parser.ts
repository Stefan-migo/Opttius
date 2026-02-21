/**
 * Parse CSV and Excel files for bulk import.
 * @module lib/ai/utils/file-parser
 */

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  rowCount: number;
}

export async function parseCSV(buffer: ArrayBuffer): Promise<ParseResult> {
  const text = new TextDecoder().decode(buffer);
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length === 0) {
    return { headers: [], rows: [], rowCount: 0 };
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === "," && !inQuotes) || (c === ";" && !inQuotes)) {
        result.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      const val = values[idx];
      row[h] = val === undefined || val === "" ? null : val;
    });
    rows.push(row);
  }

  return {
    headers,
    rows,
    rowCount: rows.length,
  };
}

export async function parseExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  });

  if (data.length === 0) {
    return { headers: [], rows: [], rowCount: 0 };
  }

  const headerRow = data[0] as string[];
  const headers = headerRow.map((h) => String(h || "").trim());

  const rows: ParsedRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const values = data[i] as (string | number)[];
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      const val = values[idx];
      row[h] =
        val === undefined || val === null || String(val).trim() === ""
          ? null
          : val;
    });
    rows.push(row);
  }

  return {
    headers,
    rows,
    rowCount: rows.length,
  };
}

export async function parseImportFile(
  buffer: ArrayBuffer,
  filename: string,
): Promise<ParseResult> {
  const isCSV =
    filename.toLowerCase().endsWith(".csv") ||
    filename.toLowerCase().endsWith(".txt");
  const isExcel =
    filename.toLowerCase().endsWith(".xlsx") ||
    filename.toLowerCase().endsWith(".xls");

  if (isCSV) {
    return parseCSV(buffer);
  }
  if (isExcel) {
    return parseExcel(buffer);
  }

  throw new Error("Unsupported file format. Use CSV or Excel.");
}
