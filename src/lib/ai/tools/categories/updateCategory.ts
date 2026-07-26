import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const updateCategorySchema = z.object({
  categoryId: z.string().uuid(),
  updates: z.object({
    name: z.string().min(1).optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    image_url: z.string().url().optional(),
    parent_id: z.string().uuid().nullable().optional(),
    sort_order: z.number().optional(),
    is_active: z.boolean().optional(),
  }),
});

export const updateCategoryTool: ToolDefinition = {
  name: "updateCategory",
  description:
    "Update category information. Only provided fields will be updated.",
  category: "categories",
  parameters: {
    type: "object",
    properties: {
      categoryId: { type: "string", description: "Category UUID" },
      updates: {
        type: "object",
        description: "Fields to update",
        properties: {
          name: { type: "string", description: "Category name" },
          slug: { type: "string", description: "URL slug" },
          description: {
            type: "string",
            description: "Category description",
          },
          image_url: { type: "string", description: "Category image URL" },
          parent_id: {
            type: "string",
            description: "Parent category ID (null for root category)",
          },
          sort_order: { type: "number", description: "Sort order" },
          is_active: {
            type: "boolean",
            description: "Whether category is active",
          },
        },
      },
    },
    required: ["categoryId", "updates"],
  },
  zodSchema: updateCategorySchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = updateCategorySchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      // If slug is being updated, check for duplicates
      if (validated.updates.slug) {
        const { data: existing } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", validated.updates.slug)
          .neq("id", validated.categoryId)
          .limit(1);

        if (existing && existing.length > 0) {
          validated.updates.slug = `${validated.updates.slug}-${Date.now()}`;
        }
      }

      const { data, error } = await supabase
        .from("categories")
        .update({
          ...validated.updates,
          updated_at: new Date().toISOString(),
        })

        .eq("id", validated.categoryId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data,
        message: `Category updated successfully`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to update category",
      };
    }
  },
};
