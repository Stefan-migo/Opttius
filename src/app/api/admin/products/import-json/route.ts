import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

interface ProductImport {
  name: string;
  slug?: string;
  short_description?: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  inventory_quantity?: number;
  category_id?: string;
  category?: string | { name: string; slug?: string };
  featured_image?: string;
  gallery?: string[];
  skin_type?: string[];
  benefits?: string[];
  certifications?: string[];
  ingredients?: Array<{ name: string; percentage?: number }>;
  usage_instructions?: string;
  precautions?: string;
  weight?: number;
  dimensions?: string;
  package_characteristics?: string;
  is_featured?: boolean;
  status?: "active" | "draft" | "archived";
}

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Parse JSON from request body
    const body = await request.json();
    const products: ProductImport[] = body.products || body;
    const mode = body.mode || "create";

    if (!Array.isArray(products)) {
      return NextResponse.json(
        { error: "Expected an array of products" },
        { status: 400 },
      );
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No products provided" },
        { status: 400 },
      );
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        // Validate required fields
        if (!product.name || !product.price) {
          errors.push({
            index: i,
            product: product.name || "Unknown",
            error: "Missing required fields: name or price",
          });
          continue;
        }

        // Handle category - check if it's category_id or category object
        let categoryId = product.category_id;
        if (!categoryId && product.category) {
          // Try to find category by name
          const categoryName =
            typeof product.category === "string"
              ? product.category
              : product.category.name;
          if (typeof categoryName === "string") {
            // Get categories to find the ID
            const { data: categories } = await supabase
              .from("categories")
              .select("id, name, slug")
              .limit(100);

            const matchingCategory = categories?.find(
              (cat) =>
                cat.name.toLowerCase() === categoryName.toLowerCase() ||
                cat.slug.toLowerCase() ===
                  categoryName.toLowerCase().replace(/\s+/g, "-") ||
                cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
                categoryName.toLowerCase().includes(cat.name.toLowerCase()),
            );

            if (matchingCategory) {
              categoryId = matchingCategory.id;
            } else {
              errors.push({
                index: i,
                product: product.name,
                error: `Category not found: ${categoryName}`,
              });
              continue;
            }
          }
        }

        if (!categoryId) {
          errors.push({
            index: i,
            product: product.name,
            error: "Missing category_id or valid category name",
          });
          continue;
        }

        // Generate slug if not provided
        let slug = product.slug;
        if (!slug) {
          slug = product.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
            .replace(/\s+/g, "-") // Replace spaces with hyphens
            .replace(/-+/g, "-") // Replace multiple hyphens with single
            .trim();
        }

        // Check if product already exists (by slug or name)
        const { data: existingProduct } = await supabase
          .from("products")
          .select("id, name, slug")
          .or(`slug.eq.${slug},name.eq.${product.name}`)
          .single();

        // Prepare product data
        const productData = {
          name: product.name,
          slug,
          short_description: product.short_description || null,
          description: product.description || null,
          price: product.price,
          compare_at_price: product.compare_at_price || null,
          inventory_quantity: product.inventory_quantity || 0,
          category_id: categoryId,
          featured_image: product.featured_image || null,
          gallery: product.gallery || [],
          skin_type: product.skin_type || [],
          benefits: product.benefits || [],
          certifications: product.certifications || [],
          ingredients: product.ingredients || [],
          usage_instructions: product.usage_instructions || null,
          precautions: product.precautions || null,
          weight: product.weight || null,
          dimensions: product.dimensions || null,
          package_characteristics: product.package_characteristics || null,
          is_featured: product.is_featured || false,
          status: product.status || "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Handle different import modes
        let operation = "";
        let newProduct = null;
        let error = null;

        if (existingProduct) {
          // Product exists - handle based on mode
          if (mode === "create") {
            // Skip existing products in create mode
            results.push({
              index: i,
              product: product.name,
              action: "skipped",
              reason: "Product already exists",
            });
            continue;
          } else if (mode === "update" || mode === "upsert") {
            // Update existing product
            const { data: updatedProduct, error: updateError } = await supabase
              .from("products")
              .update({
                ...productData,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingProduct.id)
              .select()
              .single();

            if (updateError) {
              error = updateError;
            } else {
              newProduct = updatedProduct;
              operation = "updated";
            }
          } else if (mode === "skip_duplicates") {
            // Skip duplicates
            results.push({
              index: i,
              product: product.name,
              action: "skipped",
              reason: "Duplicate product skipped",
            });
            continue;
          }
        } else {
          // Product doesn't exist - handle based on mode
          if (mode === "update") {
            // Skip non-existing products in update mode
            results.push({
              index: i,
              product: product.name,
              action: "skipped",
              reason: "Product does not exist",
            });
            continue;
          } else if (
            mode === "create" ||
            mode === "upsert" ||
            mode === "skip_duplicates"
          ) {
            // Create new product
            const { data: createdProduct, error: insertError } = await supabase
              .from("products")
              .insert(productData)
              .select()
              .single();

            if (insertError) {
              error = insertError;
            } else {
              newProduct = createdProduct;
              operation = "created";
            }
          }
        }

        if (error) {
          errors.push({
            index: i,
            product: product.name,
            error: error.message,
          });
          continue;
        }

        if (newProduct) {
          results.push({
            index: i,
            product: product.name,
            id: newProduct.id,
            slug: newProduct.slug,
            action: operation,
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          product: product.name || "Unknown",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Calculate summary statistics
    const created = results.filter((r) => r.action === "created").length;
    const updated = results.filter((r) => r.action === "updated").length;
    const skipped = results.filter((r) => r.action === "skipped").length;

    return NextResponse.json({
      success: true,
      total: products.length,
      successful: results.length,
      failed: errors.length,
      summary: {
        created,
        updated,
        skipped,
        total_processed: products.length,
      },
      results,
      errors,
    });
  } catch (error) {
    logger.error("JSON import error", { error });
    return NextResponse.json(
      {
        error: "Failed to import products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
