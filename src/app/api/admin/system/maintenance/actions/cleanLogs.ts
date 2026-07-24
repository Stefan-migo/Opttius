import { appLogger as logger } from "@/lib/logger";
import type { Database, SupabaseClient } from "@/types/supabase";

export async function handleCleanLogs(supabase: SupabaseClient<Database>) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { count: deletedCount, error: deleteError } = await supabase
    .from("admin_activity_log").delete({ count: "exact" }).lt("created_at", ninetyDaysAgo);

  if (deleteError) {
    logger.error("Error cleaning logs", { error: deleteError });
    return { error: "Error al limpiar logs" };
  }

  await supabase.rpc("log_admin_activity", {
    action: "maintenance_clean_logs", resource_type: "system", resource_id: null,
    details: { action: "clean_logs", logs_deleted: deletedCount || 0, initiated_by: "system" },
  });

  return { success: true, message: `Se eliminaron ${deletedCount || 0} registros de logs antiguos`, action: "clean_logs", logs_deleted: deletedCount || 0 };
}
