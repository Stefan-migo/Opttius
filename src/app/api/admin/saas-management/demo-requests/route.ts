/**
 * GET /api/admin/saas-management/demo-requests
 * List demo requests with filters (root/dev only)
 */
import { NextRequest, NextResponse } from "next/server";

import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const funnelStage = searchParams.get("funnel_stage");
    const funnelStages = searchParams.get("funnel_stages"); // comma-separated for multiple
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Only select fields that definitely exist in the table
    const selectFields = [
      "id",
      "email",
      "full_name",
      "optica_name",
      "phone",
      "source",
      "status",
      "funnel_stage",
      "created_at",
      "reviewed_at",
      "reviewed_by",
      "organization_id",
      "metadata",
      "demo_started_at",
      "demo_expires_at",
      "meeting_url",
      "meeting_scheduled_at",
      "meeting_completed_at",
      "offer_sent_at",
      "offer_type",
      "offer_details",
      "conversion_date",
      "lost_reason",
      "notes",
      "last_contact_at",
      "last_email_sent",
      "last_email_sent_at",
      "login_count",
      "last_login_at",
      "lead_score",
      "priority_level",
      "score_last_calculated_at",
      "assigned_to",
      "next_followup_at",
      "first_contact_at",
      "utm_source",
      "utm_medium",
      "utm_campaign",
    ].join(", ");

    let query = supabase
      .from("demo_requests")
      .select(selectFields, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query = query.eq("status", status);
    }
    if (funnelStage) {
      const validStages = [
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
      ];
      if (validStages.includes(funnelStage)) {
        query = query.eq("funnel_stage", funnelStage);
      }
    }
    if (funnelStages) {
      const stages = funnelStages
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (stages.length > 0) {
        // Validate all stages are valid before querying
        const validStages = [
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
        ];
        const validInputStages = stages.filter((s) => validStages.includes(s));
        if (validInputStages.length > 0) {
          query = query.in("funnel_stage", validInputStages);
        } else {
          logger.warn("Invalid funnel_stages provided", { stages });
        }
      }
    }

    logger.info("Fetching demo requests", {
      limit,
      offset,
      status,
      funnelStage,
      funnelStages,
      duration: Date.now() - startTime,
    });

    const { data, error, count } = await query;

    if (error) {
      logger.error("Error listing demo requests", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: "Error al listar solicitudes", details: error.message },
        { status: 500 },
      );
    }

    logger.info("Demo requests fetched successfully", {
      count: count ?? 0,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      requests: data ?? [],
      total: count ?? 0,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Error in GET demo-requests", {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
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
