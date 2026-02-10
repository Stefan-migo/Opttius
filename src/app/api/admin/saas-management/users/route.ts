import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * GET /api/admin/saas-management/users
 * Listar todos los usuarios del sistema con filtros (solo root/dev)
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = supabaseServiceRole
      .from("admin_users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (organizationId && organizationId !== "all") {
      query = query.eq("organization_id", organizationId);
    }

    if (role && role !== "all") {
      query = query.eq("role", role);
    }

    if (status && status !== "all") {
      const isActive = status === "active";
      query = query.eq("is_active", isActive);
    }

    if (search) {
      query = query.or("email.ilike.%".concat(search, "%"));
    }

    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      logger.error("Error fetching users", error);
      return NextResponse.json(
        { error: "Failed to fetch users", details: error.message },
        { status: 500 },
      );
    }

    const usersWithDetails = await Promise.all(
      (users || []).map(
        async (user: { id: string; organization_id: string | null }) => {
          const { data: profile } = await supabaseServiceRole
            .from("profiles")
            .select("id, first_name, last_name, phone")
            .eq("id", user.id)
            .maybeSingle();

          let organization = null;
          if (user.organization_id) {
            const { data: org } = await supabaseServiceRole
              .from("organizations")
              .select("id, name, slug")
              .eq("id", user.organization_id)
              .maybeSingle();
            organization = org;
          }

          const { data: branchAccess } = await supabaseServiceRole
            .from("admin_branch_access")
            .select("id, branch_id, branches(id, name, code)")
            .eq("admin_user_id", user.id);

          const isSuperAdmin =
            branchAccess?.some(
              (a: { branch_id: string | null }) => a.branch_id === null,
            ) ?? false;

          const branches = (branchAccess || [])
            .filter((a: { branch_id: string | null }) => a.branch_id !== null)
            .map(
              (a: {
                branch_id: string;
                branches?: {
                  id: any;
                  name: any;
                  code: any;
                }[];
              }) => ({
                id: a.branch_id,
                name: a.branches?.[0]?.name ?? "N/A",
                code: a.branches?.[0]?.code ?? "N/A",
              }),
            );

          const fullName = profile
            ? (profile.first_name + " " + (profile.last_name || "")).trim() ||
              null
            : null;

          return {
            ...user,
            profiles: profile,
            organization,
            is_super_admin: isSuperAdmin,
            branches,
            fullName,
          };
        },
      ),
    );

    let filteredUsers = usersWithDetails;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = usersWithDetails.filter(
        (u: { email?: string; fullName?: string | null }) => {
          const emailMatch = u.email?.toLowerCase().includes(searchLower);
          const nameMatch = u.fullName?.toLowerCase().includes(searchLower);
          return emailMatch || nameMatch;
        },
      );
    }

    return NextResponse.json({
      users: filteredUsers,
      pagination: {
        page,
        limit,
        total: search ? filteredUsers.length : count || 0,
        totalPages: search ? 1 : Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in users API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/users
 * Crear nuevo usuario (solo root/dev). Permite asignar organización y rol.
 */
export async function POST(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const body = await request.json();
    const email = body.email;
    const password = body.password;
    const first_name = body.first_name;
    const last_name = body.last_name;
    const role = body.role ?? "admin";
    const organization_id = body.organization_id;
    const branch_id = body.branch_id;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    const validRoles = [
      "root",
      "dev",
      "super_admin",
      "admin",
      "employee",
      "vendedor",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido. Permitidos: " + validRoles.join(", ") },
        { status: 400 },
      );
    }

    if (organization_id) {
      const { data: org } = await supabaseServiceRole
        .from("organizations")
        .select("id")
        .eq("id", organization_id)
        .maybeSingle();
      if (!org) {
        return NextResponse.json(
          { error: "Organización no encontrada" },
          { status: 400 },
        );
      }
      const { validateTierLimit } = await import("@/lib/saas/tier-validator");
      const userLimit = await validateTierLimit(organization_id, "users");
      if (!userLimit.allowed) {
        return NextResponse.json(
          {
            error:
              userLimit.reason ??
              "Límite de usuarios alcanzado para esa organización.",
            code: "TIER_LIMIT",
          },
          { status: 403 },
        );
      }
    }

    const { data: newAuthUser, error: createError } =
      await supabaseServiceRole.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !newAuthUser?.user) {
      logger.error("Error creating auth user", createError);
      return NextResponse.json(
        {
          error: "Error al crear usuario",
          details: createError?.message ?? "Unknown error",
        },
        { status: 500 },
      );
    }

    await supabaseServiceRole.from("profiles").upsert(
      {
        id: newAuthUser.user.id,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
      },
      { onConflict: "id" },
    );

    const { data: newAdmin, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .insert({
        id: newAuthUser.user.id,
        email,
        role,
        permissions: {},
        is_active: true,
        organization_id: organization_id || null,
      })
      .select()
      .single();

    if (adminError) {
      logger.error("Error creating admin_users", adminError);
      try {
        await supabaseServiceRole.auth.admin.deleteUser(newAuthUser.user.id);
      } catch (e) {
        logger.warn("Rollback delete auth user", e);
      }
      return NextResponse.json(
        {
          error: "Error al crear registro de administrador",
          details: adminError.message,
        },
        { status: 500 },
      );
    }

    if (organization_id && branch_id) {
      const { data: branch } = await supabaseServiceRole
        .from("branches")
        .select("id, organization_id")
        .eq("id", branch_id)
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (branch) {
        await supabaseServiceRole.from("admin_branch_access").insert({
          admin_user_id: newAdmin.id,
          branch_id,
          role:
            role === "employee" || role === "vendedor" ? "staff" : "manager",
          is_primary: true,
        });
      }
    } else if (role === "super_admin") {
      await supabaseServiceRole.from("admin_branch_access").insert({
        admin_user_id: newAdmin.id,
        branch_id: null,
        role: "manager",
        is_primary: true,
      });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newAdmin.id,
          email: newAdmin.email,
          role: newAdmin.role,
          organization_id: newAdmin.organization_id,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in users API POST", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
