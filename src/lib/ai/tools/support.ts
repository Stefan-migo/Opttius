import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";

const getTicketsSchema = z.object({
  status: z
    .enum(["open", "in_progress", "pending_customer", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  limit: z.number().default(20),
});

const getTicketByIdSchema = z.object({
  ticketId: z.string().uuid(),
});

const updateTicketStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum([
    "open",
    "in_progress",
    "pending_customer",
    "resolved",
    "closed",
  ]),
});

const createTicketResponseSchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().min(1),
  isInternal: z.boolean().default(false),
});

export const supportTools: ToolDefinition[] = [
  {
    name: "getTickets",
    description:
      "Get list of support tickets with optional filters for status and priority.",
    category: "support",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [
            "open",
            "in_progress",
            "pending_customer",
            "resolved",
            "closed",
          ],
        },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        limit: { type: "number", default: 20 },
      },
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getTicketsSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        let query = supabase
          .from("support_tickets")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(validated.limit);

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
          message: `Found ${data?.length || 0} support tickets`,
        };
      } catch (error: any) {
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
      "Get detailed information about a specific support ticket including messages.",
    category: "support",
    parameters: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket UUID" },
      },
      required: ["ticketId"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getTicketByIdSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data: ticket, error: ticketError } = await supabase
          .from("support_tickets")
          .select("*")
          .eq("id", validated.ticketId)
          .single();

        if (ticketError) {
          return { success: false, error: ticketError.message };
        }

        const { data: messages, error: messagesError } = await supabase
          .from("support_messages")
          .select("*")
          .eq("ticket_id", validated.ticketId)
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
          message: `Retrieved ticket ${ticket.ticket_number}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get ticket",
        };
      }
    },
  },
  {
    name: "updateTicketStatus",
    description: "Update the status of a support ticket.",
    category: "support",
    parameters: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket UUID" },
        status: {
          type: "string",
          enum: [
            "open",
            "in_progress",
            "pending_customer",
            "resolved",
            "closed",
          ],
        },
      },
      required: ["ticketId", "status"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = updateTicketStatusSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const updateData: any = {
          status: validated.status,
          updated_at: new Date().toISOString(),
        };

        if (validated.status === "resolved" || validated.status === "closed") {
          updateData.resolved_at = new Date().toISOString();
          updateData.resolved_by = context.userId;
        }

        const { data, error } = await supabase
          .from("support_tickets")
          .update(updateData)
          .eq("id", validated.ticketId)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          data,
          message: `Ticket status updated to ${validated.status}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to update ticket status",
        };
      }
    },
  },
  {
    name: "createTicketResponse",
    description: "Add a response message to a support ticket.",
    category: "support",
    parameters: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket UUID" },
        message: { type: "string", description: "Response message" },
        isInternal: {
          type: "boolean",
          default: false,
          description: "Mark as internal note",
        },
      },
      required: ["ticketId", "message"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = createTicketResponseSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        // Verify ticket ownership first
        const { data: ticket } = await supabase
          .from("support_tickets")
          .select("id")
          .eq("id", validated.ticketId)
          .single();

        if (!ticket) {
          return { success: false, error: "Ticket not found or access denied" };
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", context.userId)
          .single();

        const { data: message, error: messageError } = await supabase
          .from("support_messages")
          .insert({
            ticket_id: validated.ticketId,
            message: validated.message,
            is_internal: validated.isInternal,
            is_from_customer: false,
            sender_id: context.userId,
            sender_name: profile
              ? `${profile.first_name} ${profile.last_name || ""}`.trim()
              : "Admin",
            sender_email: profile?.email || "",
          })
          .select()
          .single();

        if (messageError) {
          return { success: false, error: messageError.message };
        }

        await supabase
          .from("support_tickets")
          .update({
            last_response_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", validated.ticketId);

        return {
          success: true,
          data: message,
          message: `Response added to ticket`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to create ticket response",
        };
      }
    },
  },
];
