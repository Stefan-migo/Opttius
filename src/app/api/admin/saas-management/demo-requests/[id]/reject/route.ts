/**
 * POST /api/admin/saas-management/demo-requests/[id]/reject
 * Reject a demo request (root only)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireRoot(request);
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { data: req, error: fetchError } = await supabase
      .from("demo_requests")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !req) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 },
      );
    }

    if (req.status !== "pending") {
      return NextResponse.json(
        { error: "La solicitud ya fue procesada" },
        { status: 400 },
      );
    }

    await supabase
      .from("demo_requests")
      .update({
        status: "rejected",
        funnel_stage: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        last_contact_at: new Date().toISOString(),
      })
      .eq("id", id);

    logger.info("Demo request rejected", { requestId: id });

    return NextResponse.json({
      success: true,
      message: "Solicitud rechazada",
    });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    logger.error("Error in POST demo-requests reject", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
