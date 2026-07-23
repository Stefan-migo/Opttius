import type { Database, SupabaseClient } from "@/types/supabase";

export async function handleClearMemory(supabase: SupabaseClient<Database>) {
  const memoryBefore = process.memoryUsage();
  const memoryBeforeMB = {
    heapUsed: (memoryBefore.heapUsed / 1024 / 1024).toFixed(2),
    heapTotal: (memoryBefore.heapTotal / 1024 / 1024).toFixed(2),
    external: (memoryBefore.external / 1024 / 1024).toFixed(2),
  };

  let gcSuccess = false;
  let gcError: string | null = null;

  try {
    if (global.gc) { global.gc(); gcSuccess = true; }
    else { gcError = "Garbage collection no está disponible. El servidor limpiará memoria automáticamente."; }
  } catch (error) {
    gcError = error instanceof Error ? error.message : "Error desconocido al limpiar memoria";
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  const memoryAfter = process.memoryUsage();
  const memoryAfterMB = {
    heapUsed: (memoryAfter.heapUsed / 1024 / 1024).toFixed(2),
    heapTotal: (memoryAfter.heapTotal / 1024 / 1024).toFixed(2),
    external: (memoryAfter.external / 1024 / 1024).toFixed(2),
  };

  const memoryFreed = (parseFloat(memoryBeforeMB.heapUsed) - parseFloat(memoryAfterMB.heapUsed)).toFixed(2);

  await supabase.rpc("log_admin_activity", {
    action: "maintenance_clear_memory", resource_type: "system", resource_id: null,
    details: { action: "clear_memory", memory_before: memoryBeforeMB, memory_after: memoryAfterMB, memory_freed_mb: memoryFreed, gc_success: gcSuccess, gc_error: gcError, initiated_by: "system" },
  });

  const message = gcSuccess
    ? `Memoria limpiada: ${memoryFreed} MB liberados (${memoryAfterMB.heapUsed} MB actual)`
    : `Memoria monitoreada. ${gcError || "El servidor limpiará memoria automáticamente cuando sea necesario."}`;

  return { success: true, message, action: "clear_memory", memory_before: memoryBeforeMB, memory_after: memoryAfterMB, memory_freed_mb: parseFloat(memoryFreed), gc_success: gcSuccess };
}
