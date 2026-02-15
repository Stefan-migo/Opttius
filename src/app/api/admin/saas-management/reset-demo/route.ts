import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * POST /api/admin/saas-management/reset-demo
 * Reset the Demo Optica database to initial seed state (solo root/dev)
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { error } = await supabaseServiceRole.rpc("reset_demo_organization");

    if (error) {
      const errMsg = (error as { message?: string }).message ?? String(error);
      const errDetails = (error as { details?: string }).details;
      const errCode = (error as { code?: string }).code;
      const errHint = (error as { hint?: string }).hint;
      logger.error("Error resetting demo organization", {
        message: errMsg,
        details: errDetails,
        code: errCode,
        hint: errHint,
      });
      return NextResponse.json(
        {
          error: errMsg || "Error al resetear la Óptica Demo",
          details: errMsg,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    logger.error("Reset demo failed", { error: err });
    const status = err instanceof AuthorizationError ? err.statusCode : 500;
    return NextResponse.json(
      { error: message || "Error al resetear la Óptica Demo" },
      { status },
    );
  }
}
