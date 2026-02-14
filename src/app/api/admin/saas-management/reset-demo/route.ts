import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * POST /api/admin/saas-management/reset-demo
 * Reset the Demo Optica database to initial seed state (solo root/dev)
 */
export async function POST(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { error } = await supabaseServiceRole.rpc("reset_demo_organization");

    if (error) {
      logger.error("Error resetting demo organization", { error });
      return NextResponse.json(
        {
          error: "Error al resetear la Óptica Demo",
          details: error.message,
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
