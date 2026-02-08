import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";

const getCategoriesSchema = z.object({
  search: z.string().optional(),
  parentId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().max(100).default(50),
  page: z.number().default(1),
});

const getCategoryByIdSchema = z.object({
  categoryId: z.string().uuid(),
});

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  parent_id: z.string().uuid().optional(),
  sort_order: z.number().default(0),
  is_active: z.boolean().default(true),
});

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

const deleteCategorySchema = z.object({
  categoryId: z.string().uuid(),
});

export const categoryTools: ToolDefinition[] = [
  {
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get categories",
        };
      }
    },
  },
  {
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
            ...category,
            products_count: productsCount || 0,
            subcategories_count: subcategoriesCount || 0,
          },
          message: `Retrieved category: ${category.name}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get category",
        };
      }
    },
  },
  {
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to create category",
        };
      }
    },
  },
  {
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to update category",
        };
      }
    },
  },
  {
    name: "deleteCategory",
    description:
      "Delete a category. Products in this category will have their category_id set to null. This action cannot be undone.",
    category: "categories",
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string", description: "Category UUID" },
      },
      required: ["categoryId"],
    },
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to delete category",
        };
      }
    },
  },
  {
    name: "getCategoryTree",
    description:
      "Get all categories organized as a hierarchical tree structure.",
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
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const { supabase, organizationId } = context;
        const activeOnly = params?.activeOnly ?? false;

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
        const categoryMap = new Map<string, any>();
        const rootCategories: any[] = [];

        // First pass: create map
        for (const cat of categories || []) {
          categoryMap.set(cat.id, { ...cat, children: [] });
        }

        // Second pass: build tree
        for (const cat of categories || []) {
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get category tree",
        };
      }
    },
  },
];
