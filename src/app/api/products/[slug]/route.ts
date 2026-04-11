import { NextRequest, NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // Try with regular client first (for public access if RLS allows)
    const supabase = await createClient();

    // Fetch product by slug - only active products
    let { data: product, error } = await supabase
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
          option3,
          is_default
        )
      `,
      )
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    // If RLS blocks access, try with service role client for public products
    if (error && error.code === "42501") {
      const serviceSupabase = createServiceRoleClient();
      const result = await serviceSupabase
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
            option3,
            is_default
          )
        `,
        )
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      product = result.data;
      error = result.error;
    }

    if (error || !product) {
      console.error("Error fetching product by slug:", error);
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({ product });
  } catch (error: unknown) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
