import { z } from "zod";

import { resolveOpticalTicketByNumber } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";

const createTicketResponseSchema = z
  .object({
    ticketId: z.string().uuid().optional(),
    ticketNumber: z.string().optional(),
    message: z.string().min(1),
    isInternal: z.boolean().default(false),
  })
  .refine((d) => d.ticketId || d.ticketNumber, {
    message: "Provide ticketId or ticketNumber",
  });

export const createTicketResponseTool: ToolDefinition = {
  name: "createTicketResponse",
  description:
    "Agregar respuesta o nota a un ticket de incidentes. Usar ticketNumber (visible en UI) o ticketId. Respeta la sucursal del contexto.",
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
      message: { type: "string", description: "Mensaje de respuesta" },
      isInternal: {
        type: "boolean",
        default: false,
        description: "Marcar como nota interna",
      },
    },
    required: ["message"],
  },
  zodSchema: createTicketResponseSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = createTicketResponseSchema.parse(params);
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

      const { data: ticket } = await supabase
        .from("optical_internal_support_tickets")
        .select("id")
        .eq("id", ticketId)
        .eq("organization_id", organizationId)
        .single();

      if (!ticket) {
        return {
          success: false,
          error: "Ticket no encontrado o sin acceso",
        };
      }

      const { data: adminUser }: unknown = await supabase
        .from("admin_users")
        .select("email, role")
        .eq("id", context.userId)
        .single();

      const senderName = adminUser?.email?.split("@")[0] || "Usuario";
      const senderEmail = adminUser?.email || "";
      const senderRole = adminUser?.role || "admin";

      const { data: newMessage, error: messageError }: unknown = await supabase
        .from("optical_internal_support_messages")
        .insert({
          ticket_id: ticketId,
          message: validated.message,
          is_internal: validated.isInternal,
          sender_id: context.userId,
          sender_name: senderName,
          sender_email: senderEmail,
          sender_role: senderRole,
          message_type: validated.isInternal ? "note" : "message",
        })
        .select()
        .single();

      if (messageError) {
        return { success: false, error: messageError.message };
      }

      await supabase
        .from("optical_internal_support_tickets")
        .update({
          last_response_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      return {
        success: true,
        data: newMessage,
        message: "Respuesta agregada al ticket",
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to create ticket response",
      };
    }
  },
};
