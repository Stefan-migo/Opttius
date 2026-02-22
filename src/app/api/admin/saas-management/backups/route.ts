import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createClient } from "@/utils/supabase/server";
import { SaasBackupService } from "@/lib/saas-backup-service";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * GET /api/admin/saas-management/backups
 * List all SaaS full backups (root/dev only)
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");

    if (fileName) {
      const downloadUrl = await SaasBackupService.getDownloadUrl(fileName);
      return NextResponse.json({ success: true, downloadUrl });
    }

    const backups = await SaasBackupService.listBackups();

    const formattedBackups = backups.map((file) => ({
      id: file.id,
      name: file.filename,
      size: file.size_bytes,
      size_mb: file.size_mb,
      created_at: file.created_at,
      source: file.source,
    }));

    return NextResponse.json({ success: true, backups: formattedBackups });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error en lista de backups SaaS", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/backups
 * Trigger a 100% full database backup (root/dev only)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRoot(request);
    const supabase = await createClient();

    logger.info("Solicitud de backup completo SaaS iniciada por", {
      userId,
    });

    const result = await SaasBackupService.generateFullBackup(userId);

    if (result.success) {
      await supabase.rpc("log_admin_activity", {
        action: "saas_full_backup_complete",
        resource_type: "system",
        resource_id: null,
        details: {
          backup_id: result.backupId,
          size_mb: (result.sizeBytes / 1024 / 1024).toFixed(2),
          duration: result.durationSeconds,
        },
      });
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: "Error durante el volcado", details: result.error },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error en trigger de backup SaaS", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/saas-management/backups (root/dev only)
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireRoot(request);

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");
    if (!fileName)
      return NextResponse.json(
        { error: "fileName id required" },
        { status: 400 },
      );

    await SaasBackupService.deleteBackup(fileName);

    return NextResponse.json({ success: true, message: "Backup eliminado" });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
