import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getProductsSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  featured: z.boolean().optional(),
  inStock: z.boolean().optional(),
  limit: z.number().max(100).default(20),
  page: z.number().default(1),
});

export const getProductsTool: ToolDefinition = {
  name: "getProducts",
  description:
    "Search and filter products. Returns a list of products matching the criteria.",
  category: "products",
  parameters: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Search term for product name or description",
      },
      category: { type: "string", description: "Category ID to filter by" },
      status: {
        type: "string",
        enum: ["draft", "active", "archived"],
        description: "Product status",
      },
      minPrice: { type: "number", description: "Minimum price filter" },
      maxPrice: { type: "number", description: "Maximum price filter" },
      featured: { type: "boolean", description: "Filter featured products" },
      inStock: { type: "boolean", description: "Filter products in stock" },
      limit: {
        type: "number",
        description: "Number of results (max 100)",
        default: 20,
      },
      page: { type: "number", description: "Page number", default: 1 },
    },
  },
  zodSchema: getProductsSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getProductsSchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let query = supabase
        .from("products")
        .select(
          `
            *,
            categories:category_id (
              id,
              name,
              slug
            )
          `,
          { count: "exact" },
        )
        .eq("organization_id", organizationId);

      if (validated.search) {
        query = query.or(
          `name.ilike.%${validated.search}%,description.ilike.%${validated.search}%`,
        );
      }

      if (validated.category) {
        query = query.eq("category_id", validated.category);
      }

      if (validated.status) {
        query = query.eq("status", validated.status);
      }

      if (validated.minPrice !== undefined) {
        query = query.gte("price", validated.minPrice);
      }

      if (validated.maxPrice !== undefined) {
        query = query.lte("price", validated.maxPrice);
      }

      if (validated.featured !== undefined) {
        query = query.eq("is_featured", validated.featured);
      }

      if (validated.inStock) {
        query = query.gt("inventory_quantity", 0);
      }

      const offset = (validated.page - 1) * validated.limit;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + validated.limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      const products =
        data?.map((product) => ({
          ...product,
          currency: context.currency || "USD",
        })) || [];

      return {
        success: true,
        data: {
          products,
          total: count || 0,
          page: validated.page,
          limit: validated.limit,
          currency: context.currency || "USD",
        },
        message: `Found ${count || 0} products`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get products",
      };
    }
  },
};
