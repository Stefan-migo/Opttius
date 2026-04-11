import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ValidationError } from "@/lib/api/errors";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { updateContactLensFamilyWithMatricesSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const includeMatrices = searchParams.get("include_matrices") !== "false";

    const selectQuery = includeMatrices
      ? "*, contact_lens_price_matrices(*)"
      : "*";

    const { data: family, error } = await supabase
      .from("contact_lens_families")
      .select(selectQuery)
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Familia de lentes de contacto no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error fetching contact lens family", error);
      return NextResponse.json(
        { error: "Error al cargar familia de lentes de contacto" },
        { status: 500 },
      );
    }

    return NextResponse.json({ family });
  } catch (error) {
    logger.error("Error in contact lens families API GET [id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Validate body (supports optional matrices)
    const body = await parseAndValidateBody(
      request,
      updateContactLensFamilyWithMatricesSchema,
    );

    const { matrices: matricesInput, ...familyPayload } = body;

    // Update contact lens family
    const { data: family, error } = await supabase
      .from("contact_lens_families")
      .update(familyPayload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Familia de lentes de contacto no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error updating contact lens family", error);
      return NextResponse.json(
        { error: "Error al actualizar familia de lentes de contacto" },
        { status: 500 },
      );
    }

    // Sync matrices if provided
    if (matricesInput !== undefined && family) {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      const userOrganizationId = (adminUser as { organization_id?: string })
        ?.organization_id;

      const { error: deleteError } = await supabase
        .from("contact_lens_price_matrices")
        .delete()
        .eq("contact_lens_family_id", params.id);

      if (deleteError) {
        logger.error("Error deleting old matrices", deleteError);
        return NextResponse.json(
          { error: "Error al actualizar matrices de precios" },
          { status: 500 },
        );
      }

      if (matricesInput.length > 0 && userOrganizationId) {
        const matrixRows = matricesInput.map((m) => ({
          contact_lens_family_id: params.id,
          organization_id: userOrganizationId,
          sphere_min: m.sphere_min,
          sphere_max: m.sphere_max,
          cylinder_min: m.cylinder_min,
          cylinder_max: m.cylinder_max,
          axis_min: m.axis_min,
          axis_max: m.axis_max,
          addition_min: m.addition_min,
          addition_max: m.addition_max,
          base_price: m.base_price,
          cost: m.cost,
          is_active: m.is_active,
        }));

        const { error: insertError } = await supabase
          .from("contact_lens_price_matrices")
          .insert(matrixRows);

        if (insertError) {
          logger.error("Error inserting matrices", insertError);
          return NextResponse.json(
            { error: "Error al guardar matrices de precios" },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({ family });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof z.ZodError) {
      return validationErrorResponse(error);
    }
    logger.error("Error in contact lens families API PUT", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Soft delete by setting is_active to false
    const { data: family, error } = await supabase
      .from("contact_lens_families")
      .update({ is_active: false })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Familia de lentes de contacto no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error deleting contact lens family", error);
      return NextResponse.json(
        { error: "Error al desactivar familia de lentes de contacto" },
        { status: 500 },
      );
    }

    return NextResponse.json({ family });
  } catch (error) {
    logger.error("Error in contact lens families API DELETE", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
