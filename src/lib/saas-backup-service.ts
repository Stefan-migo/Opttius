import { exec } from "child_process";
import { promisify } from "util";
import { createServiceRoleClient } from "@/lib/supabase";
import { appLogger as logger } from "@/lib/logger";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export interface SaasBackupResult {
  success: boolean;
  backupId: string;
  fileName: string;
  sizeBytes: number;
  durationSeconds: number;
  error?: string;
}

export class SaasBackupService {
  /**
   * Generates a 100% full database dump using pg_dump
   * Currently designed for local/docker environments
   */
  static async generateFullBackup(): Promise<SaasBackupResult> {
    const startTime = Date.now();
    const backupId = `full_backup_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const tempFilePath = path.join(os.tmpdir(), `${backupId}.sql`);
    const supabaseService = createServiceRoleClient();

    try {
      logger.info(
        "Iniciando volcado completo de base de datos (SaaS Full Backup)",
      );

      /**
       * Ejecutamos pg_dump dentro del contenedor de base de datos.
       * Nota: Esto asume que Docker está disponible en el host.
       * Si se despliega en Vercel, este método requerirá adaptación (usar API de Supabase o Tunnel).
       */
      const dumpCommand = `docker exec supabase_db_web pg_dump -U postgres postgres > "${tempFilePath}"`;

      await execAsync(dumpCommand);

      const fileStats = fs.statSync(tempFilePath);
      const fileBuffer = fs.readFileSync(tempFilePath);

      const fileName = `${backupId}.sql`;

      // Subir al bucket saas-backups
      const { error: uploadError } = await supabaseService.storage
        .from("saas-backups")
        .upload(fileName, fileBuffer, {
          contentType: "application/sql",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Limpiar archivo temporal
      fs.unlinkSync(tempFilePath);

      const duration = (Date.now() - startTime) / 1000;

      logger.info("SaaS Full Backup completado exitosamente", {
        backupId,
        sizeBytes: fileStats.size,
        durationSeconds: duration,
      });

      return {
        success: true,
        backupId,
        fileName,
        sizeBytes: fileStats.size,
        durationSeconds: duration,
      };
    } catch (error: any) {
      logger.error("Error crítico en SaaS Full Backup", {
        error: error.message,
      });

      // Intentar limpiar si el archivo existe
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

      return {
        success: false,
        backupId: "",
        fileName: "",
        sizeBytes: 0,
        durationSeconds: (Date.now() - startTime) / 1000,
        error: error.message,
      };
    }
  }

  /**
   * Lists all available SaaS full backups
   */
  static async listBackups() {
    const supabaseService = createServiceRoleClient();
    const { data, error } = await supabaseService.storage
      .from("saas-backups")
      .list("", {
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) throw error;
    return data || [];
  }

  /**
   * Deletes a specific SaaS backup
   */
  static async deleteBackup(fileName: string) {
    const supabaseService = createServiceRoleClient();
    const { error } = await supabaseService.storage
      .from("saas-backups")
      .remove([fileName]);

    if (error) throw error;
    return true;
  }
  /**
   * Generates a signed URL for downloading a SaaS backup
   */
  static async getDownloadUrl(fileName: string) {
    const supabaseService = createServiceRoleClient();
    const { data, error } = await supabaseService.storage
      .from("saas-backups")
      .createSignedUrl(fileName, 3600); // 1 hora de validez

    if (error) throw error;
    return data?.signedUrl;
  }
}
