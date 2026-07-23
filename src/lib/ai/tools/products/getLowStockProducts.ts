import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getLowStockProductsSchema = z.object({
  threshold: z.number().default(5),
  limit: z.number().default(20),
});

export const getLowStockProductsTool: ToolDefinition = {
  name: "getLowStockProducts",
  description: "Get products with inventory below the specified threshold.",
  category: "products",
  parameters: {
    type: "object",
    properties: {
      threshold: {
        type: "number",
        description: "Stock threshold",
        default: 5,
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
        default: 20,
      },
    },
  },
  zodSchema: getLowStockProductsSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getLowStockProductsSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const { data, error } = await supabase
        .from("products")
        .select("id, name, inventory_quantity, status")
        .eq("organization_id", organizationId)
        .lte("inventory_quantity", validated.threshold)
        .gt("inventory_quantity", 0)
        .eq("status", "active")
        .order("inventory_quantity", { ascending: true })
        .limit(validated.limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          products: data || [],
          threshold: validated.threshold,
        },
        message: `Found ${data?.length || 0} products with low stock`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.message || "Failed to get low stock products",
      };
    }
  },
};
