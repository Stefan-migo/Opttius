import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/lib/supabase";

const supabase = createServiceRoleClient();

// GET - Fetch all option fields with their values
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fieldKey = searchParams.get("field_key");
    const category = searchParams.get("category");
    const formType = searchParams.get("form_type"); // product|customer|prescription|quote|appointment|pos|global
    const includeInactive = searchParams.get("include_inactive") === "true";

    let query = supabase
      .from("product_option_fields")
      .select(
        `
        *,
        values:product_option_values(*)
      `,
      )
      .order("display_order", { ascending: true });

    if (fieldKey) {
      query = query.eq("field_key", fieldKey);
    }

    if (category) {
      query = query.eq("field_category", category);
    }

    if (formType) {
      query = query.eq("form_type", formType);
    }

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: fields, error } = await query;

    if (error) {
      logger.error("Error fetching product option fields:", { error });
      return NextResponse.json(
        { error: "Error al obtener campos de opciones" },
        { status: 500 },
      );
    }

    // Sort values by display_order and filter inactive if needed
    const fieldsWithSortedValues = fields?.map((field) => ({
      ...field,
      values:
        field.values
          ?.filter((v: unknown) => includeInactive || v.is_active)
          .sort(
            (a: unknown, b: unknown) => a.display_order - b.display_order,
          ) || [],
    }));

    return NextResponse.json({ fields: fieldsWithSortedValues || [] });
  } catch (error) {
    logger.error("Error in GET /api/admin/product-options:", { error });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// POST - Create a new option field or value
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, fieldData, valueData } = body;

    if (type === "field") {
      // Create new option field
      const { data, error } = await supabase
        .from("product_option_fields")
        .insert(fieldData)
        .select()
        .single();

      if (error) {
        logger.error("Error creating option field:", { error, fieldData });
        return NextResponse.json(
          { error: "Error al crear campo de opción" },
          { status: 500 },
        );
      }

      return NextResponse.json({ field: data });
    } else if (type === "value") {
      // Create new option value
      const { data, error } = await supabase
        .from("product_option_values")
        .insert(valueData)
        .select()
        .single();

      if (error) {
        logger.error("Error creating option value:", { error, valueData });
        return NextResponse.json(
          { error: "Error al crear valor de opción" },
          { status: 500 },
        );
      }

      return NextResponse.json({ value: data });
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (error) {
    logger.error("Error in POST /api/admin/product-options:", { error });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// PUT - Update an option field or value
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, data } = body;

    if (type === "field") {
      const { data: updated, error } = await supabase
        .from("product_option_fields")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating option field:", { error, id, data });
        return NextResponse.json(
          { error: "Error al actualizar campo de opción" },
          { status: 500 },
        );
      }

      return NextResponse.json({ field: updated });
    } else if (type === "value") {
      const { data: updated, error } = await supabase
        .from("product_option_values")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating option value:", { error, id, data });
        return NextResponse.json(
          { error: "Error al actualizar valor de opción" },
          { status: 500 },
        );
      }

      return NextResponse.json({ value: updated });
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (error) {
    logger.error("Error in PUT /api/admin/product-options:", { error });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// DELETE - Delete an option field or value
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const checkUsage = searchParams.get("check_usage") === "true";

    if (!type || !id) {
      return NextResponse.json(
        { error: "Tipo e ID son requeridos" },
        { status: 400 },
      );
    }

    if (type === "value") {
      // Check if value is being used in products
      if (checkUsage) {
        // This would require checking the products table for the field_key and value
        // For now, we'll allow deletion but could add this check later
      }

      const { error } = await supabase
        .from("product_option_values")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Error deleting option value:", { error, id, type });
        return NextResponse.json(
          { error: "Error al eliminar valor de opción" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    } else if (type === "field") {
      // Deleting a field will cascade delete all its values
      const { error } = await supabase
        .from("product_option_fields")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Error deleting option field:", { error, id, type });
        return NextResponse.json(
          { error: "Error al eliminar campo de opción" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (error) {
    logger.error("Error in DELETE /api/admin/product-options:", { error });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
