# Inventory Module

## Import System

The import system provides a unified way to import products (and customers) into Opttius from external files or data sources.

### Architecture

```
User/Wizard/AI Agent
        │
        ▼
POST /api/admin/products/import  (unified endpoint)
        │
        ├── multipart/form-data  ←  File upload (CSV/XLSX)
        │       │
        │       ├── src/lib/ai/utils/file-parser.ts  →  parseCSV / parseExcel
        │       │
        │       └── Inline processing in route → creates/updates products + stock
        │
        └── application/json    ←  JSON body (programmatic, deprecated path)
                │
                └── Redirected from /api/admin/products/import-json (deprecated)
```

### Shared Mapping Module

**File**: `src/lib/inventory/import-mapping.ts`

Exports pure helper functions used by both the Wizard UI and AI Agent:

| Export                                           | Purpose                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `parseCSVLine(line)`                             | Parse a single CSV line, handling quoted fields, escaped quotes, empty fields, and trailing commas |
| `parseBoolean(value)`                            | Parse truthy strings (`true`, `1`, `yes`, `sí`, `si`, `y`) — case insensitive                      |
| `parseArray(value)`                              | Parse arrays from JSON array strings or semicolon-separated values                                 |
| `generateSlug(name)`                             | Generate URL-safe slug from product name (removes accents, special chars)                          |
| `autoMapColumn(header)`                          | Auto-detect field mapping for a column header (exact match first, then substring)                  |
| `autoMapAllColumns(headers)`                     | Batch auto-mapping of multiple headers                                                             |
| `suggestMappingFromHeaders(headers, entityType)` | Suggest full mapping for products or customers with confidence score                               |

Bilingual column coverage: headers in both Spanish (e.g. `nombre`, `precio`, `stock`) and English (e.g. `name`, `price`, `stock_quantity`) are supported.

### Import Service

**File**: `src/lib/inventory/import-service.ts`

Shared service layer with three processing modes:

| Mode     | Behavior                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------- |
| `create` | Insert new products. If slug exists, returns an error. Stock created via `update_product_stock` RPC. |
| `update` | Update existing products (matched by slug or SKU). Stock adjusted differentially.                    |
| `upsert` | Update existing products, create new ones. Combination of create + update logic.                     |

Stock management always goes through the `update_product_stock` RPC function, never direct table inserts on `product_branch_stock`.

### Unified Endpoint

**Route**: `POST /api/admin/products/import`

**File**: `src/app/api/admin/products/import/route.ts`

Accepts both `multipart/form-data` (file upload) and `application/json` (programmatic).

Standardized response format:

```json
{
  "success": true,
  "summary": {
    "total_processed": 10,
    "created": 7,
    "updated": 2,
    "skipped": 1,
    "errors_count": 1,
    "warnings_count": 2
  },
  "results": {
    "errors": ["Línea 4: Nombre es requerido"],
    "warnings": ["Línea 7: Categoría no encontrada"]
  }
}
```

### Deprecated Endpoint

**Route**: `POST /api/admin/products/import-json`

**Status**: DEPRECATED — returns `Sunset: Sat, 01 Nov 2026 00:00:00 GMT` header.

Replaced by the unified `/api/admin/products/import` endpoint. The deprecated route still works for existing callers and returns the same response format, but will be removed in Nov 2026.

### Channels Consuming the Import System

| Channel                                                            | How It Uses It                                                                                                                                                 |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wizard UI** (`/admin/products/import`)                           | 4-step flow: upload → map → clean → import. Uses `importProductsFile` from `productService.ts` with multipart upload.                                          |
| **AI Agent** (`src/lib/ai/tools/importBulk.ts`)                    | Tool-calling interface. `analyzeImportFile` suggests mapping, `executeBulkImport` runs the import via service role client.                                     |
| **productService.ts** (`importProductsFile`, `importProductsJson`) | Client-side service methods. `importProductsFile` handles file upload (CSV/XLSX), `importProductsJson` handles JSON payload. Both target the unified endpoint. |

### File Reference

| File                                              | Role                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/lib/inventory/import-mapping.ts`             | Pure helper functions for parsing and mapping                           |
| `src/lib/inventory/import-service.ts`             | Shared service with create/update/upsert modes                          |
| `src/lib/ai/utils/file-parser.ts`                 | CSV and Excel file parsing                                              |
| `src/app/api/admin/products/import/route.ts`      | Unified import API endpoint                                             |
| `src/app/api/admin/products/import-json/route.ts` | Deprecated JSON import endpoint                                         |
| `src/lib/api/services/productService.ts`          | Client-side import methods (`importProductsFile`, `importProductsJson`) |
| `src/lib/ai/tools/importBulk.ts`                  | AI Agent tool definitions for import                                    |
