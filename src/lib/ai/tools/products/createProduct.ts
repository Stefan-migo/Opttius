import { z } from "zod";

import { appLogger } from "@/lib/logger";

import type { ToolDefinition, ToolResult } from "../types";
const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price: z.number().min(0),
  compare_at_price: z.number().optional(),
  cost_price: z.number().optional(),
  category_id: z.string().uuid().optional(),
  inventory_quantity: z.number().default(0),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  featured_image: z.string().url().optional(),
  gallery: z.array(z.string().url()).optional(),
  skin_type: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  ingredients: z.any().optional(),
  tags: z.array(z.string()).optional(),
});

export const createProductTool: ToolDefinition = {
  name: "createProduct",
  description: "Create a new product in the catalog.",
  category: "products",
  requiresConfirmation: true,
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Product name" },
      slug: {
        type: "string",
        description: "URL slug (auto-generated if not provided)",
      },
      description: {
        type: "string",
        description: "Full product description",
      },
      short_description: { type: "string", description: "Short description" },
      price: { type: "number", description: "Product price" },
      compare_at_price: { type: "number", description: "Compare at price" },
      cost_price: { type: "number", description: "Cost price" },
      category_id: { type: "string", description: "Category ID" },
      inventory_quantity: {
        type: "number",
        description: "Initial stock quantity",
        default: 0,
      },
      status: {
        type: "string",
        enum: ["draft", "active", "archived"],
        default: "draft",
      },
      featured_image: { type: "string", description: "Featured image URL" },
      gallery: {
        type: "array",
        items: { type: "string" },
        description: "Gallery image URLs",
      },
      skin_type: {
        type: "array",
        items: { type: "string" },
        description: "Skin types",
      },
      benefits: {
        type: "array",
        items: { type: "string" },
        description: "Product benefits",
      },
      ingredients: { type: "object", description: "Ingredients JSON" },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Product tags",
      },
    },
    required: ["name", "price"],
  },
  zodSchema: createProductSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = createProductSchema.parse(params);
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
          slug = `product-${Date.now()}`;
        }
      }

      // Always check for duplicate slug
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .eq("organization_id", organizationId)
        .limit(1);

      if (existing && existing.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }

      const productData: unknown = {
        name: validated.name,
        slug: slug,
        price: validated.price,
        description: validated.description || null,
        short_description: validated.short_description || null,
        compare_at_price: validated.compare_at_price || null,
        cost_price: validated.cost_price || null,
        category_id: validated.category_id || null,
        inventory_quantity: 0, // Legacy; stock lives in product_branch_stock only
        status: validated.status || "draft",
        featured_image: validated.featured_image || null,
        gallery: validated.gallery || [],
        skin_type: validated.skin_type || [],
        benefits: validated.benefits || [],
        ingredients: validated.ingredients || null,
        tags: validated.tags || [],
        published_at:
          validated.status === "active" ? new Date().toISOString() : null,
        organization_id: organizationId,
      };

      const { data, error } = await supabase
        .from("products")
        .insert([productData])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const currentBranchId = context.currentBranchId;
      const isGlobalMode = !currentBranchId || currentBranchId === "global";

      if (isGlobalMode) {
        // Global mode: add product to ALL branches with stock 0. Never set stock in global.
        try {
          const { data: orgBranches } = await supabase
            .from("branches")
            .select("id")
            .eq("organization_id", organizationId);

          if (orgBranches && orgBranches.length > 0) {
            for (const branch of orgBranches) {
              await supabase.from("product_branch_stock").upsert(
                {
                  product_id: data.id,
                  branch_id: branch.id,
                  quantity: 0,
                  reserved_quantity: 0,
                  low_stock_threshold: 5,
                },
                { onConflict: "product_id,branch_id" },
              );
            }
          }
        } catch (e) {
          appLogger.error("Failed to initialize branch stock (global):", e);
        }
      } else {
        // Branch mode: add stock only for the current branch
        const qty =
          validated.inventory_quantity > 0 ? validated.inventory_quantity : 0;
        try {
          await supabase.from("product_branch_stock").upsert(
            {
              product_id: data.id,
              branch_id: currentBranchId,
              quantity: qty,
              reserved_quantity: 0,
              low_stock_threshold: 5,
            },
            { onConflict: "product_id,branch_id" },
          );
        } catch (e) {
          appLogger.error("Failed to initialize branch stock:", e);
        }
      }

      return {
        success: true,
        data,
        message: `Product "${validated.name}" created successfully with slug "${slug}"`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.message || "Failed to create product",
      };
    }
  },
};
