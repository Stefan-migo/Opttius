import { appLogger as logger } from "@/lib/logger";
import type { Database, SupabaseClient } from "@/types/supabase";

export async function handleOptimizeDatabase(supabase: SupabaseClient<Database>) {
  const { data: optimizeResult, error: optimizeError } = await supabase.rpc("optimize_database");
  if (optimizeError) {
    logger.error("Error optimizing database", { error: optimizeError });
    return { error: "Error al optimizar la base de datos", details: optimizeError.message };
  }
  if (!optimizeResult?.success) {
    return { error: "Error al optimizar la base de datos", details: optimizeResult?.error || "Error desconocido" };
  }

  await supabase.rpc("log_admin_activity", {
    action: "maintenance_optimize_database", resource_type: "system", resource_id: null,
    details: { action: "optimize_database", tables_optimized: optimizeResult.tables_optimized, duration_seconds: optimizeResult.duration_seconds, initiated_by: "system" },
  });

  const tablesCount = optimizeResult.tables_optimized?.length || 0;
  const duration = optimizeResult.duration_seconds ? `${optimizeResult.duration_seconds.toFixed(2)}s` : "completado";

  return { success: true, message: `Optimización completada: ${tablesCount} tablas optimizadas en ${duration}`, action: "optimize_database", result: optimizeResult };
}
