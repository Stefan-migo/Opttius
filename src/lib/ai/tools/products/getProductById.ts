import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getProductByIdSchema = z.object({
  productId: z.string().uuid(),
});

export const getProductByIdTool: ToolDefinition = {
  name: "getProductById",
  description: "Get detailed information about a specific product by ID.",
  category: "products",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product UUID" },
    },
    required: ["productId"],
  },
  zodSchema: getProductByIdSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getProductByIdSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      const { data, error } = await supabase
        .from("products")
        .select(
          `
            *,
            categories:category_id (
              id,
              name,
              slug
            ),
            product_variants (
              id,
              title,
              price,
              inventory_quantity,
              option1,
              option2,
              option3
            ),
            product_branch_stock (
              branch_id,
              quantity,
              low_stock_threshold,
              branch:branches(id, name)
            )
          `,
        )
        .eq("id", validated.productId)
        .eq("organization_id", organizationId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: "Product not found" };
      }

      const product = {
        ...data,
        currency: context.currency || "USD",
      };

      return {
        success: true,
        data: product,
        message: `Retrieved details for ${product.name}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.message || "Failed to get product",
      };
    }
  },
};
