import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

/**
 * GET /api/cron/cleanup-expired-demos
 * Triggered by Vercel Cron daily.
 * Deletes demo organizations whose expires_at has passed (7-day demos).
 * Requires CRON_SECRET for authorization.
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    request.headers.get("x-cron-secret") !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  try {
    const { data: deleted, error } = await supabase.rpc(
      "cleanup_expired_demo_organizations",
    );

    if (error) {
      logger.error("Cleanup expired demos cron failed", { error });
      return NextResponse.json(
        { error: "Cleanup failed", details: error.message },
        { status: 500 },
      );
    }

    const count = Array.isArray(deleted) ? deleted.length : 0;
    logger.info("Cleanup expired demos cron completed", {
      deletedCount: count,
      orgs: deleted,
    });

    return NextResponse.json({
      success: true,
      deletedCount: count,
      deleted: deleted ?? [],
    });
  } catch (err: unknown) {
    logger.error("Cleanup expired demos cron error", { error: err });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
