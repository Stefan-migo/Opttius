import { z } from "zod";

import type { Database, SupabaseClient } from "@/types/supabase";

import { parseImportFile } from "../../utils/file-parser";
import type { ToolDefinition, ToolResult } from "../types";

const analyzeImportFileSchema = z.object({
  fileId: z
    .string()
    .describe("Storage path of the uploaded file (e.g. org_id/uuid.csv)"),
  entityType: z
    .enum(["customers", "products"])
    .describe("Type of entities to import"),
});

export async function downloadFile(
  fileId: string,
  supabase: SupabaseClient<Database>,
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

export const analyzeImportFileTool: ToolDefinition = {
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
      const { supabase } = context;

      const buffer = await downloadFile(validated.fileId, supabase);
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
        error: error instanceof Error ? error.message : "Failed to analyze file",
      };
    }
  },
};
