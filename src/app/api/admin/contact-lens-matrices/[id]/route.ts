import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ValidationError } from "@/lib/api/errors";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { updateContactLensPriceMatrixSchema } from "@/lib/api/validation/zod-schemas";
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

    const { data: matrix, error } = await supabase
      .from("contact_lens_price_matrices")
      .select(
        `
        *,
        contact_lens_families (
          id,
          name,
          brand,
          use_type,
          modality,
          packaging
        )
      `,
      )
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Matriz de precios de lentes de contacto no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error fetching contact lens price matrix", error);
      return NextResponse.json(
        { error: "Error al cargar matriz de precios de lentes de contacto" },
        { status: 500 },
      );
    }

    return NextResponse.json({ matrix });
  } catch (error) {
    logger.error("Error in contact lens matrices API GET [id]", error);
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

    // Validate body
    const body = await parseAndValidateBody(
      request,
      updateContactLensPriceMatrixSchema,
    );

    // Update price matrix
    const { data: matrix, error } = await supabase
      .from("contact_lens_price_matrices")
      .update(body)
      .eq("id", params.id)
      .select(
        `
        *,
        contact_lens_families (
          id,
          name,
          brand,
          use_type,
          modality,
          packaging
        )
      `,
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Matriz de precios de lentes de contacto no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error updating contact lens price matrix", error);
      return NextResponse.json(
        {
          error: "Error al actualizar matriz de precios de lentes de contacto",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ matrix });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof z.ZodError) {
      return validationErrorResponse(error);
    }
    logger.error("Error in contact lens matrices API PUT", error);
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

    // Delete price matrix (hard delete)
    const { error } = await supabase
      .from("contact_lens_price_matrices")
      .delete()
      .eq("id", params.id);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Matriz de precios de lentes de contacto no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error deleting contact lens price matrix", error);
      return NextResponse.json(
        { error: "Error al eliminar matriz de precios de lentes de contacto" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in contact lens matrices API DELETE", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
