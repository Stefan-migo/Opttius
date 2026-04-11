/**
 * DELETE /api/admin/saas-management/demo-requests/[id]
 * Deletes a demo request and all associated data (demo org if approved). Root only.
 */
import { NextRequest, NextResponse } from "next/server";

import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoot(request);
    const { id } = await params;

    const supabase = createServiceRoleClient();

    const { data: req, error: fetchError } = await supabase
      .from("demo_requests")
      .select("id, email, organization_id")
      .eq("id", id)
      .single();

    if (fetchError || !req) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 },
      );
    }

    const { data: result, error: rpcError } = await supabase.rpc(
      "delete_demo_request_and_org",
      { p_request_id: id },
    );

    if (rpcError) {
      logger.error("Error deleting demo request", {
        error: rpcError,
        requestId: id,
      });
      return NextResponse.json(
        {
          error: "Error al eliminar la solicitud",
          details: rpcError.message,
        },
        { status: 500 },
      );
    }

    logger.info("Demo request deleted", {
      requestId: id,
      email: req.email,
      organizationId: req.organization_id,
    });

    return NextResponse.json({
      success: true,
      message: "Solicitud y datos asociados eliminados correctamente",
    });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    logger.error("Error in DELETE demo-requests", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
