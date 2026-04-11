import { z } from "zod";

import { createServiceRoleClient } from "@/utils/supabase/server";

import { parseImportFile } from "../utils/file-parser";
import { resolveBranchByName } from "./resolvers";
import type { ToolDefinition, ToolResult } from "./types";

const analyzeImportFileSchema = z.object({
  fileId: z
    .string()
    .describe("Storage path of the uploaded file (e.g. org_id/uuid.csv)"),
  entityType: z
    .enum(["customers", "products"])
    .describe("Type of entities to import"),
});

const executeBulkImportSchema = z.object({
  fileId: z.string(),
  entityType: z.enum(["customers", "products"]),
  columnMapping: z
    .record(z.string())
    .describe(
      "Map of file column names to Opttius field names. Keys MUST be exact column headers from the file.",
    ),
  branchId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "Branch ID where to import. Required for customers. If omitted, uses context.currentBranchId when available.",
    ),
  branchName: z
    .string()
    .optional()
    .describe("Branch name (alternative to branchId, e.g. 'Sucursal Centro')"),
});

async function downloadFile(
  fileId: string,
  supabase: unknown,
): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage
    .from("import-temp")
    .download(fileId);

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
  if (!data) {
    throw new Error("File not found");
  }
  return await data.arrayBuffer();
}

