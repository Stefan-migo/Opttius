/**
 * PATCH /api/admin/saas-management/demo-requests/[id]/funnel
 * Update funnel stage and associated fields (root only)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const VALID_STAGES = [
  "pending",
  "approved",
  "rejected",
  "demo_expiring",
  "demo_expired",
  "meeting_scheduled",
  "post_meeting",
  "negotiation",
  "migration",
  "converted",
  "lost",
] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected"],
  approved: ["demo_expiring", "demo_expired", "meeting_scheduled"],
  demo_expiring: ["demo_expired", "meeting_scheduled"],
  demo_expired: ["meeting_scheduled", "lost"],
  meeting_scheduled: ["post_meeting", "lost"],
  post_meeting: ["negotiation", "lost"],
  negotiation: ["migration", "lost"],
  migration: ["converted", "lost"],
  rejected: [],
  converted: [],
  lost: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireRoot(request);
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const body = await request.json().catch(() => ({}));
    const {
      funnel_stage,
      meeting_url,
      meeting_scheduled_at,
      notes,
      offer_type,
      offer_details,
      lost_reason,
    } = body as {
      funnel_stage?: string;
      meeting_url?: string;
      meeting_scheduled_at?: string;
      notes?: string;
      offer_type?: string;
      offer_details?: Record<string, unknown>;
      lost_reason?: string;
    };

    if (
      !funnel_stage ||
      !VALID_STAGES.includes(funnel_stage as (typeof VALID_STAGES)[number])
    ) {
      return NextResponse.json(
        { error: "funnel_stage requerido y debe ser válido" },
        { status: 400 },
      );
    }

    const { data: req, error: fetchError } = await supabase
      .from("demo_requests")
      .select("id, funnel_stage")
      .eq("id", id)
      .single();

    if (fetchError || !req) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 },
      );
    }

    const currentStage = (req.funnel_stage as string) || "pending";
    const allowed = VALID_TRANSITIONS[currentStage] ?? [];
    if (funnel_stage !== currentStage && !allowed.includes(funnel_stage)) {
      return NextResponse.json(
        {
          error: `Transición no válida: de ${currentStage} a ${funnel_stage}. Permitidas: ${allowed.join(", ") || "ninguna"}`,
        },
        { status: 400 },
      );
    }

    if (
      funnel_stage === "meeting_scheduled" &&
      !meeting_url &&
      !meeting_scheduled_at
    ) {
      return NextResponse.json(
        {
          error:
            "meeting_url o meeting_scheduled_at requerido para agendar reunión",
        },
        { status: 400 },
      );
    }

    if (funnel_stage === "lost" && !lost_reason?.trim()) {
      return NextResponse.json(
        { error: "lost_reason requerido al marcar como perdido" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      funnel_stage,
      last_contact_at: now,
    };

    if (notes !== undefined) updates.notes = notes;
    if (meeting_url !== undefined) updates.meeting_url = meeting_url;
    if (meeting_scheduled_at !== undefined)
      updates.meeting_scheduled_at = meeting_scheduled_at;

    if (funnel_stage === "meeting_scheduled") {
      updates.meeting_scheduled_at = meeting_scheduled_at || now;
    }

    if (funnel_stage === "post_meeting") {
      updates.meeting_completed_at = now;
    }

    if (funnel_stage === "negotiation") {
      updates.offer_sent_at = now;
      if (offer_type) updates.offer_type = offer_type;
      if (offer_details) updates.offer_details = offer_details;
    }

    if (funnel_stage === "converted") {
      updates.conversion_date = now;
    }

    if (funnel_stage === "lost") {
      updates.lost_reason = lost_reason?.trim() ?? "";
    }

    const { error: updateError } = await supabase
      .from("demo_requests")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      logger.error("Error updating funnel stage", { error: updateError, id });
      return NextResponse.json(
        { error: "Error al actualizar etapa", details: updateError.message },
        { status: 500 },
      );
    }

    logger.info("Demo funnel stage updated", {
      requestId: id,
      from: currentStage,
      to: funnel_stage,
      userId,
    });

    return NextResponse.json({
      success: true,
      funnel_stage,
      message: "Etapa actualizada",
    });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    logger.error("Error in PATCH demo-requests funnel", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
