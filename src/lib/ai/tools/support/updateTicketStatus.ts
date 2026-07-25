import { z } from "zod";

import { resolveOpticalTicketByNumber } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";

const updateTicketStatusSchema = z
  .object({
    ticketId: z.string().uuid().optional(),
    ticketNumber: z.string().optional(),
    status: z.enum([
      "open",
      "assigned",
      "in_progress",
      "waiting_customer",
      "resolved",
      "closed",
    ]),
  })
  .refine((d) => d.ticketId || d.ticketNumber, {
    message: "Provide ticketId or ticketNumber",
  });

export const updateTicketStatusTool: ToolDefinition = {
  name: "updateTicketStatus",
  description:
    "Actualizar estado de un ticket de incidentes. Usar ticketNumber (visible en UI) o ticketId. Respeta la sucursal del contexto.",
  category: "support",
  parameters: {
    type: "object",
    properties: {
      ticketId: {
        type: "string",
        description: "Ticket UUID (opcional si se proporciona ticketNumber)",
      },
      ticketNumber: {
        type: "string",
        description: "Número de ticket visible en UI",
      },
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
    },
    required: ["status"],
  },
  zodSchema: updateTicketStatusSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = updateTicketStatusSchema.parse(params);
      const { supabase, organizationId, currentBranchId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let ticketId = validated.ticketId;
      if (!ticketId && validated.ticketNumber) {
        const branchId =
          currentBranchId && currentBranchId !== "global"
            ? currentBranchId
            : undefined;
        ticketId =
          (await resolveOpticalTicketByNumber(
            supabase,
            validated.ticketNumber,
            organizationId,
            branchId,
          )) ?? undefined;
        if (!ticketId) {
          return {
            success: false,
            error: `Ticket con número "${validated.ticketNumber}" no encontrado`,
          };
        }
      } else if (!ticketId) {
        return {
          success: false,
          error: "Proporciona ticketId o ticketNumber",
        };
      }

      const updateData: Record<string, unknown> = {
        status: validated.status,
        updated_at: new Date().toISOString(),
      };

      if (validated.status === "resolved" || validated.status === "closed") {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = context.userId;
      }

      const { data, error } = await supabase
        .from("optical_internal_support_tickets")
        // @ts-expect-error — SupabaseClient<unknown>, update data type is dynamic
        .update(updateData)
        .eq("id", ticketId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data,
        message: `Estado del ticket actualizado a ${validated.status}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update ticket status",
      };
    }
  },
};
