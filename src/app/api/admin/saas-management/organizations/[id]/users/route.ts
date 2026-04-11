import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { createOrgUserSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * GET /api/admin/saas-management/organizations/[id]/users
 * Listar todos los usuarios de una organización
 */
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id: organizationId } = params;

    // Verificar que la organización existe
    const { data: org } = await supabaseServiceRole
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Obtener usuarios
    const { data: users, error } = await supabaseServiceRole
      .from("admin_users")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching users", error);
      return NextResponse.json(
        { error: "Failed to fetch users", details: error.message },
        { status: 500 },
      );
    }

    // Enriquecer con perfiles
    const usersWithDetails = await Promise.all(
      (users || []).map(async (user: unknown) => {
        const { data: profile } = await supabaseServiceRole
          .from("profiles")
          .select("id, first_name, last_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        return {
          ...user,
          profiles: profile || null,
        };
      }),
    );

    return NextResponse.json({ users: usersWithDetails || [] });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in organization users API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/organizations/[id]/users
 * Crear nuevo usuario para una organización
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id: organizationId } = params;
    const body = await request.json();
    const parseResult = createOrgUserSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Datos inválidos" },
        { status: 400 },
      );
    }
    const { email, password, first_name, last_name, role, branch_id } =
      parseResult.data;

    // Verificar que la organización existe
    const { data: org } = await supabaseServiceRole
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const validRoles = ["super_admin", "admin", "employee", "vendedor"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido. Permitidos: " + validRoles.join(", ") },
        { status: 400 },
      );
    }

    // Crear usuario en auth
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

    // Crear perfil
    await supabaseServiceRole.from("profiles").upsert(
      {
        id: newAuthUser.user.id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
      },
      { onConflict: "id" },
    );

    // Crear admin_user
    const { data: newAdmin, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .insert({
        id: newAuthUser.user.id,
        email,
        role,
        permissions: {},
        is_active: true,
        organization_id: organizationId,
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

    // Asignar acceso a sucursal si se proporciona
    if (branch_id) {
      const { data: branch } = await supabaseServiceRole
        .from("branches")
        .select("id, organization_id")
        .eq("id", branch_id)
        .eq("organization_id", organizationId)
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
      // Super admin tiene acceso global
      await supabaseServiceRole.from("admin_branch_access").insert({
        admin_user_id: newAdmin.id,
        branch_id: null,
        role: "manager",
        is_primary: true,
      });
    }

    logger.info(
      `User created: ${newAdmin.id} for organization ${organizationId}`,
    );

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
    logger.error("Error in organization users API POST", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
