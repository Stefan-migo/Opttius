/**
 * AI Agent tools for quotes
 */
import { z } from "zod";

import { sendQuoteEmailToClient } from "@/lib/email/send-quote-email";

import { resolveQuoteByNumber } from "./resolvers";
import type { ToolDefinition, ToolResult } from "./types";

const sendQuoteByEmailSchema = z
  .object({
    quoteId: z.string().uuid().optional(),
    quoteNumber: z.string().optional(),
    email: z.string().email("Email válido requerido"),
  })
  .refine((d) => d.quoteId || d.quoteNumber, {
    message: "Provide quoteId or quoteNumber",
  });

export const quoteTools: ToolDefinition[] = [
  {
    name: "sendQuoteByEmail",
    description:
      "Send a quote (presupuesto) by email to a client. Use quoteNumber (e.g. COT-2025-010) - visible in UI - or quoteId.",
    category: "quotes",
    parameters: {
      type: "object",
      properties: {
        quoteId: {
          type: "string",
          description: "Quote UUID (optional if quoteNumber provided)",
        },
        quoteNumber: {
          type: "string",
          description: "Quote number visible in UI (e.g. COT-2025-010)",
        },
        email: { type: "string", description: "Recipient email address" },
      },
      required: ["email"],
    },
    zodSchema: sendQuoteByEmailSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = sendQuoteByEmailSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        let quoteId = validated.quoteId;
        if (!quoteId && validated.quoteNumber) {
          quoteId =
            (await resolveQuoteByNumber(
              supabase,
              organizationId,
              validated.quoteNumber,
            )) ?? undefined;
          if (!quoteId) {
            return {
              success: false,
              error: `Presupuesto con número "${validated.quoteNumber}" no encontrado`,
            };
          }
        } else if (!quoteId) {
          return {
            success: false,
            error: "Proporciona quoteId o quoteNumber",
          };
        }

        const result = await sendQuoteEmailToClient(quoteId, validated.email, {
          organizationId,
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error || "Error al enviar el presupuesto",
          };
        }

        return {
          success: true,
          data: { emailId: result.emailId },
          message: `Presupuesto enviado correctamente a ${validated.email}`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to send quote by email",
        };
      }
    },
  },
];
