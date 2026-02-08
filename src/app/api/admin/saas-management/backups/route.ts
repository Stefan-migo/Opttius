import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { SaasBackupService } from "@/lib/saas-backup-service";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/admin/saas-management/backups
 * List all SaaS full backups
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autorización (Solo Root o Super Admin)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: role } = await supabase.rpc("get_admin_role", {
      user_id: user.id,
    });
    if (!["root", "dev", "super_admin"].includes(role as string)) {
      return NextResponse.json(
        { error: "Forbidden: Requiere privilegios de administrador SaaS" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");

    if (fileName) {
      const downloadUrl = await SaasBackupService.getDownloadUrl(fileName);
      return NextResponse.json({ success: true, downloadUrl });
    }

    const backups = await SaasBackupService.listBackups();

    const formattedBackups = backups.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.metadata?.size || file.metadata?.size_bytes || 0,
      size_mb: (
        (file.metadata?.size || file.metadata?.size_bytes || 0) /
        1024 /
        1024
      ).toFixed(2),
      created_at: file.created_at,
    }));

    return NextResponse.json({ success: true, backups: formattedBackups });
  } catch (error: any) {
    logger.error("Error en lista de backups SaaS", { error: error.message });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/backups
 * Trigger a 100% full database backup
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Autorización estricta
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: role } = await supabase.rpc("get_admin_role", {
      user_id: user.id,
    });
    if (!["root", "dev", "super_admin"].includes(role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    logger.info("Solicitud de backup completo SaaS iniciada por", {
      userEmail: user.email,
    });

    const result = await SaasBackupService.generateFullBackup();

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
  } catch (error: any) {
    logger.error("Error en trigger de backup SaaS", { error: error.message });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/saas-management/backups
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");
    if (!fileName)
      return NextResponse.json(
        { error: "fileName id required" },
        { status: 400 },
      );

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: role } = await supabase.rpc("get_admin_role", {
      user_id: user.id,
    });
    if (!["root", "dev"].includes(role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await SaasBackupService.deleteBackup(fileName);

    return NextResponse.json({ success: true, message: "Backup eliminado" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
