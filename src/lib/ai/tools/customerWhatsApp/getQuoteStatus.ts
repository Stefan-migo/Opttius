import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getQuoteStatusSchema = z.object({
  customerId: z.string().uuid().optional(),
});

export const getQuoteStatusTool: ToolDefinition = {
  name: "getQuoteStatus",
  description:
    "Obtiene el estado de los presupuestos del cliente. Requiere customerId del contexto (cliente WhatsApp).",
  category: "quotes",
  parameters: {
    type: "object",
    properties: {
      customerId: {
        type: "string",
        description: "ID del cliente (opcional si viene del contexto)",
      },
    },
  },
  zodSchema: getQuoteStatusSchema,
  execute: async (params, context): Promise<ToolResult> => {
    const customerId =
      context.customerId ?? (params as { customerId?: string }).customerId;
    if (!customerId) {
      return {
        success: false,
        error: "No se pudo identificar al cliente. Contacta a la sucursal.",
      };
    }

    if (context.customerId && context.customerId !== customerId) {
      return {
        success: false,
        error: "No tienes permiso para consultar esta información.",
      };
    }

    try {
      const { supabase, organizationId } = context;
      const { data: quotes } = await supabase
        .from("quotes")
        .select(
          "id, quote_number, status, total_amount, currency, expiration_date",
        )
        .eq("customer_id", customerId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!quotes || quotes.length === 0) {
        return {
          success: true,
          data: { quotes: [], message: "No tienes presupuestos." },
        };
      }

      const formatted = (quotes as unknown[]).map((q: unknown) => ({
        number: q.quote_number,
        status: q.status,
        total: q.total_amount,
        currency: q.currency ?? "CLP",
        expiresAt: q.expiration_date,
      }));

      return {
        success: true,
        data: {
          quotes: formatted,
          message: `Tienes ${formatted.length} presupuesto(s).`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al consultar presupuestos",
      };
    }
  },
};
