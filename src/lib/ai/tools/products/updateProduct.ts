import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const updateProductSchema = z.object({
  productId: z.string().uuid(),
  updates: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    short_description: z.string().optional(),
    price: z.number().min(0).optional(),
    compare_at_price: z.number().optional(),
    cost_price: z.number().optional(),
    category_id: z.string().uuid().optional(),
    inventory_quantity: z.number().optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
    featured_image: z.string().url().optional(),
    gallery: z.array(z.string().url()).optional(),
    skin_type: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
    ingredients: z.any().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateProductTool: ToolDefinition = {
  name: "updateProduct",
  description:
    "Update product information. Only provided fields will be updated.",
  category: "products",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product UUID" },
      updates: {
        type: "object",
        description: "Fields to update",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          inventory_quantity: { type: "number" },
          status: { type: "string", enum: ["draft", "active", "archived"] },
        },
      },
    },
    required: ["productId", "updates"],
  },
  zodSchema: updateProductSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = updateProductSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      // Strip inventory_quantity - stock lives in product_branch_stock. Use updateInventory tool.
      const { inventory_quantity: _inv, ...productUpdates } =
        validated.updates as Record<string, unknown>;

      const { data, error } = await supabase
        .from("products")
        .update({
          ...productUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.productId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data,
        message: `Product updated successfully`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update product",
      };
    }
  },
};
