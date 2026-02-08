import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { appLogger as logger } from "@/lib/logger";
import { BackupService } from "@/lib/backup-service";

/**
 * GET /api/cron/backups
 * Triggered by Vercel Cron or external scheduler
 * Backs up all active organizations.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  // Basic security check - in production use CRON_SECRET
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    request.headers.get("x-cron-secret") !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const startTime = Date.now();
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Fetch all active organizations
    const { data: organizations, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("status", "active");

    if (orgsError) {
      throw new Error(`Failed to fetch organizations: ${orgsError.message}`);
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ message: "No active organizations found" });
    }

    logger.info(
      `Starting scheduled backup for ${organizations.length} organizations`,
    );

    // Process sequentially to be gentle on DB, even if slower.
    for (const org of organizations) {
      try {
        logger.info(`Backing up org: ${org.slug} (${org.id})`);

        const backupData = await BackupService.generateBackup(
          org.id,
          "system-cron",
        );
        const backupJson = JSON.stringify(backupData, null, 2);
        const backupBuffer = Buffer.from(backupJson, "utf-8");
        // Guardar en carpeta específica de la organización
        const backupFileName = `${org.id}/${backupData.backup_id}.json`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("database-backups")
          .upload(backupFileName, backupBuffer, {
            contentType: "application/json",
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        results.success++;
      } catch (e: any) {
        logger.error(`Backup failed for org ${org.slug}`, { error: e });
        results.failed++;
        results.errors.push(`${org.slug}: ${e.message}`);
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: true,
      processed: organizations.length,
      results,
      duration_seconds: duration,
    });
  } catch (error: any) {
    logger.error("Cron backup job failed", { error });
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
