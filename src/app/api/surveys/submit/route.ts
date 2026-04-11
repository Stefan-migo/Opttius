import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

const surveySubmitSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  score: z.number().int().min(1).max(5, "La puntuación debe ser entre 1 y 5"),
  comment: z.string().max(1000).optional(),
});

/**
 * POST /api/surveys/submit
 * Public endpoint - submit satisfaction survey response (no auth required)
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = surveySubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { token, score, comment } = parsed.data;
    const supabase = createServiceRoleClient();

    // Find invitation by token
    const { data: invitation, error: invError } = await supabase
      .from("survey_invitations")
      .select(
        "id, organization_id, work_order_id, customer_id, used_at, expires_at",
      )
      .eq("token", token)
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: "Enlace inválido o expirado" },
        { status: 404 },
      );
    }

    if (invitation.used_at) {
      return NextResponse.json(
        { error: "Esta encuesta ya fue respondida" },
        { status: 400 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      return NextResponse.json(
        { error: "Este enlace ha expirado" },
        { status: 400 },
      );
    }

    // Insert survey response
    const { error: insertError } = await supabase
      .from("customer_satisfaction_surveys")
      .insert({
        organization_id: invitation.organization_id,
        work_order_id: invitation.work_order_id,
        customer_id: invitation.customer_id,
        score,
        comment: comment || null,
        token_used: token,
      });

    if (insertError) {
      logger.error("Error inserting survey response", insertError);
      return NextResponse.json(
        { error: "Error al guardar la respuesta" },
        { status: 500 },
      );
    }

    // Mark invitation as used
    await supabase
      .from("survey_invitations")
      .update({ used_at: now.toISOString() })
      .eq("id", invitation.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Survey submit error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
