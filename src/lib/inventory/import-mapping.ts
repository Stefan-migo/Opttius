/**
 * Unified import mapping utilities.
 * Provides CSV parsing helpers and auto-mapping of column headers
 * for product and customer import workflows.
 */

// ─── CSV Parsing ───────────────────────────────────────────────────────

/**
 * Parse a single CSV line into fields, handling quoted fields,
 * escaped quotes, and trailing commas.
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());

  return fields;
}

// ─── Boolean Parsing ───────────────────────────────────────────────────

const TRUTHY_VALUES = new Set([
  "true",
  "1",
  "yes",
  "sí",
  "si",
  "y",
  "yeah",
  "on",
]);

/**
 * Parse a string value to boolean.
 * Returns true for truthy values (case-insensitive), false otherwise.
 */
export function parseBoolean(value: string | null | undefined): boolean {
  if (!value) return false;
  return TRUTHY_VALUES.has(value.trim().toLowerCase());
}

// ─── Array Parsing ─────────────────────────────────────────────────────

/**
 * Parse a string value to an array.
 * Handles JSON arrays and semicolon-separated values.
 */
export function parseArray(value: string | null | undefined): string[] {
  if (!value || !value.trim()) return [];

  const trimmed = value.trim();

  // Try JSON array first
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // fall through to semicolon split
    }
  }

  // Fall back to semicolon-separated
  return trimmed
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Slug Generation ───────────────────────────────────────────────────

/**
 * Generate a URL-friendly slug from a product name.
 * Removes accents, lowercases, replaces special chars and spaces with hyphens.
 */
export function generateSlug(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove combining diacritical marks
    .toLowerCase();

  const cleaned = normalized
    .replace(/[^a-z0-9\s-]/g, "") // keep only letters, digits, spaces, hyphens
    .replace(/[\s-]+/g, "-") // collapse spaces and hyphens
    .trim();

  return cleaned;
}

// ─── Column Mapping ────────────────────────────────────────────────────

/**
 * Bilingual column mapping: Spanish → English (product fields).
 * Key = Spanish header, Value = target field name.
 * Also includes English → English entries for direct matching.
 */
const COLUMN_MAPPINGS: Record<string, string> = {
  nombre: "name",
  name: "name",
  precio: "price",
  price: "price",
  precio_costo: "cost_price",
  cost_price: "cost_price",
  stock: "stock_quantity",
  stock_quantity: "stock_quantity",
  sku: "sku",
  código: "sku",
  descripcion: "description",
  descripción: "description",
  description: "description",
  marca: "brand",
  brand: "brand",
  categoría: "category_id",
  categoria: "category_id",
  category_id: "category_id",
  category: "category_id",
  proveedor: "supplier_id",
  costo: "cost_price",
  iva: "tax_rate",
  impuesto: "tax_rate",
  tax_rate: "tax_rate",
  activo: "status",
  estado: "status",
  status: "status",
  barcode: "barcode",
  código_barra: "barcode",
  codigo_barra: "barcode",
  peso: "weight",
  weight: "weight",
  largo: "length",
  length: "length",
  ancho: "width",
  width: "width",
  alto: "height",
  height: "height",
  imagen: "image_url",
  imágenes: "image_urls",
  imagenes: "image_urls",
  etiquetas: "tags",
  tags: "tags",
  atributos: "attributes",
  tipo_producto: "product_type",
  product_type: "product_type",
};

/**
 * Minimum key length for header→key substring matching in autoMapColumn.
 * Keys shorter than this are exact-match only, preventing false positives
 * like "first_name" matching the short key "name".
 */
const MIN_KEY_SUBSTRING = 5;

/**
 * Minimum header length for key→header substring matching in suggestMappingFromHeaders.
 * Headers shorter than this won't participate in reverse substring matching,
 * preventing false positives while allowing "type" (4 chars) to match "product_type".
 */
const MIN_HEADER_SUBSTRING = 4;

