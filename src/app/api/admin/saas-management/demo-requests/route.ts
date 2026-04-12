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

    // Use * to avoid column errors - Supabase will handle missing columns gracefully
    let query = supabase
      .from("demo_requests")
      .select("*", { count: "exact" })
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
