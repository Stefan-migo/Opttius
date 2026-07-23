import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getCategoriesSchema = z.object({
  search: z.string().optional(),
  parentId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().max(100).default(50),
  page: z.number().default(1),
});

export const getCategoriesTool: ToolDefinition = {
  name: "getCategories",
  description:
    "Get a list of product categories. Can filter by search term, parent category, and active status.",
  category: "categories",
  parameters: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Search term for category name",
      },
      parentId: {
        type: "string",
        description: "Filter by parent category ID",
      },
      isActive: { type: "boolean", description: "Filter by active status" },
      limit: {
        type: "number",
        description: "Number of results (max 100)",
        default: 50,
      },
      page: { type: "number", description: "Page number", default: 1 },
    },
  },
  zodSchema: getCategoriesSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getCategoriesSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let query = supabase.from("categories").select("*", { count: "exact" });

      if (validated.search) {
        query = query.ilike("name", `%${validated.search}%`);
      }

      if (validated.parentId) {
        query = query.eq("parent_id", validated.parentId);
      }

      if (validated.isActive !== undefined) {
        query = query.eq("is_active", validated.isActive);
      }

      const offset = (validated.page - 1) * validated.limit;
      const { data, error, count } = await query
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
        .range(offset, offset + validated.limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          categories: data || [],
          total: count || 0,
          page: validated.page,
          limit: validated.limit,
        },
        message: `Found ${count || 0} categories`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to get categories",
      };
    }
  },
};
