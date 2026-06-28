import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

const execAsync = promisify(exec);

const BUCKET_NAME = "saas-backups";

export interface SaasBackupResult {
  success: boolean;
  backupId: string;
  fileName: string;
  sizeBytes: number;
  durationSeconds: number;
  error?: string;
}

export interface SaasBackupRecord {
  id: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  size_mb: string;
  backup_type: string;
  status: string;
  created_at: string;
  source: string;
}

export class SaasBackupService {
  /**
   * Generates a 100% full database dump using pg_dump.
   * - Local: uses docker exec supabase_db_web
   * - Production: uses DIRECT_DATABASE_URL (requires pg_dump in env, e.g. GitHub Actions)
   */
  static async generateFullBackup(
    createdBy?: string,
  ): Promise<SaasBackupResult> {
    const startTime = Date.now();
    const backupId = `full_backup_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const tempFilePath = path.join(os.tmpdir(), `${backupId}.sql`);
    const supabaseService = createServiceRoleClient();

    try {
      logger.info(
        "Iniciando volcado completo de base de datos (SaaS Full Backup)",
      );

      let dumpCommand: string;

      const directUrl = process.env.DIRECT_DATABASE_URL;
      const hasDocker =
        process.env.RUNNING_IN_DOCKER !== "true" && !process.env.VERCEL;

      if (hasDocker) {
        dumpCommand = `docker exec supabase_db_web pg_dump -U postgres postgres > "${tempFilePath}"`;
      } else if (directUrl) {
        dumpCommand = `pg_dump "${directUrl}" --no-owner --no-privileges -F p > "${tempFilePath}"`;
      } else {
        throw new Error(
          "Backup no disponible: requiere Docker (local) o DIRECT_DATABASE_URL con pg_dump (producción). " +
            "Para producción use el backup diario vía GitHub Actions.",
        );
      }

      await execAsync(dumpCommand);

      const fileStats = fs.statSync(tempFilePath);
      const fileBuffer = fs.readFileSync(tempFilePath);

      const fileName = `${backupId}.sql`;

      const { error: uploadError } = await supabaseService.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          contentType: "application/sql",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabaseService
        .from("saas_backups")
        .insert({
          filename: fileName,
          storage_path: fileName,
          size_bytes: fileStats.size,
          backup_type: "full",
          status: "completed",
          created_by: createdBy || null,
          source: hasDocker ? "manual" : "cron",
        });

      if (insertError) {
        logger.warn("No se pudo registrar backup en saas_backups", {
          error: insertError.message,
        });
      }

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
    } catch (error: unknown) {
      logger.error("Error crítico en SaaS Full Backup", {
        error: error.message,
      });

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
   * Registers a backup created externally (e.g. by GitHub Actions).
   * The file must already exist in Storage.
   */
  static async registerExternalBackup(
    filename: string,
    sizeBytes: number,
  ): Promise<{ success: boolean; error?: string }> {
    const supabaseService = createServiceRoleClient();

    const { error } = await supabaseService.from("saas_backups").insert({
      filename,
      storage_path: filename,
      size_bytes: sizeBytes,
      backup_type: "full",
      status: "completed",
      source: "github_actions",
    });

    if (error) {
      logger.error("Error registrando backup externo", {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  /**
   * Lists backups from saas_backups table (primary) with fallback to Storage.
   */
  static async listBackups(): Promise<SaasBackupRecord[]> {
    const supabaseService = createServiceRoleClient();

    const { data: tableData, error: tableError } = await supabaseService
      .from("saas_backups")
      .select(
        "id, filename, storage_path, size_bytes, backup_type, status, created_at, source",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (!tableError && tableData && tableData.length > 0) {
      return tableData.map((row) => ({
        id: row.id,
        filename: row.filename,
        storage_path: row.storage_path,
        size_bytes: row.size_bytes,
        size_mb: (row.size_bytes / 1024 / 1024).toFixed(2),
        backup_type: row.backup_type,
        status: row.status,
        created_at: row.created_at,
        source: row.source || "manual",
      }));
    }

    const { data: storageData, error: storageError } =
      await supabaseService.storage.from(BUCKET_NAME).list("", {
        sortBy: { column: "created_at", order: "desc" },
      });

    if (storageError || !storageData) return [];

    return storageData.map((file) => ({
      id: file.id || file.name,
      filename: file.name,
      storage_path: file.name,
      size_bytes: file.metadata?.size || file.metadata?.size_bytes || 0,
      size_mb: (
        (file.metadata?.size || file.metadata?.size_bytes || 0) /
        1024 /
        1024
      ).toFixed(2),
      backup_type: "full",
      status: "completed",
      created_at: file.created_at || new Date().toISOString(),
      source: "legacy",
    }));
  }

  /**
   * Deletes a backup (from Storage and saas_backups table).
   */
  static async deleteBackup(fileName: string) {
    const supabaseService = createServiceRoleClient();

    await supabaseService
      .from("saas_backups")
      .delete()
      .eq("filename", fileName);

    const { error } = await supabaseService.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) throw error;
    return true;
  }

  /**
   * Generates a signed URL for downloading a backup.
   */
  static async getDownloadUrl(fileName: string) {
    const supabaseService = createServiceRoleClient();
    const { data, error } = await supabaseService.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 3600);

    if (error) throw error;
    return data?.signedUrl;
  }
}
