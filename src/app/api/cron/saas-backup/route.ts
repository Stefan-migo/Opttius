import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { SaasBackupService } from "@/lib/saas-backup-service";

/**
 * POST /api/cron/saas-backup
 * Called by GitHub Actions after uploading a pg_dump to Storage.
 * Registers the backup in saas_backups table.
 * Requires CRON_SECRET or SAAS_BACKUP_SECRET.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.SAAS_BACKUP_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  if (
    authHeader !== `Bearer ${cronSecret}` &&
    request.headers.get("x-cron-secret") !== cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { filename, size_bytes: sizeBytes } = body;

    if (!filename || typeof sizeBytes !== "number") {
      return NextResponse.json(
        { error: "filename and size_bytes (number) required" },
        { status: 400 },
      );
    }

    const result = await SaasBackupService.registerExternalBackup(
      filename,
      sizeBytes,
    );

    if (result.success) {
      logger.info("Backup externo registrado", { filename, sizeBytes });
      return NextResponse.json({
        success: true,
        message: "Backup registrado",
        filename,
      });
    }

    return NextResponse.json(
      { error: result.error || "Failed to register backup" },
      { status: 500 },
    );
  } catch (error: unknown) {
    logger.error("Error en registro de backup SaaS", { error: error.message });
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
