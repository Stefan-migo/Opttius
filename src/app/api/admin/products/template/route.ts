import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
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

    // Get categories for reference
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    // Create CSV template with all product fields
    const csvHeaders = [
      "name", // Nombre del Producto *
      "slug", // URL (slug) - auto-generated if empty
      "short_description", // Descripción Corta
      "description", // Descripción Detallada
      "price", // Precio *
      "compare_at_price", // Precio Comparado
      "inventory_quantity", // Cantidad en Stock
      "category_id", // Categoría (use category name or ID)
      "featured_image", // Imagen Principal (URL)
      "gallery_1", // Galería Imagen 1 (URL)
      "gallery_2", // Galería Imagen 2 (URL)
      "gallery_3", // Galería Imagen 3 (URL)
      "gallery_4", // Galería Imagen 4 (URL)
      "skin_type", // Tipos de Piel (separated by semicolon: dry;oily;combination)
      "benefits", // Beneficios (separated by semicolon: Hidratante;Anti-edad;Regenerador)
      "certifications", // Certificaciones (separated by semicolon: organic;cruelty-free;vegan)
      "ingredients", // Ingredientes (JSON format: [{"name":"Rosa Mosqueta","percentage":15},{"name":"Vitamina E","percentage":5}])
      "usage_instructions", // Instrucciones de Uso
      "precautions", // Precauciones
      "weight", // Peso (gramos)
      "dimensions", // Dimensiones
      "package_characteristics", // Características del Empaque
      "is_featured", // Destacado (true/false)
      "status", // Estado (active/draft/archived)
    ];

    // Create sample data row
    const sampleRow = [
      "Crema Hidratante de Rosa Mosqueta", // name
      "crema-hidratante-rosa-mosqueta", // slug
      "Crema hidratante natural con extracto de rosa mosqueta", // short_description
      "Crema hidratante natural con extracto de rosa mosqueta, ideal para pieles secas y sensibles.", // description
      "2500.00", // price
      "3000.00", // compare_at_price
      "50", // inventory_quantity
      "Cremas", // category_id (use category name)
      "https://example.com/featured-image.jpg", // featured_image
      "https://example.com/gallery1.jpg", // gallery_1
      "https://example.com/gallery2.jpg", // gallery_2
      "https://example.com/gallery3.jpg", // gallery_3
      "https://example.com/gallery4.jpg", // gallery_4
      "dry;sensitive", // skin_type
      "Hidratante;Regenerador;Nutritivo", // benefits
      "organic;cruelty-free;vegan", // certifications
      '[{"name":"Rosa Mosqueta","percentage":15},{"name":"Vitamina E","percentage":5}]', // ingredients
      "Aplicar sobre la piel limpia y seca, masajear suavemente hasta absorción completa.", // usage_instructions
      "Evitar contacto con ojos. Mantener fuera del alcance de niños.", // precautions
      "500", // weight
      "15x10x5 cm", // dimensions
      "Tubo de plástico reciclable con tapa de rosca", // package_characteristics
      "true", // is_featured
      "active", // status
    ];

    // Create CSV content
    const csvContent = [
      csvHeaders.join(","),
      sampleRow.join(","),
      // Add empty row for user to fill
      csvHeaders.map(() => "").join(","),
    ].join("\n");

    // Add categories reference as comments
    const categoriesReference = categories
      ? `\n\n# CATEGORIES REFERENCE:\n# ${categories.map((cat) => `${cat.name} (ID: ${cat.id})`).join("\n# ")}`
      : "";

    const fullCsvContent = csvContent + categoriesReference;

    return new Response(fullCsvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="productos-template.csv"',
      },
    });
  } catch (error) {
    logger.error("Error generating CSV template", { error });
    return NextResponse.json(
      { error: "Failed to generate CSV template" },
      { status: 500 },
    );
  }
}
