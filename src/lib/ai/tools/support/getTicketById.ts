import { z } from "zod";

import { resolveOpticalTicketByNumber } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";

const ticketIdOrNumberSchema = z
  .object({
    ticketId: z.string().uuid().optional(),
    ticketNumber: z.string().optional(),
  })
  .refine((d) => d.ticketId || d.ticketNumber, {
    message: "Provide ticketId or ticketNumber",
  });

export const getTicketByIdTool: ToolDefinition = {
  name: "getTicketById",
  description:
    "Obtener detalle de un ticket de incidentes. Usar ticketNumber (ej. OPT-20250128-0001) visible en la UI o ticketId. Filtra por sucursal del contexto.",
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
        description: "Número de ticket visible en UI (ej. OPT-20250128-0001)",
      },
    },
  },
  zodSchema: ticketIdOrNumberSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = ticketIdOrNumberSchema.parse(params);
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

      const { data: ticket, error: ticketError } = await supabase
        .from("optical_internal_support_tickets")
        .select("*")
        .eq("id", ticketId)
        .eq("organization_id", organizationId)
        .single();

      if (ticketError || !ticket) {
        return {
          success: false,
          error: ticketError?.message || "Ticket no encontrado",
        };
      }

      const { data: messages, error: messagesError } = await supabase
        .from("optical_internal_support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        return { success: false, error: messagesError.message };
      }

      return {
        success: true,
        data: {
          ticket,
          messages: messages || [],
        },
        message: `Ticket ${ticket.ticket_number} obtenido`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to get ticket",
      };
    }
  },
};
