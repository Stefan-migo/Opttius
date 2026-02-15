import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { updateContactLensFamilySchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { ValidationError } from "@/lib/api/errors";
import { z } from "zod";

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

    const { data: family, error } = await supabase
      .from("contact_lens_families")
      .select("*")
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

    // Validate body
    const body = await parseAndValidateBody(
      request,
      updateContactLensFamilySchema,
    );

    // Update contact lens family
    const { data: family, error } = await supabase
      .from("contact_lens_families")
      .update(body)
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
