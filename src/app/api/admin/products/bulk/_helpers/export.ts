/**
 * Bulk products API — Export (CSV / JSON).
 *
 * @module app/api/admin/products/bulk/_helpers/export
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export async function handleExport(
  request: NextRequest,
): Promise<NextResponse | Response> {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const category_id = searchParams.get("category_id");
    const status = searchParams.get("status");

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

    // Get branch context for stock
    const branchContext = await getBranchContext(request, user.id);
    const branchId = branchContext.branchId;

    // Build query - include stock from product_branch_stock if branch is selected
    const selectFields = branchId
      ? `id,
        name,
        slug,
        description,
        price,
        compare_at_price,
        status,
        is_featured,
        sku,
        weight,
        skin_type,
        benefits,
        certifications,
        usage_instructions,
        category:categories(name),
        created_at,
        updated_at,
        product_branch_stock!inner (
          quantity,
          available_quantity
        )`
      : `id,
        name,
        slug,
        description,
        price,
        compare_at_price,
        inventory_quantity,
        status,
        is_featured,
        sku,
        weight,
        skin_type,
        benefits,
        certifications,
        usage_instructions,
        category:categories(name),
        created_at,
        updated_at`;

    let query = supabase
      .from("products")
      .select(selectFields as unknown) as Record<string, unknown>;

    if (branchId) {
      query = query.eq("product_branch_stock.branch_id", branchId);
    }

    if (category_id && category_id !== "all") {
      query = query.eq("category_id", category_id);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: products, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "ID",
        "Nombre",
        "Slug",
        "Descripción",
        "Precio",
        "Precio Comparación",
        "Stock",
        "Estado",
        "Destacado",
        "SKU",
        "Peso",
        "Tipos de Piel",
        "Beneficios",
        "Certificaciones",
        "Instrucciones",
        "Categoría",
        "Fecha Creación",
      ];

      const csvRows = [
        headers.join(","),
        ...(products || []).map((product: Record<string, unknown>) =>
          [
            product.id,
            `"${product.name || ""}"`,
            `"${product.slug || ""}"`,
            `"${(product.description || "").replace(/"/g, '""')}"`,
            product.price || 0,
            product.compare_at_price || "",
            // Use stock from product_branch_stock if available, otherwise fallback to deprecated inventory_quantity
            (() => {
              const stock = product.product_branch_stock as Array<Record<string, unknown>> | undefined;
              return (
                stock?.[0]?.available_quantity ??
                stock?.[0]?.quantity ??
                product.inventory_quantity ??
                0
              );
            })(),
            product.status || "",
            product.is_featured ? "Sí" : "No",
            `"${product.sku || ""}"`,
            product.weight || "",
            `"${Array.isArray(product.skin_type) ? product.skin_type.join("; ") : ""}"`,
            `"${Array.isArray(product.benefits) ? product.benefits.join("; ") : ""}"`,
            `"${Array.isArray(product.certifications) ? product.certifications.join("; ") : ""}"`,
            `"${(product.usage_instructions || "").replace(/"/g, '""')}"`,
            `"${(() => {
              if (Array.isArray(product.category)) {
                return product.category.length > 0
                  ? product.category[0]?.name || ""
                  : "";
              }
              return product.category?.name || "";
            })()}"`,
          ].join(","),
        ),
      ];

      const csvContent = csvRows.join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="productos-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    if (format === "json") {
      const jsonString = JSON.stringify(products, null, 2);

      return new Response(jsonString, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="productos-${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    return NextResponse.json({ products });
  } catch (error) {
    logger.error("Error in export products API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
