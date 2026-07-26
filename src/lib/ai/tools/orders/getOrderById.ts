import { z } from "zod";

import { resolveOrderByNumber } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";

const getOrderByIdSchema = z
  .object({
    orderId: z.string().uuid().optional(),
    orderNumber: z.string().optional(),
  })
  .refine((d) => d.orderId || d.orderNumber, {
    message: "Provide orderId or orderNumber",
  });

export const getOrderByIdTool: ToolDefinition = {
  name: "getOrderById",
  description:
    "Get detailed information about a specific order by ID or order_number (visible in UI).",
  category: "orders",
  parameters: {
    type: "object",
    properties: {
      orderId: {
        type: "string",
        description: "Order UUID (optional if orderNumber provided)",
      },
      orderNumber: {
        type: "string",
        description: "Order number visible in UI (e.g. ORD-2025-001)",
      },
    },
  },
  zodSchema: getOrderByIdSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getOrderByIdSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let orderId = validated.orderId;
      if (!orderId && validated.orderNumber) {
        orderId =
          (await resolveOrderByNumber(
            supabase,
            organizationId,
            validated.orderNumber,
          )) ?? undefined;
        if (!orderId) {
          return {
            success: false,
            error: `Orden con número "${validated.orderNumber}" no encontrada`,
          };
        }
      } else if (!orderId) {
        return {
          success: false,
          error: "Proporciona orderId o orderNumber",
        };
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
            *,
            order_items (
              id,
              product_id,
              product_name,
              variant_title,
              quantity,
              unit_price,
              total_price
            )

          `,
        )
        .eq("id", orderId)
        .eq("organization_id", organizationId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: "Order not found" };
      }

      return {
        success: true,
        data,
        message: `Retrieved order ${data.order_number}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get order",
      };
    }
  },
};
