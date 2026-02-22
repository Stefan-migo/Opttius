import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";

const DEMO_ORG_ID =
  process.env.NEXT_PUBLIC_DEMO_ORG_ID || "00000000-0000-0000-0000-000000000001";

/**
 * POST /api/onboarding/assign-demo
 *
 * Asigna la organización demo al usuario actual.
 * Esto permite que el usuario explore el sistema con datos pre-cargados.
 *
 * Returns:
 * - { success: boolean, organizationId: string }
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Verificar autenticación
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar que el usuario no tenga ya una organización asignada
    const { data: existingAdminUser, error: adminUserError } =
      await supabaseServiceRole
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

    // Si hay un error que no sea "no encontrado", registrar y continuar
    if (adminUserError && adminUserError.code !== "PGRST116") {
      logger.warn("Error checking existing admin user", adminUserError);
    }

    if (existingAdminUser?.organization_id) {
      // Si ya tiene organización y no es la demo, no permitir cambio
      if (existingAdminUser.organization_id !== DEMO_ORG_ID) {
        return NextResponse.json(
          {
            error: "Ya tienes una organización asignada",
            organizationId: existingAdminUser.organization_id,
          },
          { status: 400 },
        );
      }
      // Ya tiene demo asignada. is_super_admin reconoce role=super_admin en admin_users.
      return NextResponse.json({
        success: true,
        organizationId: DEMO_ORG_ID,
        alreadyAssigned: true,
      });
    }

    // Verificar que la organización demo existe
    const { data: demoOrg, error: orgError } = await supabaseServiceRole
      .from("organizations")
      .select("id, name")
      .eq("id", DEMO_ORG_ID)
      .maybeSingle();

    if (orgError) {
      logger.error("Error checking demo organization", orgError);
      return NextResponse.json(
        {
          error: "Error al verificar organización demo",
          details: orgError.message,
        },
        { status: 500 },
      );
    }

    if (!demoOrg) {
      logger.error("Demo organization not found", {
        demoOrgId: DEMO_ORG_ID,
        message:
          "La organización demo no existe en la base de datos. Asegúrate de aplicar las migraciones.",
      });
      return NextResponse.json(
        {
          error: "La organización demo no está disponible",
          details:
            "La organización demo no existe. Por favor, contacta al administrador del sistema.",
        },
        { status: 500 },
      );
    }

    // Crear/actualizar admin_users con organization_id de demo
    // El usuario que se registra es el dueño de la óptica, por lo tanto debe ser super_admin
    const { data: adminUser, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .upsert(
        {
          id: user.id,
          email: user.email,
          role: "super_admin",
          organization_id: DEMO_ORG_ID,
          is_active: true,
        },
        {
          onConflict: "id",
        },
      )
      .select()
      .maybeSingle();

    if (adminError) {
      logger.error("Error assigning demo organization", {
        error: adminError,
        userId: user.id,
        email: user.email,
      });
      return NextResponse.json(
        {
          error: "Error al asignar organización demo",
          details: adminError.message,
        },
        { status: 500 },
      );
    }

    if (!adminUser) {
      logger.error("Admin user not created after upsert", {
        userId: user.id,
        email: user.email,
      });
      return NextResponse.json(
        {
          error: "Error al crear registro de usuario",
          details: "No se pudo crear el registro de administrador",
        },
        { status: 500 },
      );
    }

    // Crear acceso de super_admin (branch_id = null) para acceso global a todas las sucursales
    // Primero eliminar cualquier acceso existente
    await supabaseServiceRole
      .from("admin_branch_access")
      .delete()
      .eq("admin_user_id", user.id);

    // Crear acceso de super_admin con branch_id = null
    const { error: accessError } = await supabaseServiceRole
      .from("admin_branch_access")
      .insert({
        admin_user_id: user.id,
        branch_id: null, // null = acceso global a todas las sucursales (super_admin)
        role: "manager",
        is_primary: true,
      });

    if (accessError) {
      logger.warn(
        "Error creating super admin branch access (non-critical)",
        accessError,
      );
      // No crítico, pero el usuario podría no tener acceso global
    }

    logger.info("Demo organization assigned successfully", {
      userId: user.id,
      organizationId: DEMO_ORG_ID,
    });

    return NextResponse.json({
      success: true,
      organizationId: DEMO_ORG_ID,
      organization: {
        id: demoOrg.id,
        name: demoOrg.name,
      },
    });
  } catch (error) {
    logger.error("Error in POST /api/onboarding/assign-demo", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
