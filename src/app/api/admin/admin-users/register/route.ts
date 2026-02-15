import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import type {
  GetAdminRoleParams,
  GetAdminRoleResult,
} from "@/types/supabase-rpc";

// Helper function to get default permissions by role
function getDefaultPermissions(role: string) {
  // Permisos por defecto según rol
  const rolePermissions: Record<string, any> = {
    root: {
      orders: ["read", "create", "update", "delete"],
      products: ["read", "create", "update", "delete"],
      customers: ["read", "create", "update", "delete"],
      analytics: ["read"],
      settings: ["read", "create", "update", "delete"],
      admin_users: ["read", "create", "update", "delete"],
      support: ["read", "create", "update", "delete"],
      bulk_operations: ["read", "create", "update", "delete"],
      saas_management: ["read", "create", "update", "delete"],
    },
    dev: {
      // Igual que root
      orders: ["read", "create", "update", "delete"],
      products: ["read", "create", "update", "delete"],
      customers: ["read", "create", "update", "delete"],
      analytics: ["read"],
      settings: ["read", "create", "update", "delete"],
      admin_users: ["read", "create", "update", "delete"],
      support: ["read", "create", "update", "delete"],
      bulk_operations: ["read", "create", "update", "delete"],
      saas_management: ["read", "create", "update", "delete"],
    },
    super_admin: {
      orders: ["read", "create", "update", "delete"],
      products: ["read", "create", "update", "delete"],
      customers: ["read", "create", "update", "delete"],
      analytics: ["read"],
      settings: ["read", "create", "update", "delete"],
      admin_users: ["read", "create", "update", "delete"],
      support: ["read", "create", "update", "delete"],
      bulk_operations: ["read", "create", "update", "delete"],
      branches: ["read", "create", "update", "delete"],
    },
    admin: {
      orders: ["read", "create", "update", "delete"],
      products: ["read", "create", "update", "delete"],
      customers: ["read", "create", "update", "delete"],
      analytics: ["read"],
      settings: ["read", "update"], // No puede eliminar config críticas
      admin_users: ["read"], // Solo ver, no crear/modificar
      support: ["read", "create", "update"],
      bulk_operations: ["read", "create"],
      appointments: ["read", "create", "update", "delete"],
      quotes: ["read", "create", "update", "delete"],
      work_orders: ["read", "create", "update", "delete"],
    },
    employee: {
      // Acceso operativo sin administración
      orders: ["read", "create", "update"], // No puede eliminar órdenes
      products: ["read"], // Solo lectura de catálogo
      customers: ["read", "create", "update"], // No puede eliminar clientes
      analytics: [], // Sin acceso a analytics
      settings: [], // Sin acceso a configuración
      admin_users: [], // Sin acceso a usuarios
      support: ["read", "create"], // Puede crear tickets, no resolver
      bulk_operations: [], // Sin operaciones masivas
      appointments: ["read", "create", "update"], // Puede agendar, no eliminar
      quotes: ["read", "create", "update"], // Puede crear presupuestos
      work_orders: ["read", "update"], // Puede actualizar estado, no crear/eliminar
      pos: ["read", "create"], // Acceso completo a POS para ventas
    },
    vendedor: {
      // Acceso a ventas y citas en sucursal asignada (igual que employee)
      orders: ["read", "create", "update"],
      products: ["read"],
      customers: ["read", "create", "update"],
      analytics: [],
      settings: [],
      admin_users: [],
      support: ["read", "create"],
      bulk_operations: [],
      appointments: ["read", "create", "update"],
      quotes: ["read", "create", "update"],
      work_orders: ["read", "update"],
      pos: ["read", "create"],
    },
  };

  return rolePermissions[role] || rolePermissions.admin;
}

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      role = "admin",
      branch_id,
    } = body;

    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Verificar autenticación
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar que el usuario actual tiene permisos para crear usuarios
    const { data: adminRole } = (await supabase.rpc("get_admin_role", {
      user_id: currentUser.id,
    } as GetAdminRoleParams)) as {
      data: GetAdminRoleResult | null;
      error: Error | null;
    };

    // Verificar permisos según rol del usuario actual
    const { data: currentAdminUser } = await supabaseServiceRole
      .from("admin_users")
      .select("role, organization_id")
      .eq("id", currentUser.id)
      .single();

    const isRoot =
      currentAdminUser?.role === "root" || currentAdminUser?.role === "dev";
    const isSuperAdmin = currentAdminUser?.role === "super_admin";
    const isAdmin = adminRole === "admin";

    // Validar que el usuario tiene permisos para crear usuarios
    if (!isRoot && !isSuperAdmin && !isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Validar que el rol a crear es permitido
    // Root/dev puede crear cualquier rol
    // Super admin puede crear: admin, employee, vendedor, super_admin (de su org)
    // Admin puede crear: admin, employee, vendedor
    if (!isRoot) {
      const allowedRoles = isSuperAdmin
        ? ["admin", "employee", "vendedor", "super_admin"]
        : ["admin", "employee", "vendedor"];

      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: `No tienes permisos para crear usuarios con rol ${role}` },
          { status: 403 },
        );
      }
    }

    // Obtener organization_id del usuario actual (excepto root/dev)
    let organizationId: string | null = null;
    if (!isRoot) {
      if (!currentAdminUser?.organization_id) {
        return NextResponse.json(
          { error: "No tienes una organización asignada" },
          { status: 400 },
        );
      }
      organizationId = currentAdminUser.organization_id;
    }
    // Root/dev puede crear usuarios sin organization_id (para otros root/dev)

    // Validar límite de usuarios del tier cuando se crea usuario en una organización
    if (organizationId) {
      const { validateTierLimit } = await import("@/lib/saas/tier-validator");
      const userLimit = await validateTierLimit(organizationId, "users");
      if (!userLimit.allowed) {
        return NextResponse.json(
          {
            error:
              userLimit.reason ??
              "Límite de usuarios alcanzado para tu plan. Considera actualizar tu suscripción.",
            code: "TIER_LIMIT",
            currentCount: userLimit.currentCount,
            maxAllowed: userLimit.maxAllowed,
          },
          { status: 403 },
        );
      }
    }

    // Validar inputs
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

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabaseServiceRole
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "El usuario ya existe. Usa la opción 'Crear Administrador' en su lugar.",
        },
        { status: 400 },
      );
    }

    // Crear usuario en auth.users usando service role
    const { data: newAuthUser, error: createAuthError } =
      await supabaseServiceRole.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
        },
      });

    if (createAuthError || !newAuthUser.user) {
      logger.error("Error creating auth user", {
        error: createAuthError,
        email,
        userId: currentUser.id,
      });
      return NextResponse.json(
        {
          error: "Error al crear usuario en el sistema de autenticación",
          details:
            createAuthError?.message || "Error desconocido al crear usuario",
        },
        { status: 500 },
      );
    }

    // Verificar si el perfil ya existe (puede ser creado por trigger on_auth_user_created)
    // Esperar un momento para que el trigger se ejecute si existe
    await new Promise((resolve) => setTimeout(resolve, 300));

    const { data: existingProfile } = await supabaseServiceRole
      .from("profiles")
      .select("id")
      .eq("id", newAuthUser.user.id)
      .maybeSingle();

    // Crear o actualizar perfil
    let profileError;
    if (existingProfile) {
      // El perfil ya existe (creado por trigger), actualizarlo
      const { error: updateError } = await supabaseServiceRole
        .from("profiles")
        .update({
          email,
          first_name: firstName,
          last_name: lastName,
        })
        .eq("id", newAuthUser.user.id);

      profileError = updateError;
    } else {
      // El perfil no existe, crearlo
      const { error: insertError } = await supabaseServiceRole
        .from("profiles")
        .insert({
          id: newAuthUser.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
        });

      profileError = insertError;
    }

    if (profileError) {
      logger.error("Error creating/updating profile", {
        error: profileError,
        userId: newAuthUser.user.id,
        email,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        message: profileError.message,
      });
      // Intentar eliminar el usuario de auth si falla el perfil
      try {
        await supabaseServiceRole.auth.admin.deleteUser(newAuthUser.user.id);
      } catch (deleteError) {
        logger.warn(
          "Failed to cleanup auth user after profile error",
          deleteError,
        );
      }
      return NextResponse.json(
        {
          error: "Error al crear perfil del usuario",
          details:
            profileError.message ||
            profileError.hint ||
            profileError.details ||
            "Error desconocido al crear perfil",
        },
        { status: 500 },
      );
    }

    // Crear admin_user con organization_id heredado (o null para root/dev)
    const { data: newAdmin, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .insert({
        id: newAuthUser.user.id,
        email,
        role: role,
        permissions: getDefaultPermissions(role),
        is_active: true,
        organization_id: organizationId, // HEREDADO o null para root/dev
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (adminError) {
      logger.error("Error creating admin user", {
        error: adminError,
        userId: newAuthUser.user.id,
        email,
        role,
        organizationId,
      });
      // Rollback: eliminar usuario y perfil
      try {
        await supabaseServiceRole.auth.admin.deleteUser(newAuthUser.user.id);
        await supabaseServiceRole
          .from("profiles")
          .delete()
          .eq("id", newAuthUser.user.id);
      } catch (rollbackError) {
        logger.warn("Failed to rollback user creation", rollbackError);
      }
      return NextResponse.json(
        {
          error: "Error al crear registro de administrador",
          details:
            adminError.message || "Error desconocido al crear administrador",
        },
        { status: 500 },
      );
    }

    // Asignación de sucursal cuando se proporciona branch_id
    if (branch_id && organizationId) {
      const branchId =
        typeof branch_id === "string" && branch_id.trim() !== ""
          ? branch_id.trim()
          : null;
      if (branchId) {
        const { data: branch, error: branchError } = await supabaseServiceRole
          .from("branches")
          .select("id, organization_id")
          .eq("id", branchId)
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (branchError) {
          logger.error("Error checking branch", branchError);
          return NextResponse.json(
            {
              error: "Error al verificar la sucursal",
              details: branchError.message,
            },
            { status: 500 },
          );
        }
        if (!branch) {
          return NextResponse.json(
            {
              error:
                "La sucursal no existe o no pertenece a tu organización. Elige otra sucursal.",
            },
            { status: 400 },
          );
        }

        const { error: accessError } = await supabaseServiceRole
          .from("admin_branch_access")
          .insert({
            admin_user_id: newAdmin.id,
            branch_id: branchId,
            role:
              role === "employee" || role === "vendedor" ? "staff" : "manager",
            is_primary: true,
          });

        if (accessError) {
          logger.error(
            "Error assigning branch access on register",
            accessError,
          );
          return NextResponse.json(
            {
              error: "El usuario se creó pero no se pudo asignar la sucursal",
              details: accessError.message,
            },
            { status: 500 },
          );
        }
      }
    } else if (
      role !== "root" &&
      role !== "dev" &&
      role !== "super_admin" &&
      organizationId
    ) {
      // Si no hay branch_id y el rol requiere sucursal (admin, employee)
      // registrar pero sin acceso aún - el usuario puede asignar sucursal después
      logger.info(
        `User ${newAdmin.id} created without branch access. Can be assigned later.`,
      );
    }

    // Si es super_admin, crear acceso global (branch_id = null)
    if (role === "super_admin") {
      const { error: accessError } = await supabaseServiceRole
        .from("admin_branch_access")
        .insert({
          admin_user_id: newAdmin.id,
          branch_id: null,
          role: "manager",
          is_primary: true,
        });

      if (accessError) {
        logger.warn(
          "Error assigning super admin access (non-critical)",
          accessError,
        );
      }
    }

    // Log actividad
    try {
      await supabaseServiceRole.rpc("log_admin_activity", {
        action: "register_user_with_org",
        resource_type: "admin_user",
        resource_id: newAdmin.id,
        details: {
          new_user_email: email,
          role: role,
          organization_id: organizationId,
          branch_id: branch_id || null,
          created_by: currentUser.email,
        },
      });
    } catch (logError) {
      logger.warn("Error logging activity (non-critical)", logError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        role: newAdmin.role,
        organization_id: newAdmin.organization_id,
      },
    });
  } catch (error) {
    logger.error("Error in register user API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
