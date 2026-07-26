import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const deleteProductSchema = z.object({
  productId: z.string().uuid(),
});

export const deleteProductTool: ToolDefinition = {
  name: "deleteProduct",
  description:
    "Delete a product from the catalog. This action cannot be undone.",
  category: "products",
  requiresConfirmation: true,
  minRole: "admin",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product UUID" },
    },
    required: ["productId"],
  },
  zodSchema: deleteProductSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = deleteProductSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", validated.productId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return {
          success: false,
          error: "Product not found or access denied",
        };
      }

      return {
        success: true,
        message: `Product deleted successfully`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete product",
      };
    }
  },
};
