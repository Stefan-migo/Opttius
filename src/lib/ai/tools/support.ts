import { z } from "zod";

import { resolveOpticalTicketByNumber } from "./resolvers";
import type { ToolDefinition, ToolResult } from "./types";

// Optical internal support uses: open, assigned, in_progress, waiting_customer, resolved, closed
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

const ticketIdOrNumberSchema = z
  .object({
    ticketId: z.string().uuid().optional(),
    ticketNumber: z.string().optional(),
  })
  .refine((d) => d.ticketId || d.ticketNumber, {
    message: "Provide ticketId or ticketNumber",
  });

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

export const supportTools: ToolDefinition[] = [
  {
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
          const { resolveBranchByName } = await import("./resolvers");
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
          error: error.message || "Failed to get tickets",
        };
      }
    },
  },
  {
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
          error: error.message || "Failed to get ticket",
        };
      }
    },
  },
  {
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
          (updateData as unknown).resolved_at = new Date().toISOString();
          (updateData as unknown).resolved_by = context.userId;
        }

        const { data, error } = await supabase
          .from("optical_internal_support_tickets")
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
          error: error.message || "Failed to update ticket status",
        };
      }
    },
  },
  {
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

        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("email, role")
          .eq("id", context.userId)
          .single();

        const senderName = adminUser?.email?.split("@")[0] || "Usuario";
        const senderEmail = adminUser?.email || "";
        const senderRole = adminUser?.role || "admin";

        const { data: newMessage, error: messageError } = await supabase
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
          error: error.message || "Failed to create ticket response",
        };
      }
    },
  },
];
