import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  parent_id: z.string().uuid().optional(),
  sort_order: z.number().default(0),
  is_active: z.boolean().default(true),
});

export const createCategoryTool: ToolDefinition = {
  name: "createCategory",
  description: "Create a new product category.",
  category: "categories",
  requiresConfirmation: true,
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Category name" },
      slug: {
        type: "string",
        description: "URL slug (auto-generated if not provided)",
      },
      description: { type: "string", description: "Category description" },
      image_url: { type: "string", description: "Category image URL" },
      parent_id: {
        type: "string",
        description: "Parent category ID for subcategories",
      },
      sort_order: {
        type: "number",
        description: "Sort order (lower = first)",
        default: 0,
      },
      is_active: {
        type: "boolean",
        description: "Whether category is active",
        default: true,
      },
    },
    required: ["name"],
  },
  zodSchema: createCategorySchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = createCategorySchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      // Generate slug if not provided
      let slug = validated.slug;
      if (!slug) {
        slug = validated.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        if (!slug) {
          slug = `category-${Date.now()}`;
        }
      }

      // Check for duplicate slug
      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .limit(1);

      if (existing && existing.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }

      const categoryData = {
        name: validated.name,
        slug: slug,
        description: validated.description || null,
        image_url: validated.image_url || null,
        parent_id: validated.parent_id || null,
        sort_order: validated.sort_order,
        is_active: validated.is_active,
        // organization_id: organizationId,
      };

      const { data, error } = await supabase
        .from("categories")
        .insert([categoryData])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data,
        message: `Category "${validated.name}" created successfully`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to create category",
      };
    }
  },
};