/**
 * Auto-map a single column header to a target field name.
 * - Exact match first (e.g., "nombre" → "name")
 * - Substring fallback: header CONTAINS key (key length ≥ MIN_SUBSTRING_LENGTH)
 *   (e.g., "precio_venta" contains "precio" → "price")
 * When multiple keys match via substring, the LAST match wins.
 * Returns "ignore" if no match found.
 */
export function autoMapColumn(header: string): string {
  const trimmed = header.trim().toLowerCase();
  if (!trimmed) return "ignore";

  let matched: string | null = null;

  // Exact match first
  if (COLUMN_MAPPINGS[trimmed]) {
    matched = COLUMN_MAPPINGS[trimmed];
  }

  // Substring fallback: header contains key (trimmed.includes(key))
  // Only applies to keys at least MIN_KEY_SUBSTRING chars
  // Iterate ALL entries so later matches can overwrite earlier ones
  for (const [key, field] of Object.entries(COLUMN_MAPPINGS)) {
    if (key.length >= MIN_KEY_SUBSTRING && trimmed.includes(key)) {
      matched = field;
    }
  }

  return matched ?? "ignore";
}

/**
 * Auto-map multiple column headers in batch.
 */
export function autoMapAllColumns(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of headers) {
    result[header] = autoMapColumn(header);
  }
  return result;
}

// ─── Suggestion Engine ─────────────────────────────────────────────────

/**
 * Target field list for product imports (10 base fields).
 */
const PRODUCT_FIELDS = [
  "name",
  "price",
  "cost_price",
  "stock_quantity",
  "sku",
  "barcode",
  "description",
  "brand",
  "category_id",
  "status",
];

/**
 * Target field list for customer imports (8 base fields).
 */
const CUSTOMER_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "rut",
  "address",
  "city",
  "region",
];

/**
 * Result of suggestMappingFromHeaders.
 */
export interface MappingSuggestion {
  mapping: Record<string, string>;
  confidence: number;
}

/**
 * Suggest a column mapping based on a list of headers and an entity type.
 * Returns a mapping and a confidence score (0–1).
 *
 * Strategy (3 passes):
 * 1. `autoMapColumn` — exact match + header⊇key substring
 * 2. Bidirectional COLUMN_MAPPINGS pass — key⊇header substring (catches "precio" ↔ "precio_costo")
 * 3. Entity field substring pass — field⊇normalizedHeader for remaining "ignore" headers
 */
export function suggestMappingFromHeaders(
  headers: string[],
  entity: "products" | "customers",
): MappingSuggestion {
  const rawMapping = autoMapAllColumns(headers);
  const targetFields = entity === "products" ? PRODUCT_FIELDS : CUSTOMER_FIELDS;

  for (const header of headers) {
    const trimmed = header.trim().toLowerCase();
    if (!trimmed) continue;

    // Pass 2: reverse COLUMN_MAPPINGS — check if any KEY contains HEADER
    // (catches: "precio" header matches "precio_costo" key → "cost_price",
    //  and "type" (≥4) matches "product_type" key)
    if (trimmed.length >= MIN_HEADER_SUBSTRING) {
      for (const [key, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (key.includes(trimmed)) {
          rawMapping[header] = field;
        }
      }
    }

    // Pass 3: entity field fallback — only for headers still unmapped
    if (rawMapping[header] === "ignore" || rawMapping[header] === undefined) {
      const normalizedHeader = trimmed.replace(/_/g, " ");
      for (const field of targetFields) {
        // Check field⊇normalizedHeader (field contains header substring)
        if (field.includes(normalizedHeader)) {
          rawMapping[header] = field;
          break;
        }
      }
    }
  }

  // Remove "ignore" entries from the mapping
  const filteredMapping: Record<string, string> = {};
  for (const [header, field] of Object.entries(rawMapping)) {
    if (field !== "ignore") {
      filteredMapping[header] = field;
    }
  }

  // Count unique target fields matched
  const matchedFields = new Set(Object.values(filteredMapping));
  const confidence =
    targetFields.length > 0 ? matchedFields.size / targetFields.length : 0;

  return { mapping: filteredMapping, confidence };
}