export const importBulkTools: ToolDefinition[] = [
  {
    name: "analyzeImportFile",
    description:
      "Analyze an uploaded CSV or Excel file to suggest column mapping for bulk import. Use when the user has attached a file for importing customers or products. Returns suggested mapping, sample rows, and warnings.",
    category: "import",
    parameters: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "Storage path of the file (from the user's message)",
        },
        entityType: {
          type: "string",
          enum: ["customers", "products"],
          description: "Type of entities to import",
        },
      },
      required: ["fileId", "entityType"],
    },
    zodSchema: analyzeImportFileSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = analyzeImportFileSchema.parse(params);
        const serviceSupabase = createServiceRoleClient();

        const buffer = await downloadFile(validated.fileId, serviceSupabase);
        const ext = validated.fileId.includes(".xlsx")
          ? "xlsx"
          : validated.fileId.includes(".xls")
            ? "xls"
            : "csv";
        const { headers, rows } = await parseImportFile(buffer, `file.${ext}`);

        const sampleRows = rows.slice(0, 5);

        const customerFields = [
          "first_name",
          "last_name",
          "email",
          "phone",
          "rut",
          "address_line_1",
          "city",
          "country",
        ];
        const productFields = [
          "name",
          "price",
          "description",
          "sku",
          "inventory_quantity",
        ];

        const targetFields =
          validated.entityType === "customers" ? customerFields : productFields;

        const suggestedMapping: Record<string, string> = {};
        const warnings: string[] = [];

        const headerLower = headers.map((h) => h.toLowerCase());
        for (const field of targetFields) {
          const idx = headerLower.findIndex(
            (h) =>
              h.includes(field) ||
              h.includes(field.replace("_", " ")) ||
              field.includes(h.replace(" ", "_")),
          );
          if (idx >= 0) {
            suggestedMapping[headers[idx]] = field;
          }
        }

        if (validated.entityType === "customers") {
          const hasFirst =
            headers.some((h) =>
              /nombre|first|nombre_pila|nombre_pila/i.test(h),
            ) || headerLower.some((h) => h.includes("first"));
          const hasLast =
            headers.some((h) =>
              /apellido|last|nombre_familia|apellido/i.test(h),
            ) || headerLower.some((h) => h.includes("last"));
          if (!hasFirst || !hasLast) {
            suggestionsFromHeaders(headers, suggestedMapping, "first_name", [
              "nombre",
              "first_name",
              "nombre_pila",
              "name",
            ]);
            suggestionsFromHeaders(headers, suggestedMapping, "last_name", [
              "apellido",
              "last_name",
              "nombre_familia",
            ]);
          }
          if (!Object.values(suggestedMapping).includes("first_name")) {
            warnings.push("first_name is required for customers");
          }
          if (!Object.values(suggestedMapping).includes("last_name")) {
            warnings.push("last_name is required for customers");
          }
        } else {
          suggestionsFromHeaders(headers, suggestedMapping, "name", [
            "nombre",
            "name",
            "producto",
          ]);
          suggestionsFromHeaders(headers, suggestedMapping, "price", [
            "precio",
            "price",
          ]);
        }

        return {
          success: true,
          data: {
            suggestedMapping,
            sampleRows,
            headers,
            rowCount: rows.length,
            confidence:
              Object.keys(suggestedMapping).length / targetFields.length,
            warnings,
          },
          message: `Analyzed ${rows.length} rows. Suggested mapping for ${validated.entityType}.`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: error.message || "Failed to analyze file",
        };
      }
    },
  },
  {
    name: "executeBulkImport",
    description:
      "Execute bulk import of customers or products from an uploaded file. Requires column mapping from analyzeImportFile. Use requiresConfirmation - ask user to confirm before proceeding.",
    category: "import",
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string" },
        entityType: {
          type: "string",
          enum: ["customers", "products"],
        },
        columnMapping: {
          type: "object",
          description: "Map file column names to Opttius field names",
        },
        branchId: {
          type: "string",
          description:
            "Branch UUID (required for customers). Use context.currentBranchId if user has a branch selected.",
        },
        branchName: {
          type: "string",
          description: "Branch name (alternative to branchId)",
        },
      },
      required: ["fileId", "entityType", "columnMapping"],
    },
    zodSchema: executeBulkImportSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = executeBulkImportSchema.parse(params);
        const {
          supabase,
          organizationId,
          currentBranchId,
          userData,
          currency,
        } = context;
        const serviceSupabase = createServiceRoleClient();

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing",
          };
        }

        // Resolve branchId: params > branchName > context.currentBranchId
        let resolvedBranchId = validated.branchId;
        if (!resolvedBranchId && validated.branchName) {
          resolvedBranchId =
            (await resolveBranchByName(
              supabase,
              organizationId,
              validated.branchName,
            )) ?? undefined;
        }
        if (!resolvedBranchId || resolvedBranchId === "global") {
          if (currentBranchId && currentBranchId !== "global") {
            resolvedBranchId = currentBranchId;
          } else if (userData?.isSuperAdmin) {
            return {
              success: false,
              error:
                "Vista global activa. Por favor, selecciona una sucursal específica en el selector de sucursales antes de ejecutar la importación, o indica el ID de la sucursal en tu mensaje.",
            };
          } else {
            return {
              success: false,
              error:
                "Se requiere branchId para la importación. Selecciona una sucursal en el selector o indica la sucursal de destino.",
            };
          }
        }

        if (validated.entityType === "customers" && !resolvedBranchId) {
          return {
            success: false,
            error: "branchId es obligatorio para importar clientes.",
          };
        }

        const buffer = await downloadFile(validated.fileId, serviceSupabase);
        const ext = validated.fileId.includes(".xlsx")
          ? "xlsx"
          : validated.fileId.includes(".xls")
            ? "xls"
            : "csv";
        const { headers, rows } = await parseImportFile(buffer, `file.${ext}`);

        // Validate columnMapping keys match file headers (case-insensitive, trim)
        const headerSet = new Set(
          headers.map((h) =>
            String(h || "")
              .trim()
              .toLowerCase(),
          ),
        );
        const invalidKeys: string[] = [];
        for (const fileCol of Object.keys(validated.columnMapping)) {
          const normalized = String(fileCol || "")
            .trim()
            .toLowerCase();
          const matchingHeader = headers.find(
            (h) =>
              String(h || "")
                .trim()
                .toLowerCase() === normalized,
          );
          if (!matchingHeader && !headerSet.has(normalized)) {
            invalidKeys.push(fileCol);
          }
        }
        if (invalidKeys.length > 0) {
          return {
            success: false,
            error: `Columnas del mapping no encontradas en el archivo: ${invalidKeys.join(", ")}. Headers del archivo: ${headers.join(", ")}. El columnMapping debe ser { "Header del archivo": "campo_opttius" } (clave = nombre exacto de la columna en el archivo).`,
          };
        }

        const branchIdToUse = resolvedBranchId;
        let imported = 0;
        const failed: Array<{ row: number; error: string }> = [];

        // Resolve column key: mapping key may differ by case/trim from actual header
        const resolveVal = (
          row: Record<string, string | number | null>,
          fileCol: string,
        ): string | number | null => {
          const normalized = String(fileCol || "")
            .trim()
            .toLowerCase();
          const match = headers.find(
            (h) =>
              String(h || "")
                .trim()
                .toLowerCase() === normalized,
          );
          return match != null ? (row[match] ?? null) : null;
        };

        if (validated.entityType === "customers") {
          for (let i = 0; i < rows.length; i++) {
            try {
              const row = rows[i];
              const mapped: Record<string, unknown> = {};
              for (const [fileCol, opttiusField] of Object.entries(
                validated.columnMapping,
              )) {
                const val = resolveVal(row, fileCol);
                if (val !== null && val !== undefined && String(val).trim()) {
                  mapped[opttiusField] = String(val).trim();
                }
              }

              const firstName =
                mapped.first_name || mapped.name?.split(" ")[0] || "Cliente";
              const lastName =
                mapped.last_name ||
                mapped.name?.split(" ").slice(1).join(" ") ||
                "Sin apellido";

              const { error } = await serviceSupabase.from("customers").insert({
                branch_id: branchIdToUse,
                organization_id: organizationId,
                first_name: firstName,
                last_name: lastName,
                email: mapped.email || null,
                phone: mapped.phone || null,
                rut: mapped.rut || null,
                address_line_1: mapped.address_line_1 || null,
                city: mapped.city || null,
                country: mapped.country || null,
                is_active: true,
              });

              if (error) {
                failed.push({ row: i + 2, error: error.message });
              } else {
                imported++;
              }
            } catch (e: unknown) {
              failed.push({
                row: i + 2,
                error: e?.message || "Validation error",
              });
            }
          }
        } else {
          for (let i = 0; i < rows.length; i++) {
            try {
              const row = rows[i];
              const mapped: Record<string, unknown> = {};
              for (const [fileCol, opttiusField] of Object.entries(
                validated.columnMapping,
              )) {
                const val = resolveVal(row, fileCol);
                if (val !== null && val !== undefined && String(val).trim()) {
                  mapped[opttiusField] = String(val).trim();
                }
              }

              const name = mapped.name || mapped.nombre || "Producto";
              const price =
                parseFloat(mapped.price || mapped.precio || "0") || 0;

              const slug =
                (name as string)
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "") || `product-${Date.now()}`;

              const { data: insertedProduct, error } = await serviceSupabase
                .from("products")
                .insert({
                  organization_id: organizationId,
                  branch_id: branchIdToUse || null,
                  name,
                  price,
                  currency: currency || "CLP",
                  description: mapped.description || null,
                  slug,
                  status: "draft",
                  inventory_quantity:
                    parseInt(mapped.inventory_quantity || "0", 10) || 0,
                })
                .select("id")
                .single();

              if (error) {
                failed.push({ row: i + 2, error: error.message });
              } else {
                imported++;
                // Create product_branch_stock when branch is specified
                const qty = parseInt(mapped.inventory_quantity || "0", 10) || 0;
                if (branchIdToUse && insertedProduct?.id) {
                  const now = new Date().toISOString();
                  await serviceSupabase.from("product_branch_stock").upsert(
                    {
                      product_id: insertedProduct.id,
                      branch_id: branchIdToUse,
                      quantity: qty,
                      reserved_quantity: 0,
                      low_stock_threshold: 5,
                      created_at: now,
                      updated_at: now,
                    },
                    { onConflict: "product_id, branch_id" },
                  );
                }
              }
            } catch (e: unknown) {
              failed.push({
                row: i + 2,
                error: e?.message || "Validation error",
              });
            }
          }
        }

        return {
          success: true,
          data: {
            imported,
            failed: failed.length,
            errors: failed.slice(0, 10),
          },
          message: `Imported ${imported} ${validated.entityType}. ${failed.length} failed.`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: error.message || "Failed to execute import",
        };
      }
    },
  },
];

function suggestionsFromHeaders(
  headers: string[],
  mapping: Record<string, string>,
  targetField: string,
  possibleNames: string[],
) {
  for (const h of headers) {
    const lower = h.toLowerCase();
    if (possibleNames.some((n) => lower.includes(n))) {
      mapping[h] = targetField;
      break;
    }
  }
}
