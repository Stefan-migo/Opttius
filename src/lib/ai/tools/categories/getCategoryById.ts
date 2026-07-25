import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getCategoryByIdSchema = z.object({
  categoryId: z.string().uuid(),
});

export const getCategoryByIdTool: ToolDefinition = {
  name: "getCategoryById",
  description:
    "Get detailed information about a specific category by ID, including its products count.",
  category: "categories",
  parameters: {
    type: "object",
    properties: {
      categoryId: { type: "string", description: "Category UUID" },
    },
    required: ["categoryId"],
  },
  zodSchema: getCategoryByIdSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getCategoryByIdSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      // Get category with parent info
      const { data: category, error } = await supabase
        .from("categories")
        .select(
          `
            *,
            parent:parent_id (
              id,
              name,
              slug
            )
          `,
        )
        .eq("id", validated.categoryId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!category) {
        return { success: false, error: "Category not found" };
      }

      // Get products count for this category
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("category_id", validated.categoryId);

      // Get subcategories count
      const { count: subcategoriesCount } = await supabase
        .from("categories")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", validated.categoryId);

      return {
        success: true,
        data: {
          // @ts-expect-error — SupabaseClient<unknown>, category type is dynamic
          ...category,
          products_count: productsCount || 0,
          subcategories_count: subcategoriesCount || 0,
        },
        // @ts-expect-error — SupabaseClient<unknown>, category type is dynamic
        message: `Retrieved category: ${category.name}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get category",
      };
    }
  },
};
