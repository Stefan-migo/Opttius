import { z } from "zod";

import { parseImportFile } from "../../utils/file-parser";
import { resolveBranchByName } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";
import { analyzeImportFileTool, downloadFile } from "./analyzeFile";
import { executeCustomerImport } from "./importCustomers";
import { executeProductImport } from "./importProducts";

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

export const executeBulkImportTool: ToolDefinition = {
  name: "executeBulkImport",
  description:
    "Execute bulk import of customers or products from an uploaded file. Requires column mapping from analyzeImportFile. Use requiresConfirmation - ask user to confirm before proceeding.",
  category: "import",
  requiresConfirmation: true,
  minRole: "admin",
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
      const { supabase, organizationId, currentBranchId, userData, currency } =
        context;

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

      const buffer = await downloadFile(validated.fileId, supabase);
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

      if (validated.entityType === "customers") {
        if (!resolvedBranchId) {
          return {
            success: false,
            error: "branchId es obligatorio para importar clientes.",
          };
        }
        return executeCustomerImport(
          supabase,
          organizationId,
          resolvedBranchId,
          headers,
          rows,
          validated.columnMapping,
        );
      }

      return executeProductImport(
        supabase,
        organizationId,
        resolvedBranchId || null,
        headers,
        rows,
        validated.columnMapping,
        currency || "CLP",
      );
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to execute import",
      };
    }
  },
};

export const importBulkTools: ToolDefinition[] = [
  analyzeImportFileTool,
  executeBulkImportTool,
];
