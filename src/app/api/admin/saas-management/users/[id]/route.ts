import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * GET /api/admin/saas-management/users/[id]
 * Obtener detalles completos de un usuario
 */
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;

    // Obtener usuario (sin relaciones complejas)
    const { data: user, error } = await supabaseServiceRole
      .from("admin_users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !user) {
      logger.error("Error fetching user", error);
      return NextResponse.json(
        { error: "User not found", details: error?.message },
        { status: 404 },
      );
    }

    // Obtener organización si existe
    let organization = null;
    if (user.organization_id) {
      const { data: org } = await supabaseServiceRole
        .from("organizations")
        .select("id, name, slug, subscription_tier, status")
        .eq("id", user.organization_id)
        .maybeSingle();
      organization = org;
    }

    // Obtener perfil
    const { data: profile } = await supabaseServiceRole
      .from("profiles")
      .select("id, email, first_name, last_name, phone, created_at")
      .eq("id", user.id)
      .maybeSingle();

    // Obtener acceso a sucursales
    const { data: branchAccess } = await supabaseServiceRole
      .from("admin_branch_access")
      .select("id, branch_id, role, is_primary")
      .eq("admin_user_id", id);

    // Enriquecer con información de sucursales
    const enrichedBranchAccess = await Promise.all(
      (branchAccess || []).map(async (access: any) => {
        if (access.branch_id) {
          const { data: branch } = await supabaseServiceRole
            .from("branches")
            .select("id, name, code, organization_id")
            .eq("id", access.branch_id)
            .maybeSingle();
          return {
            ...access,
            branches: branch,
          };
        }
        return access;
      }),
    );

    // Obtener actividad reciente
    const { data: recentActivity } = await supabaseServiceRole
      .from("admin_activity_log")
      .select("*")
      .eq("admin_user_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      user: {
        ...user,
        organization: organization || null,
        profiles: profile || null,
        admin_branch_access: enrichedBranchAccess || [],
        recentActivity: recentActivity || [],
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error fetching user details", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/saas-management/users/[id]
 * Actualizar usuario (cambiar organización, rol, estado, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;
    const body = await request.json();
    const { organization_id, role, is_active, permissions } = body;

    // Verificar que el usuario existe
    const { data: existingUser } = await supabaseServiceRole
      .from("admin_users")
      .select("id, organization_id")
      .eq("id", id)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Preparar updates
    const updates: any = {};

    if (organization_id !== undefined) {
      // Validar que la organización existe si se proporciona
      if (organization_id) {
        const { data: org } = await supabaseServiceRole
          .from("organizations")
          .select("id")
          .eq("id", organization_id)
          .maybeSingle();

        if (!org) {
          return NextResponse.json(
            { error: "Organization not found" },
            { status: 400 },
          );
        }
      }
      updates.organization_id = organization_id;
    }

    if (role !== undefined) {
      // Validar rol
      if (!["root", "dev", "super_admin", "admin", "employee"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updates.role = role;
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    if (permissions !== undefined) {
      updates.permissions = permissions;
    }

    // Actualizar
    const { data: updatedUser, error: updateError } = await supabaseServiceRole
      .from("admin_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating user", updateError);
      return NextResponse.json(
        { error: "Failed to update user", details: updateError.message },
        { status: 500 },
      );
    }

    logger.info(`User updated: ${id}`);

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error updating user", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/saas-management/users/[id]
 * Eliminar usuario completamente (elimina auth.users, admin_users, profiles, etc.)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;

    // Verificar que el usuario existe
    const { data: existingUser } = await supabaseServiceRole
      .from("admin_users")
      .select("id, email, role, organization_id")
      .eq("id", id)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevenir eliminación de usuarios root/dev
    if (existingUser.role === "root" || existingUser.role === "dev") {
      return NextResponse.json(
        {
          error: "Cannot delete root or dev users",
          details: "Root and dev users are protected and cannot be deleted",
        },
        { status: 403 },
      );
    }

    // Verificar confirmación en el body (opcional pero recomendado)
    let body: { confirm?: boolean } = {};
    try {
      const bodyText = await request.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch {
      // Si no hay body o no es JSON válido, continuar sin confirmación
    }

    logger.info(`Deleting user ${id} (${existingUser.email})`);

    // Eliminar admin_branch_access primero
    await supabaseServiceRole
      .from("admin_branch_access")
      .delete()
      .eq("admin_user_id", id);

    // Eliminar admin_users (esto activará CASCADE en admin_activity_log)
    await supabaseServiceRole.from("admin_users").delete().eq("id", id);

    // Eliminar el usuario de auth.users (esto activará CASCADE en profiles)
    const { error: deleteAuthError } =
      await supabaseServiceRole.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      logger.error("Error deleting auth user", deleteAuthError);
      // No hacer rollback porque admin_users ya fue eliminado
      return NextResponse.json(
        {
          error: "Failed to delete auth user",
          details: deleteAuthError.message,
          warning:
            "User admin record was deleted but auth user deletion failed",
        },
        { status: 500 },
      );
    }

    logger.info(`User deleted successfully: ${id} (${existingUser.email})`);

    return NextResponse.json({
      success: true,
      message: "Usuario eliminado completamente",
      deleted: {
        userId: id,
        email: existingUser.email,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error deleting user", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
