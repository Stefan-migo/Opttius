import type { Database, SupabaseClient } from "@/types/supabase";

export async function handleSecurityAudit(supabase: SupabaseClient<Database>) {
  const { count: inactiveAdmins } = await supabase.from("admin_users").select("*", { count: "exact", head: true }).eq("is_active", false);
  const { count: totalAdmins } = await supabase.from("admin_users").select("*", { count: "exact", head: true });

  const securityIssues: string[] = [];
  if (inactiveAdmins && inactiveAdmins > 0) securityIssues.push(`${inactiveAdmins} administradores inactivos`);
  if (totalAdmins && totalAdmins < 2) securityIssues.push("Solo hay un administrador activo (riesgo de pérdida de acceso)");

  await supabase.rpc("log_admin_activity", {
    action: "maintenance_security_audit", resource_type: "system", resource_id: null,
    details: { action: "security_audit", issues_found: securityIssues.length, issues: securityIssues, initiated_by: "system" },
  });

  return {
    success: true,
    message: securityIssues.length > 0 ? `Auditoría completada. Se encontraron ${securityIssues.length} posibles problemas.` : "Auditoría completada. No se encontraron problemas de seguridad.",
    action: "security_audit", issues: securityIssues, issues_count: securityIssues.length,
  };
}
