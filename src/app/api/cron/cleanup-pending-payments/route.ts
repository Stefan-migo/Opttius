/**
 * GET /api/cron/cleanup-pending-payments
 * Triggered by Vercel Cron. Marks payments with status=pending and created_at > 24h ago.
 * Requires CRON_SECRET for authorization.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      request.headers.get("x-cron-secret") !== process.env.CRON_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    const cutoffIso = cutoff.toISOString();

    const { data: updated, error } = await supabase
      .from("payments")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "pending")
      .lt("created_at", cutoffIso)
      .select("id");

    if (error) {
      logger.error("Cleanup pending payments failed", error);
      return NextResponse.json(
        { error: "Cleanup failed", details: error.message },
        { status: 500 },
      );
    }

    const count = updated?.length ?? 0;
    if (count > 0) {
      logger.info("Cleanup pending payments", {
        count,
        cutoff: cutoffIso,
      });
    }

    return NextResponse.json({
      success: true,
      expiredCount: count,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      "Cleanup pending payments error",
      err instanceof Error ? err : new Error(msg),
    );
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
