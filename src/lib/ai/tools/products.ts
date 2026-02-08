import { z } from "zod";
import type { ToolDefinition, ToolExecutionContext, ToolResult } from "./types";

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

const getProductByIdSchema = z.object({
  productId: z.string().uuid(),
});

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

const deleteProductSchema = z.object({
  productId: z.string().uuid(),
});

const updateInventorySchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().min(0),
  adjustmentType: z.enum(["set", "add", "subtract"]).default("set"),
});

const getLowStockProductsSchema = z.object({
  threshold: z.number().default(5),
  limit: z.number().default(20),
});

export const productTools: ToolDefinition[] = [
  {
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get products",
        };
      }
    },
  },
  {
    name: "getProductById",
    description: "Get detailed information about a specific product by ID.",
    category: "products",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product UUID" },
      },
      required: ["productId"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getProductByIdSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data, error } = await supabase
          .from("products")
          .select(
            `
            *,
            categories:category_id (
              id,
              name,
              slug
            ),
            product_variants (
              id,
              title,
              price,
              inventory_quantity,
              option1,
              option2,
              option3
            )
          `,
          )
          .eq("id", validated.productId)
          .eq("organization_id", organizationId)
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data) {
          return { success: false, error: "Product not found" };
        }

        const product = {
          ...data,
          currency: context.currency || "USD",
        };

        return {
          success: true,
          data: product,
          message: `Retrieved details for ${product.name}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get product",
        };
      }
    },
  },
  {
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

        const productData: any = {
          name: validated.name,
          slug: slug,
          price: validated.price,
          description: validated.description || null,
          short_description: validated.short_description || null,
          compare_at_price: validated.compare_at_price || null,
          cost_price: validated.cost_price || null,
          category_id: validated.category_id || null,
          inventory_quantity: validated.inventory_quantity || 0,
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

        // Initialize inventory in the default branch if quantity provided
        if (validated.inventory_quantity > 0) {
          try {
            // Get default branch
            const { data: branch } = await supabase
              .from("branches")
              .select("id")
              .eq("organization_id", organizationId)
              .limit(1)
              .single();

            if (branch) {
              await supabase.from("product_branch_stock").insert({
                product_id: data.id,
                branch_id: branch.id,
                quantity: validated.inventory_quantity,
                low_stock_threshold: 5,
              });
            }
          } catch (e) {
            console.error("Failed to initialize branch stock:", e);
            // Don't fail the whole operation, just log
          }
        }

        return {
          success: true,
          data,
          message: `Product "${validated.name}" created successfully with slug "${slug}"`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to create product",
        };
      }
    },
  },
  {
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

        const { data, error } = await supabase
          .from("products")
          .update({
            ...validated.updates,
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to update product",
        };
      }
    },
  },
  {
    name: "deleteProduct",
    description:
      "Delete a product from the catalog. This action cannot be undone.",
    category: "products",
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product UUID" },
      },
      required: ["productId"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = deleteProductSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data, error } = await supabase
          .from("products")
          .delete()
          .eq("id", validated.productId)
          .eq("organization_id", organizationId)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data) {
          return {
            success: false,
            error: "Product not found or access denied",
          };
        }

        return {
          success: true,
          message: `Product deleted successfully`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to delete product",
        };
      }
    },
  },
  {
    name: "updateInventory",
    description:
      "Update product inventory quantity. Can set, add, or subtract from current stock.",
    category: "products",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product UUID" },
        quantity: { type: "number", description: "Quantity value" },
        adjustmentType: {
          type: "string",
          enum: ["set", "add", "subtract"],
          default: "set",
          description: "How to adjust inventory",
        },
      },
      required: ["productId", "quantity"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = updateInventorySchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        // Check for organization_id
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id, organization_id")
          .eq("id", validated.productId)
          .eq("organization_id", organizationId)
          .single();

        if (productError || !productData) {
          return {
            success: false,
            error: "Product not found or access denied",
          };
        }

        let branchId = context.currentBranchId;

        if (!branchId || branchId === "global") {
          // Get default branch for the organization if no specific branch is selected
          const { data: branch, error: branchError } = await supabase
            .from("branches")
            .select("id")
            .eq("organization_id", organizationId)
            .limit(1)
            .single();

          if (branchError || !branch) {
            // If no branch found, fallback to just updating products table (legacy)
            // But warn
            console.warn(
              "No branch found for inventory update, falling back to legacy column",
            );
          } else {
            branchId = branch.id;
          }
        }
        let newQuantity = 0;

        if (branchId) {
          // Get current stock
          const { data: currentStock } = await supabase
            .from("product_branch_stock")
            .select("quantity")
            .eq("product_id", validated.productId)
            .eq("branch_id", branchId)
            .single();

          const currentQty = currentStock?.quantity || 0;

          if (validated.adjustmentType === "set") {
            newQuantity = validated.quantity;
          } else if (validated.adjustmentType === "add") {
            newQuantity = currentQty + validated.quantity;
          } else if (validated.adjustmentType === "subtract") {
            newQuantity = Math.max(0, currentQty - validated.quantity);
          }

          // Upsert stock
          const { error: stockError } = await supabase
            .from("product_branch_stock")
            .upsert(
              {
                product_id: validated.productId,
                branch_id: branchId,
                quantity: newQuantity,
                low_stock_threshold: 5,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "product_id, branch_id" },
            );

          if (stockError) {
            console.error("Stock update error:", stockError);
            return {
              success: false,
              error: "Failed to update branch stock: " + stockError.message,
            };
          }
        } else {
          // Fallback logic for legacy column if no branch
          const { data: currentProduct } = await supabase
            .from("products")
            .select("inventory_quantity")
            .eq("id", validated.productId)
            .single();

          const currentQty = currentProduct?.inventory_quantity || 0;
          if (validated.adjustmentType === "set") {
            newQuantity = validated.quantity;
          } else if (validated.adjustmentType === "add") {
            newQuantity = currentQty + validated.quantity;
          } else if (validated.adjustmentType === "subtract") {
            newQuantity = Math.max(0, currentQty - validated.quantity);
          }
        }

        // Also update legacy column for compatibility
        const { data, error } = await supabase
          .from("products")
          .update({
            inventory_quantity: newQuantity,
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
          message: `Inventory updated to ${newQuantity} units`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to update inventory",
        };
      }
    },
  },
  {
    name: "getLowStockProducts",
    description: "Get products with inventory below the specified threshold.",
    category: "products",
    parameters: {
      type: "object",
      properties: {
        threshold: {
          type: "number",
          description: "Stock threshold",
          default: 5,
        },
        limit: {
          type: "number",
          description: "Maximum number of results",
          default: 20,
        },
      },
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getLowStockProductsSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data, error } = await supabase
          .from("products")
          .select("id, name, inventory_quantity, status")
          .eq("organization_id", organizationId)
          .lte("inventory_quantity", validated.threshold)
          .gt("inventory_quantity", 0)
          .eq("status", "active")
          .order("inventory_quantity", { ascending: true })
          .limit(validated.limit);

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          data: {
            products: data || [],
            threshold: validated.threshold,
          },
          message: `Found ${data?.length || 0} products with low stock`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get low stock products",
        };
      }
    },
  },
];
