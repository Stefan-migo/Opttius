import { createServiceRoleClient } from "@/utils/supabase/server";

export async function handleSystemStatus(supabase: unknown, userOrganizationId?: string, branchId?: string) {
  const serviceSupabase = createServiceRoleClient();
  let totalUsers = 0, activeAdmins = 0, totalProducts = 0, totalOrders = 0, totalCustomers = 0;

  if (userOrganizationId) {
    const { count: adminsC } = await serviceSupabase.from("admin_users").select("*", { count: "exact", head: true }).eq("organization_id", userOrganizationId).eq("is_active", true);
    activeAdmins = adminsC || 0;

    const { count: prodC } = await serviceSupabase.from("products").select("*", { count: "exact", head: true }).eq("organization_id", userOrganizationId);
    totalProducts = prodC || 0;

    let oQ = serviceSupabase.from("orders").select("*", { count: "exact", head: true }).eq("organization_id", userOrganizationId);
    if (branchId) oQ = oQ.eq("branch_id", branchId);
    const { count: ordC } = await oQ;
    totalOrders = ordC || 0;

    const { count: custC } = await serviceSupabase.from("customers").select("*", { count: "exact", head: true }).eq("organization_id", userOrganizationId);
    totalCustomers = custC || 0;

    const { count: usersC } = await serviceSupabase.from("profiles").select("*", { count: "exact", head: true });
    totalUsers = usersC || 0;
  } else {
    const { count: usersC } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    totalUsers = usersC || 0;
    const { count: adminsC } = await supabase.from("admin_users").select("*", { count: "exact", head: true }).eq("is_active", true);
    activeAdmins = adminsC || 0;
    const { count: prodC } = await supabase.from("products").select("*", { count: "exact", head: true });
    totalProducts = prodC || 0;
  }

  let recentActivity = 0;
  if (userOrganizationId) {
    const { data: orgAdmins } = await serviceSupabase.from("admin_users").select("id").eq("organization_id", userOrganizationId).eq("is_active", true);
    const adminIds = (orgAdmins || []).map((a: unknown) => a.id);
    if (adminIds.length > 0) {
      const { count } = await serviceSupabase.from("admin_activity_log").select("*", { count: "exact", head: true })
        .in("admin_user_id", adminIds).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      recentActivity = count || 0;
    }
  } else {
    const { count } = await supabase.from("admin_activity_log").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    recentActivity = count || 0;
  }

  const statusReport = {
    total_users: totalUsers, active_admins: activeAdmins, total_products: totalProducts,
    total_orders: userOrganizationId ? totalOrders : undefined,
    total_customers: userOrganizationId ? totalCustomers : undefined,
    activity_24h: recentActivity || 0, timestamp: new Date().toISOString(),
    scope: userOrganizationId ? (branchId ? "branch" : "organization") : "global",
  };

  await supabase.rpc("log_admin_activity", {
    action: "maintenance_system_status", resource_type: "system", resource_id: null,
    details: { action: "system_status", report: statusReport, initiated_by: "system" },
  });

  return { success: true, message: "Reporte de estado del sistema generado", action: "system_status", report: statusReport };
}
