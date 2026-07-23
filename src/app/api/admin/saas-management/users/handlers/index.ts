import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createRootAdminClient } from "@/utils/supabase/root-admin";

export async function handleGET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createRootAdminClient();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = supabaseServiceRole.from("admin_users").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (organizationId && organizationId !== "all") query = query.eq("organization_id", organizationId);
    if (role && role !== "all") query = query.eq("role", role);
    if (status && status !== "all") query = query.eq("is_active", status === "active");
    if (search) query = query.or("email.ilike.%".concat(search, "%"));
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch users", details: error.message }, { status: 500 });

    const usersWithDetails = await Promise.all(
      (users || []).map(async (user: unknown) => {
        const { data: profile } = await supabaseServiceRole.from("profiles").select("id, first_name, last_name, phone").eq("id", user.id).maybeSingle();
        let organization = null;
        if (user.organization_id) {
          const { data: org } = await supabaseServiceRole.from("organizations").select("id, name, slug").eq("id", user.organization_id).maybeSingle();
          organization = org;
        }
        const { data: branchAccess } = await supabaseServiceRole.from("admin_branch_access").select("id, branch_id, branches(id, name, code)").eq("admin_user_id", user.id);
        const isSuperAdmin = branchAccess?.some((a: unknown) => a.branch_id === null) ?? false;
        const branches = (branchAccess || []).filter((a: unknown) => a.branch_id !== null).map((a: unknown) => ({ id: a.branch_id, name: a.branches?.[0]?.name ?? "N/A", code: a.branches?.[0]?.code ?? "N/A" }));
        return { ...user, profiles: profile, organization, is_super_admin: isSuperAdmin, branches, fullName: profile ? (profile.first_name + " " + (profile.last_name || "")).trim() || null : null };
      }),
    );

    let filteredUsers = usersWithDetails;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = usersWithDetails.filter((u: unknown) => u.email?.toLowerCase().includes(searchLower) || u.fullName?.toLowerCase().includes(searchLower));
    }

    return NextResponse.json({ users: filteredUsers, pagination: { page, limit, total: search ? filteredUsers.length : count || 0, totalPages: search ? 1 : Math.ceil((count || 0) / limit) } });
  } catch (error) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function handlePOST(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createRootAdminClient();
    const body = await request.json();
    const email = body.email, password = body.password, first_name = body.first_name, last_name = body.last_name;
    const role = body.role ?? "admin", organization_id = body.organization_id, branch_id = body.branch_id;

    if (!email || !password) return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    const validRoles = ["root", "dev", "super_admin", "admin", "employee", "vendedor"];
    if (!validRoles.includes(role)) return NextResponse.json({ error: "Rol inválido. Permitidos: " + validRoles.join(", ") }, { status: 400 });

    if (organization_id) {
      const { data: org } = await supabaseServiceRole.from("organizations").select("id").eq("id", organization_id).maybeSingle();
      if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 400 });
      const { validateTierLimit } = await import("@/lib/saas/tier-validator");
      const userLimit = await validateTierLimit(organization_id, "users");
      if (!userLimit.allowed) return NextResponse.json({ error: userLimit.reason ?? "Límite de usuarios alcanzado.", code: "TIER_LIMIT" }, { status: 403 });
    }

    const { data: newAuthUser, error: createError } = await supabaseServiceRole.auth.admin.createUser({ email, password, email_confirm: true });
    if (createError || !newAuthUser?.user) return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });

    await supabaseServiceRole.from("profiles").upsert({ id: newAuthUser.user.id, first_name: first_name ?? null, last_name: last_name ?? null }, { onConflict: "id" });
    const { data: newAdmin, error: adminError } = await supabaseServiceRole.from("admin_users").insert({ id: newAuthUser.user.id, email, role, permissions: {}, is_active: true, organization_id: organization_id || null }).select().single();
    if (adminError) {
      try { await supabaseServiceRole.auth.admin.deleteUser(newAuthUser.user.id); } catch (e) { logger.warn("Rollback delete auth user", e); }
      return NextResponse.json({ error: "Error al crear registro de administrador" }, { status: 500 });
    }

    if (organization_id && branch_id) {
      const { data: branch } = await supabaseServiceRole.from("branches").select("id, organization_id").eq("id", branch_id).eq("organization_id", organization_id).maybeSingle();
      if (branch) await supabaseServiceRole.from("admin_branch_access").insert({ admin_user_id: newAdmin.id, branch_id, role: role === "employee" || role === "vendedor" ? "staff" : "manager", is_primary: true });
    } else if (role === "super_admin") {
      await supabaseServiceRole.from("admin_branch_access").insert({ admin_user_id: newAdmin.id, branch_id: null, role: "manager", is_primary: true });
    }

    return NextResponse.json({ success: true, user: { id: newAdmin.id, email: newAdmin.email, role: newAdmin.role, organization_id: newAdmin.organization_id } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
