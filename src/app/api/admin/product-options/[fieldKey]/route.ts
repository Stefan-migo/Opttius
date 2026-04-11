import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/lib/supabase";

const supabase = createServiceRoleClient();

// GET - Fetch options for a specific field key
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fieldKey: string }> },
) {
  const { fieldKey } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "true";

    const { data: field, error: fieldError } = await supabase
      .from("product_option_fields")
      .select("*")
      .eq("field_key", fieldKey)
      .single();

    if (fieldError || !field) {
      return NextResponse.json(
        { error: "Campo no encontrado" },
        { status: 404 },
      );
    }

    let valuesQuery = supabase
      .from("product_option_values")
      .select("*")
      .eq("field_id", field.id)
      .order("display_order", { ascending: true });

    if (!includeInactive) {
      valuesQuery = valuesQuery.eq("is_active", true);
    }

    const { data: values, error: valuesError } = await valuesQuery;

    if (valuesError) {
      logger.error("Error fetching option values:", {
        error: valuesError,
        fieldKey,
      });
      return NextResponse.json(
        { error: "Error al obtener valores de opción" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      field,
      values: values || [],
    });
  } catch (error) {
    logger.error("Error in GET /api/admin/product-options/[fieldKey]:", {
      error,
      fieldKey,
    });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
