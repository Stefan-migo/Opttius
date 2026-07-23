import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

export async function handleBackupDatabase(userOrganizationId: string, userEmail: string, branchId?: string, supabase?: unknown) {
  const { BackupService } = await import("@/lib/backup-service");
  logger.info("Iniciando backup de base de datos", { organizationId: userOrganizationId, userEmail });

  const backupData = await BackupService.generateBackup(userOrganizationId, userEmail, branchId);
  const backupId = backupData.backup_id;
  const backupJson = JSON.stringify(backupData, null, 2);
  const backupBuffer = Buffer.from(backupJson, "utf-8");
  const backupSize = backupBuffer.length;

  const backupFileName = `${userOrganizationId}/${backupId}.json`;
  const supabaseService = createServiceRoleClient();

  const { error: uploadError } = await supabaseService.storage
    .from("database-backups").upload(backupFileName, backupBuffer, {
      contentType: "application/json", cacheControl: "3600", upsert: false,
    });
  if (uploadError) throw new Error(`Error en la subida: ${uploadError.message}`);

  const { data: signedUrlData } = await supabaseService.storage
    .from("database-backups").createSignedUrl(backupFileName, 3600);

  const totalRecords = Object.values(backupData.tables).reduce(
    (sum: number, table: unknown) => sum + (table.record_count || 0), 0,
  );

  await supabase?.rpc("log_admin_activity", {
    action: "maintenance_backup_database", resource_type: "system", resource_id: null,
    details: { action: "backup_database", backup_id: backupId, file: backupFileName, organization_id: userOrganizationId, stats: totalRecords, size_mb: (backupSize / 1024 / 1024).toFixed(2), tables_count: Object.keys(backupData.tables).length },
  });

  return {
    success: true,
    message: "Backup completado exitosamente para la organización.",
    backup_id: backupId, backup_file: backupFileName,
    download_url: signedUrlData?.signedUrl || null,
    tables_count: Object.keys(backupData.tables).length,
    total_records: totalRecords,
    backup_size_mb: (backupSize / 1024 / 1024).toFixed(2),
  };
}
