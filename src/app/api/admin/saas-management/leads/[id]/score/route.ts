/**
 * GET /api/admin/saas-management/leads/[id]/score
 * Obtiene el score y prioridad de un lead
 *
 * POST /api/admin/saas-management/leads/[id]/score
 * Recalcula el score de un lead
 */
import { NextRequest, NextResponse } from "next/server";

import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Obtener score del lead
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();
    const { id } = await params;

    const { data: lead, error } = await supabase
      .from("demo_requests")
      .select(
        `
        id,
        email,
        full_name,
        optica_name,
        funnel_stage,
        lead_score,
        priority_level,
        score_last_calculated_at,
        created_at,
        last_contact_at,
        demo_started_at,
        demo_expires_at,
        meeting_scheduled_at,
        next_followup_at
      `,
      )
      .eq("id", id)
      .single();

    if (error || !lead) {
      return NextResponse.json(
        { error: "Lead no encontrado" },
        { status: 404 },
      );
    }

    // Obtener desglose de score
    const { data: scoreBreakdown } = await supabase
      .from("lead_activities")
      .select(
        `
        activity_type,
        created_at
      `,
      )
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Obtener reglas de scoring
    const { data: rules } = await supabase
      .from("lead_scoring_rules")
      .select("*")
      .eq("is_active", true);

    // Calcular desglose
    const breakdown: Record<string, { count: number; points: number }> = {};
    if (scoreBreakdown) {
      for (const activity of scoreBreakdown) {
        const rule = rules?.find(
          (r) => r.activity_type === activity.activity_type,
        );
        if (rule) {
          if (!breakdown[activity.activity_type]) {
            breakdown[activity.activity_type] = { count: 0, points: 0 };
          }
          breakdown[activity.activity_type].count += 1;
          breakdown[activity.activity_type].points += rule.points;
        }
      }
    }

    return NextResponse.json({
      lead: {
        id: lead.id,
        email: lead.email,
        full_name: lead.full_name,
        optica_name: lead.optica_name,
        funnel_stage: lead.funnel_stage,
        lead_score: lead.lead_score,
        priority_level: lead.priority_level,
        score_last_calculated_at: lead.score_last_calculated_at,
        created_at: lead.created_at,
        last_contact_at: lead.last_contact_at,
        demo_started_at: lead.demo_started_at,
        demo_expires_at: lead.demo_expires_at,
        meeting_scheduled_at: lead.meeting_scheduled_at,
        next_followup_at: lead.next_followup_at,
      },
      score_breakdown: breakdown,
      scoring_rules: rules,
    });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    logger.error("Error in GET lead score", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// POST - Recalcular score del lead
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();
    const { id } = await params;

    // Verificar que el lead existe
    const { data: lead, error: leadError } = await supabase
      .from("demo_requests")
      .select("id, lead_score")
      .eq("id", id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Lead no encontrado" },
        { status: 404 },
      );
    }

    // Recalcular score
    const { data: newScore, error: scoreError } = await supabase.rpc(
      "update_lead_score_and_priority",
      { p_lead_id: id },
    );

    if (scoreError) {
      logger.error("Error recalculating lead score", scoreError);
      return NextResponse.json(
        { error: "Error al recalcular score", details: scoreError.message },
        { status: 500 },
      );
    }

    // Obtener lead actualizado
    const { data: updatedLead } = await supabase
      .from("demo_requests")
      .select("lead_score, priority_level, score_last_calculated_at")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      lead_score: updatedLead?.lead_score ?? 0,
      priority_level: updatedLead?.priority_level ?? "cold",
      score_last_calculated_at: updatedLead?.score_last_calculated_at,
    });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    logger.error("Error in POST lead score recalculate", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
