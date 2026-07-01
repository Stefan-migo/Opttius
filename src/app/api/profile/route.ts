import { NextRequest, NextResponse } from "next/server";

import { profileUpdateSchema } from "@/lib/api/validation/profile-schemas";
import { getProfileErrorMessage } from "@/lib/profile/error-messages";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/profile
 *
 * Actualiza el perfil del usuario autenticado.
 * Validación server-side con Zod.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      const message = firstError?.message ?? "Datos inválidos";
      return NextResponse.json(
        { error: message, details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updates = parsed.data;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(cleanUpdates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      const message = getProfileErrorMessage(error);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    logger.error("Profile PATCH error:", err);
    return NextResponse.json(
      { error: "Error interno al actualizar el perfil" },
      { status: 500 },
    );
  }
}
