import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getTicketsSchema = z.object({
  status: z
    .enum([
      "open",
      "assigned",
      "in_progress",
      "waiting_customer",
      "resolved",
      "closed",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  branchName: z
    .string()
    .optional()
    .describe("Sucursal por nombre (ej. Casa Matriz)"),
  limit: z.number().default(20),
});

export const getTicketsTool: ToolDefinition = {
  name: "getTickets",
  description:
    "Obtener lista de tickets de incidentes (registro de problemas con clientes). Filtra por sucursal según la sucursal seleccionada del usuario. Super Admin en vista global puede ver todos.",
  category: "support",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: [
          "open",
          "assigned",
          "in_progress",
          "waiting_customer",
          "resolved",
          "closed",
        ],
      },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      branchName: {
        type: "string",
        description:
          "Nombre de sucursal (ej. Casa Matriz). Si no se indica, usa la sucursal del contexto.",
      },
      limit: { type: "number", default: 20 },
    },
  },
  zodSchema: getTicketsSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getTicketsSchema.parse(params);
      const { supabase, organizationId, currentBranchId, userData } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let branchIdToFilter: string | null = null;
      if (validated.branchName) {
        const { resolveBranchByName } = await import("../resolvers");
        branchIdToFilter = await resolveBranchByName(
          supabase,
          organizationId,
          validated.branchName,
        );
        if (!branchIdToFilter) {
          return {
            success: false,
            error: `Sucursal "${validated.branchName}" no encontrada`,
          };
        }
      } else if (currentBranchId && currentBranchId !== "global") {
        branchIdToFilter = currentBranchId;
      }
      // Si branchIdToFilter es null: Super Admin en vista global ve todas las sucursales

      if (!branchIdToFilter && !userData?.isSuperAdmin) {
        return {
          success: false,
          error:
            "Debe seleccionar una sucursal para consultar tickets de incidentes",
        };
      }

      let query = supabase
        .from("optical_internal_support_tickets")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(validated.limit);

      if (branchIdToFilter) {
        query = query.eq("branch_id", branchIdToFilter);
      }

      if (validated.status) {
        query = query.eq("status", validated.status);
      }

      if (validated.priority) {
        query = query.eq("priority", validated.priority);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          tickets: data || [],
        },
        message: `Encontrados ${data?.length || 0} tickets de incidentes`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to get tickets",
      };
    }
  },
};
