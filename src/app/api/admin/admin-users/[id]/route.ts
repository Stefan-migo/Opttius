import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

import { checkAuth, getActivityByDay, getAdminRole, getMostFrequentActions, verifyAdmin } from "../_helpers/adminUserHelpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const auth = await checkAuth(supabase);
    if (auth.error) return auth.error;
    const adminCheck = await verifyAdmin(supabase, auth.user!.id);
    if (adminCheck) return adminCheck;

    const { data: adminUser, error: adminError } = await supabase.from("admin_users").select("id, email, role, permissions, is_active, last_login, created_at, updated_at, admin_branch_access (id, branch_id, role, is_primary, branches (id, name, code))").eq("id", params.id).single();
    if (adminError || !adminUser) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });

    const { data: profile } = await supabase.from("profiles").select("first_name, last_name, phone").eq("id", params.id).single();
    const branchAccess = adminUser.admin_branch_access || [];
    const branches = branchAccess.filter((a: unknown) => a.branch_id !== null).map((a: unknown) => ({ id: a.branch_id, name: a.branches?.name || "N/A", code: a.branches?.code || "N/A", is_primary: a.is_primary }));

    const { data: activityHistory } = await supabase.from("admin_activity_log").select("action, resource_type, resource_id, details, created_at").eq("admin_user_id", params.id).order("created_at", { ascending: false }).limit(50);

    const now = new Date();
    const recentActivity = (activityHistory || []).filter((a: unknown) => new Date(a.created_at) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const weeklyActivity = (activityHistory || []).filter((a: unknown) => new Date(a.created_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

    return NextResponse.json({
      adminUser: {
        ...adminUser, profiles: profile || null, is_super_admin: branchAccess.some((a: unknown) => a.branch_id === null), branches,
        activityHistory: activityHistory || [],
        analytics: { totalActions: activityHistory?.length || 0, actionsLast30Days: recentActivity.length, actionsLast7Days: weeklyActivity.length, lastActivity: adminUser.last_login, activityByDay: getActivityByDay(recentActivity, now), mostFrequentActions: getMostFrequentActions(recentActivity), activityCount30Days: recentActivity.length, fullName: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || adminUser.email : adminUser.email },
      },
    });
  } catch (error) {
    logger.error("Error in admin user detail API", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const auth = await checkAuth(supabase);
    if (auth.error) return auth.error;
    const adminCheck = await verifyAdmin(supabase, auth.user!.id);
    if (adminCheck) return adminCheck;

    const body = await request.json();
    const { role, permissions, is_active } = body;
    const allowedRoles = ["admin", "super_admin", "employee", "vendedor"];
    const branchContext = await getBranchContext(request, auth.user!.id);
    const isRequesterSuperAdmin = branchContext.isSuperAdmin || (await getAdminRole(supabase, auth.user!.id)) === "super_admin";

    if (is_active !== undefined && !isRequesterSuperAdmin) return NextResponse.json({ error: "Solo los super administradores pueden activar o desactivar otros administradores" }, { status: 403 });
    if (auth.user!.id === params.id && role && role !== "super_admin") return NextResponse.json({ error: "No puedes cambiar tu propio rol de Super Administrador" }, { status: 400 });
    if (auth.user!.id === params.id && is_active === false) return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
    if (role !== undefined) {
      if (!allowedRoles.includes(role)) return NextResponse.json({ error: `Rol inválido. Permitidos: ${allowedRoles.join(", ")}` }, { status: 400 });
      if (role === "super_admin" && !isRequesterSuperAdmin) return NextResponse.json({ error: "Solo los super administradores pueden asignar rol Super Administrador" }, { status: 403 });
    }

    const { data: currentAdmin } = await supabase.from("admin_users").select("email, role, organization_id").eq("id", params.id).single();
    if (!currentAdmin) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    const { data: requester } = await supabase.from("admin_users").select("organization_id, role").eq("id", auth.user!.id).single();
    if (!["root", "dev"].includes(requester?.role || "") && requester?.organization_id !== currentAdmin.organization_id) return NextResponse.json({ error: "No tienes permiso para modificar usuarios de otra organización" }, { status: 403 });

    const updateData: unknown = { updated_at: new Date().toISOString() };
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedAdmin, error: updateError } = await supabase.from("admin_users").update(updateData).eq("id", params.id).select("id, email, role, permissions, is_active, last_login, created_at, updated_at").single();
    if (updateError) { logger.error("Error updating admin user", updateError); return NextResponse.json({ error: "Failed to update admin user" }, { status: 500 }); }

    await supabase.rpc("log_admin_activity", { action: "update_admin_user", resource_type: "admin_user", resource_id: params.id, details: { target_admin_email: currentAdmin.email, changes: Object.keys(updateData).filter((k) => k !== "updated_at"), previous_role: currentAdmin.role, new_role: role, updated_by: auth.user!.email } });
    return NextResponse.json({ adminUser: updatedAdmin });
  } catch (error) {
    logger.error("Error in admin user update API", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const auth = await checkAuth(supabase);
    if (auth.error) return auth.error;
    const adminCheck = await verifyAdmin(supabase, auth.user!.id);
    if (adminCheck) return adminCheck;

    if (auth.user!.id === params.id) return NextResponse.json({ error: "Cannot delete your own admin account" }, { status: 400 });

    const { data: adminUser } = await supabase.from("admin_users").select("email, role, organization_id").eq("id", params.id).single();
    if (!adminUser) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    const { data: requester } = await supabase.from("admin_users").select("organization_id, role").eq("id", auth.user!.id).single();
    if (!["root", "dev"].includes(requester?.role || "") && requester?.organization_id !== adminUser.organization_id) return NextResponse.json({ error: "No tienes permiso para eliminar usuarios de otra organización" }, { status: 403 });

    if (adminUser.organization_id) {
      const { count } = await supabase.from("admin_users").select("*", { count: "exact", head: true }).eq("organization_id", adminUser.organization_id).eq("is_active", true).in("role", ["admin", "super_admin"]);
      if ((count || 0) <= 1) return NextResponse.json({ error: "No se puede eliminar al último administrador. Debe quedar al menos un administrador activo en la organización." }, { status: 400 });
    }

    const { error: deleteError } = await supabase.from("admin_users").delete().eq("id", params.id);
    if (deleteError) { logger.error("Error deleting admin user", deleteError); return NextResponse.json({ error: "Failed to delete admin user" }, { status: 500 }); }

    await supabase.rpc("log_admin_activity", { action: "delete_admin_user", resource_type: "admin_user", resource_id: params.id, details: { deleted_admin_email: adminUser.email, deleted_role: adminUser.role, deleted_by: auth.user!.email } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in admin user delete API", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
