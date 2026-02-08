import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/admin/system/backups
 * List all available backups from Supabase Storage for the user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    const action = searchParams.get("action");

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminRole } = await supabase.rpc("get_admin_role", {
      user_id: user.id,
    });
    if (
      !["admin", "super_admin", "root", "dev"].includes(adminRole as string)
    ) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Get user's organization_id
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = adminUser?.organization_id;

    if (!userOrganizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 },
      );
    }

    const supabaseService = createServiceRoleClient();

    // If filename and action=details, return backup details
    if (filename && action === "details") {
      // Security: Ensure requested filename belongs to the user or starts with their org ID
      // Backups are now stored as org-id/backup-id.json
      if (!filename.startsWith(userOrganizationId)) {
        return NextResponse.json(
          { error: "Access denied to this backup" },
          { status: 403 },
        );
      }

      const { data: backupFile, error: downloadError } =
        await supabaseService.storage
          .from("database-backups")
          .download(filename);

      if (downloadError || !backupFile) {
        return NextResponse.json(
          {
            error: "Error al descargar backup",
            details: downloadError?.message,
          },
          { status: 500 },
        );
      }

      const backupText = await backupFile.text();
      let backupData: any;
      try {
        backupData = JSON.parse(backupText);
      } catch (parseError) {
        return NextResponse.json(
          {
            error: "Error al parsear archivo de backup",
            details: "El archivo no es un JSON válido",
          },
          { status: 400 },
        );
      }

      // Check organization_id inside JSON for extra safety
      if (backupData.organization_id !== userOrganizationId) {
        return NextResponse.json(
          { error: "Data isolation breach detected" },
          { status: 403 },
        );
      }

      // Get file metadata
      const { data: fileInfo } = await supabaseService.storage
        .from("database-backups")
        .list(userOrganizationId, {
          search: filename.split("/").pop(),
        });

      const file = fileInfo?.[0];
      const fileSize = file?.metadata?.size || file?.metadata?.size_bytes || 0;

      const { data: signedUrlData } = await supabaseService.storage
        .from("database-backups")
        .createSignedUrl(filename, 3600);

      const totalRecords = backupData.tables
        ? Object.values(backupData.tables).reduce((sum: number, table: any) => {
            return sum + (table.record_count || 0);
          }, 0)
        : 0;

      return NextResponse.json({
        success: true,
        backup_id: backupData.backup_id,
        backup_file: filename,
        download_url: signedUrlData?.signedUrl || null,
        tables_count: Object.keys(backupData.tables).length,
        total_records: totalRecords,
        backup_size_mb: (fileSize / 1024 / 1024).toFixed(2),
        created_at: backupData.created_at,
        created_by: backupData.created_by,
      });
    }

    // List files in the organization's folder
    const { data: files, error: listError } = await supabaseService.storage
      .from("database-backups")
      .list(userOrganizationId, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (listError) {
      logger.error("Error listing backups:", { error: listError });
      return NextResponse.json(
        { error: "Error al listar backups" },
        { status: 500 },
      );
    }

    const backups = (files || []).map((file) => ({
      id: file.name.replace(".json", ""),
      filename: `${userOrganizationId}/${file.name}`,
      size: file.metadata?.size || file.metadata?.size_bytes || 0,
      size_mb: (
        (file.metadata?.size || file.metadata?.size_bytes || 0) /
        1024 /
        1024
      ).toFixed(2),
      created_at: file.created_at,
    }));

    return NextResponse.json({
      success: true,
      backups: backups,
      count: backups.length,
    });
  } catch (error) {
    logger.error("Error in backups GET API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/system/backups
 * Restore a specific backup for the user's organization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { backup_filename } = body;

    if (!backup_filename) {
      return NextResponse.json(
        { error: "backup_filename es requerido" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: adminRole } = await supabase.rpc("get_admin_role", {
      user_id: user.id,
    });
    if (
      !["admin", "super_admin", "root", "dev"].includes(adminRole as string)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = adminUser?.organization_id;
    if (!userOrganizationId)
      return NextResponse.json({ error: "Org not found" }, { status: 400 });

    // Security: Ensure the file path belongs to the organization
    if (!backup_filename.startsWith(userOrganizationId)) {
      return NextResponse.json(
        { error: "Access denied to this backup file" },
        { status: 403 },
      );
    }

    logger.info("Starting backup restoration", {
      backup_filename,
      organizationId: userOrganizationId,
    });

    const supabaseService = createServiceRoleClient();

    const { data: backupFile, error: downloadError } =
      await supabaseService.storage
        .from("database-backups")
        .download(backup_filename);

    if (downloadError || !backupFile) {
      return NextResponse.json(
        { error: "Error downloading backup" },
        { status: 500 },
      );
    }

    const backupText = await backupFile.text();
    const backupData = JSON.parse(backupText);

    // Call Restore service
    const { BackupService } = await import("@/lib/backup-service");
    const result = await BackupService.restoreBackup(
      userOrganizationId,
      backupData,
    );

    // Log the restoration activity
    await supabase.rpc("log_admin_activity", {
      action: "maintenance_restore_database",
      resource_type: "system",
      resource_id: null,
      details: {
        action: "restore_database",
        file: backup_filename,
        organization_id: userOrganizationId,
        success: result.success,
        stats: result.total_records_restored,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error in restore backup API:", { error });
    return NextResponse.json(
      { error: "Error al restaurar backup" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/system/backups
 * Delete a specific backup file
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename)
      return NextResponse.json(
        { error: "filename es requerido" },
        { status: 400 },
      );

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = adminUser?.organization_id;
    if (!userOrganizationId)
      return NextResponse.json({ error: "Org not found" }, { status: 400 });

    // Security
    if (!filename.startsWith(userOrganizationId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseService = createServiceRoleClient();
    const { error: deleteError } = await supabaseService.storage
      .from("database-backups")
      .remove([filename]);

    if (deleteError) throw deleteError;

    await supabase.rpc("log_admin_activity", {
      action: "maintenance_delete_backup",
      resource_type: "system",
      resource_id: null,
      details: {
        action: "delete_backup",
        file: filename,
        organization_id: userOrganizationId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Backup eliminado exitosamente",
    });
  } catch (error) {
    logger.error("Error in delete backup API:", { error });
    return NextResponse.json(
      { error: "Error al eliminar backup" },
      { status: 500 },
    );
  }
}
