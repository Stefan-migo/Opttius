import { NextRequest, NextResponse } from "next/server";

import { getDefaultPermissions } from "@/lib/admin/permissions";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

import { checkAuth, verifyAdmin } from "./_helpers/adminUserHelpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await checkAuth(supabase);
    if (auth.error) return auth.error;
    const adminCheck = await verifyAdmin(supabase, auth.user!.id);
    if (adminCheck) return adminCheck;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20", 10)), 100);
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const { data: currentAdmin } = await supabase.from("admin_users").select("role, organization_id").eq("id", auth.user!.id).single();
    if (!currentAdmin) return NextResponse.json({ error: "Failed to verify user permissions" }, { status: 500 });

    const isRoot = currentAdmin.role === "root" || currentAdmin.role === "dev";
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { user_id: auth.user!.id }) as any;
    const { data: userOrgId } = await supabase.rpc("get_user_organization_id", { user_id: auth.user!.id });
    const effectiveOrgId = userOrgId || currentAdmin.organization_id;

    let query = supabase.from("admin_users").select("id, email, role, permissions, is_active, last_login, created_at, updated_at, organization_id, admin_branch_access (id, branch_id, role, is_primary, branches (id, name, code))", { count: "exact" });

    if (!isRoot && effectiveOrgId) query = query.eq("organization_id", effectiveOrgId);
    else if (!isRoot && !effectiveOrgId) return NextResponse.json({ adminUsers: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    if (role && role !== "all") query = query.eq("role", role);
    if (status && status !== "all") query = query.eq("is_active", status === "active");
    if (search.trim()) {
      const pattern = `%${search.trim()}%`;
      const { data: matchingProfiles } = await supabase.from("profiles").select("id").or(`email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`);
      if (matchingProfiles && matchingProfiles.length > 0) query = query.in("id", matchingProfiles.map((p) => p.id));
      else query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    }

    const { data: adminUsers, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error) { logger.error("Error fetching admin users", error); return NextResponse.json({ error: "Failed to fetch admin users" }, { status: 500 }); }

    const { data: activityStats } = await supabase.from("admin_activity_log").select("admin_user_id, created_at").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    const activityMap = (activityStats || []).reduce((acc: any, a: any) => { acc[a.admin_user_id] = (acc[a.admin_user_id] || 0) + 1; return acc; }, {});
    const adminIds = (adminUsers || []).map((a: any) => a.id);
    const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name, phone").in("id", adminIds);
    const profilesMap = (profiles || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});

    const adminUsersWithStats = (adminUsers || []).map((admin: any) => {
      const branchAccess = admin.admin_branch_access || [];
      const profile = profilesMap[admin.id];
      return { ...admin, is_super_admin: branchAccess.some((a: any) => a.branch_id === null), branches: branchAccess.filter((a: any) => a.branch_id !== null).map((a: any) => ({ id: a.branch_id, name: a.branches?.name || "N/A", code: a.branches?.code || "N/A", is_primary: a.is_primary })), analytics: { activityCount30Days: activityMap[admin.id] || 0, lastActivity: admin.last_login, fullName: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || null : null }, profiles: profile ? { first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone } : null };
    });

    const total = count ?? adminUsersWithStats.length;
    return NextResponse.json({ adminUsers: adminUsersWithStats, pagination: { total, page: Math.floor(offset / limit) + 1, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error("Error in admin users API GET", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await checkAuth(supabase);
    if (auth.error) return auth.error;
    const adminCheck = await verifyAdmin(supabase, auth.user!.id);
    if (adminCheck) return adminCheck;

    const body = await request.json();
    const { email, role, permissions, is_active = true, is_super_admin = false, branch_ids = [] } = body;
    const branchContext = await getBranchContext(request, auth.user!.id);

    if (is_super_admin && !branchContext.isSuperAdmin) return NextResponse.json({ error: "Solo los super administradores pueden otorgar permisos de super administrador" }, { status: 403 });
    if (!is_super_admin && (!branch_ids || branch_ids.length === 0)) return NextResponse.json({ error: "Debe asignar al menos una sucursal al administrador" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const { data: existingUser } = await supabase.from("profiles").select("id, email").eq("email", email).maybeSingle();
    if (!existingUser) return NextResponse.json({ error: "User must be registered first. The user needs to sign up before being granted admin access." }, { status: 400 });

    const { data: existingAdmin } = await supabase.from("admin_users").select("id, email").eq("email", email).maybeSingle();
    if (existingAdmin) return NextResponse.json({ error: "User is already an admin" }, { status: 400 });

    const { data: newAdmin, error: createError } = await supabase.from("admin_users").insert({ id: existingUser.id, email: existingUser.email, role: "admin", permissions: permissions || getDefaultPermissions("admin"), is_active }).select("id, email, role, permissions, is_active, created_at, updated_at").single();
    if (createError) { logger.error("Error creating admin user", createError); return NextResponse.json({ error: "Failed to create admin user", details: createError.message }, { status: 500 }); }

    if (is_super_admin) {
      const { error: ae } = await supabase.from("admin_branch_access").insert({ admin_user_id: newAdmin.id, branch_id: null, role: "manager", is_primary: true });
      if (ae) { await supabase.from("admin_users").delete().eq("id", newAdmin.id); return NextResponse.json({ error: "Failed to assign super admin access", details: ae.message }, { status: 500 }); }
    } else if (branch_ids.length > 0) {
      const { error: ae } = await supabase.from("admin_branch_access").insert(branch_ids.map((bid: string, i: number) => ({ admin_user_id: newAdmin.id, branch_id: bid, role: "manager", is_primary: i === 0 })));
      if (ae) { await supabase.from("admin_users").delete().eq("id", newAdmin.id); return NextResponse.json({ error: "Failed to assign branch access", details: ae.message }, { status: 500 }); }
    }

    try { await supabase.rpc("log_admin_activity", { action: "create_admin_user", resource_type: "admin_user", resource_id: newAdmin.id, details: { new_admin_email: email, role: "admin", is_super_admin, branch_ids: is_super_admin ? null : branch_ids, created_by: auth.user!.email } }); } catch { }
    return NextResponse.json({ adminUser: newAdmin });
  } catch (error) {
    logger.error("Error in create admin user API", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
