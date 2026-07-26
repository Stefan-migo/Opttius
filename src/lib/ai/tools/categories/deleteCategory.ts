import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const deleteCategorySchema = z.object({
  categoryId: z.string().uuid(),
});

export const deleteCategoryTool: ToolDefinition = {
  name: "deleteCategory",
  description:
    "Delete a category. Products in this category will have their category_id set to null. This action cannot be undone.",
  category: "categories",
  requiresConfirmation: true,
  minRole: "admin",
  parameters: {
    type: "object",
    properties: {
      categoryId: { type: "string", description: "Category UUID" },
    },
    required: ["categoryId"],
  },
  zodSchema: deleteCategorySchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = deleteCategorySchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      // Check if category exists and get its name
      const { data: category, error: fetchError } = await supabase
        .from("categories")
        .select("name")
        .eq("id", validated.categoryId)
        .single();

      if (fetchError || !category) {
        return { success: false, error: "Category not found" };
      }

      // Check for subcategories
      const { count: subcategoriesCount } = await supabase
        .from("categories")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", validated.categoryId);

      if (subcategoriesCount && subcategoriesCount > 0) {
        return {
          success: false,
          error: `Cannot delete category with ${subcategoriesCount} subcategories. Please delete or reassign them first.`,
        };
      }

      // Delete the category (products will have category_id set to null via FK constraint)
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", validated.categoryId);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: `Category "${category.name}" deleted successfully`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to delete category",
      };
    }
  },
};
