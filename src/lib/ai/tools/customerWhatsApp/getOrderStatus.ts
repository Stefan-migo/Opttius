import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getOrderStatusSchema = z.object({
  customerId: z.string().uuid().optional(),
});

export const getOrderStatusTool: ToolDefinition = {
  name: "getOrderStatus",
  description:
    "Obtiene el estado de las órdenes de trabajo (lentes) del cliente. Requiere customerId del contexto (cliente WhatsApp).",
  category: "orders",
  parameters: {
    type: "object",
    properties: {
      customerId: {
        type: "string",
        description: "ID del cliente (opcional si viene del contexto)",
      },
    },
  },
  zodSchema: getOrderStatusSchema,
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
      const { data: orders } = await supabase
        .from("lab_work_orders")
        .select(
          "id, work_order_number, status, total_amount, currency, branch_id, branch:branches(name), ready_at, delivered_at",
        )
        .eq("customer_id", customerId)
        .eq("organization_id", organizationId)
        .order("work_order_date", { ascending: false })
        .limit(5);

      if (!orders || orders.length === 0) {
        return {
          success: true,
          data: { orders: [], message: "No tienes órdenes." },
        };
      }

      const formatted = orders.map((o) => {
        // @ts-expect-error — SupabaseClient<unknown>, orders type is dynamic
        const branch = o.branch as { name?: string } | null;
        return {
          // @ts-expect-error — SupabaseClient<unknown>, orders type is dynamic
          number: o.work_order_number,
          // @ts-expect-error — SupabaseClient<unknown>, orders type is dynamic
          status: o.status,
          // @ts-expect-error — SupabaseClient<unknown>, orders type is dynamic
          total: o.total_amount,
          // @ts-expect-error — SupabaseClient<unknown>, orders type is dynamic
          currency: o.currency ?? "CLP",
          branch: branch?.name ?? "Sucursal",
          // @ts-expect-error — SupabaseClient<unknown>, orders type is dynamic
          readyAt: o.ready_at,
          // @ts-expect-error — SupabaseClient<unknown>, orders type is dynamic
          deliveredAt: o.delivered_at,
        };
      });

      return {
        success: true,
        data: {
          orders: formatted,
          message: `Tienes ${formatted.length} orden(es).`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al consultar órdenes",
      };
    }
  },
};
