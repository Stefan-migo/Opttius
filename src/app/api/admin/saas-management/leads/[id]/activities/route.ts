/**
 * GET /api/admin/saas-management/leads/[id]/activities
 * Obtiene el historial de actividades de un lead
 *
 * POST /api/admin/saas-management/leads/[id]/activities
 * Registra una nueva actividad para el lead
 */
import { NextRequest, NextResponse } from "next/server";

import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Obtener actividades del lead
export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();

  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();
    const { id } = await params;

    logger.info("Fetching lead activities", { leadId: id, startTime });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const activityType = searchParams.get("activity_type");

    // Simplified query without complex joins
    let query = supabase
      .from("lead_activities")
      .select("*", { count: "exact" })
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (activityType) {
      query = query.eq("activity_type", activityType);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error("Error fetching lead activities", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        leadId: id,
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: "Error al obtener actividades", details: error.message },
        { status: 500 },
      );
    }

    // Obtener info del lead
    const { data: lead } = await supabase
      .from("demo_requests")
      .select("id, email, full_name, optica_name, lead_score, priority_level")
      .eq("id", id)
      .single();

    logger.info("Lead activities fetched successfully", {
      leadId: id,
      count: count ?? 0,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      activities: data ?? [],
      total: count ?? 0,
      lead: lead,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Error in GET lead activities", {
      error: errorMessage,
      leadId: (await params).id,
      duration: Date.now() - startTime,
    });

    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor", details: errorMessage },
      { status: 500 },
    );
  }
}

// POST - Registrar nueva actividad
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();
    const { id } = await params;

    const body = await request.json();
    const { activity_type, description, metadata } = body;

    // Validar tipo de actividad
    const validTypes = [
      "lead_created",
      "email_sent",
      "email_opened",
      "email_clicked",
      "email_bounced",
      "demo_accessed",
      "demo_login",
      "meeting_scheduled",
      "meeting_completed",
      "meeting_cancelled",
      "call_logged",
      "note_added",
      "stage_changed",
      "score_updated",
      "assigned",
      "outbound_call",
      "pricing_sent",
      "proposal_viewed",
      "manual_email_sent",
    ];

    if (!activity_type || !validTypes.includes(activity_type)) {
      return NextResponse.json(
        { error: "Tipo de actividad inválido", valid_types: validTypes },
        { status: 400 },
      );
    }

    // Obtener usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Insertar actividad usando la función
    const { data: activity, error } = await supabase.rpc(
      "record_lead_activity",
      {
        p_lead_id: id,
        p_activity_type: activity_type,
        p_description: description,
        p_metadata: metadata || {},
        p_created_by: user?.id,
      },
    );

    if (error) {
      logger.error("Error recording lead activity", error);
      return NextResponse.json(
        { error: "Error al registrar actividad", details: error.message },
        { status: 500 },
      );
    }

    // Obtener lead actualizado
    const { data: lead } = await supabase
      .from("demo_requests")
      .select("lead_score, priority_level, score_last_calculated_at")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      activity_id: activity,
      lead_score: lead?.lead_score ?? 0,
      priority_level: lead?.priority_level ?? "cold",
    });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    logger.error("Error in POST lead activity", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
