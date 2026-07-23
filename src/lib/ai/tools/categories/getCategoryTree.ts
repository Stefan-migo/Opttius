import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getCategoryTreeSchema = z.object({
  activeOnly: z.boolean().default(false),
});

export const getCategoryTreeTool: ToolDefinition = {
  name: "getCategoryTree",
  description: "Get all categories organized as a hierarchical tree structure.",
  category: "categories",
  parameters: {
    type: "object",
    properties: {
      activeOnly: {
        type: "boolean",
        description: "Only include active categories",
        default: false,
      },
    },
  },
  zodSchema: getCategoryTreeSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getCategoryTreeSchema.parse(params);
      const { supabase, organizationId } = context;
      const activeOnly = validated.activeOnly;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let query = supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data: categories, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      // Build tree structure
      const cats = (categories as unknown[]) || [];
      const categoryMap = new Map<string, unknown>();
      const rootCategories: unknown[] = [];

      // First pass: create map
      for (const cat of cats) {
        categoryMap.set(cat.id, { ...cat, children: [] });
      }

      // Second pass: build tree
      for (const cat of cats) {
        const node = categoryMap.get(cat.id);
        if (cat.parent_id && categoryMap.has(cat.parent_id)) {
          categoryMap.get(cat.parent_id).children.push(node);
        } else {
          rootCategories.push(node);
        }
      }

      return {
        success: true,
        data: {
          tree: rootCategories,
          total: categories?.length || 0,
        },
        message: `Retrieved ${categories?.length || 0} categories in tree structure`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to get category tree",
      };
    }
  },
};
