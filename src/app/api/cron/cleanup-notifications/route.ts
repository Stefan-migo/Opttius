import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/lib/supabase";

/**
 * GET /api/cron/cleanup-notifications
 * Triggered by Vercel Cron. Runs cleanup_old_notifications() to:
 * - Delete expired notifications
 * - Archive read notifications older than 90 days
 *
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

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.rpc("cleanup_old_notifications");

    if (error) {
      logger.error("Cleanup notifications cron failed", { error });
      return NextResponse.json(
        { error: "Cleanup failed", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification cleanup completed",
    });
  } catch (error: unknown) {
    logger.error("Cleanup notifications cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
