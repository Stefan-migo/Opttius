import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";

/**
 * POST /api/onboarding/ensure-admin-user
 *
 * Asegura que el usuario actual tenga un registro en admin_users.
 * Si no existe, lo crea con role 'store_manager'.
 * Esto permite que usuarios nuevos puedan acceder al onboarding.
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

    // Verificar si ya existe en admin_users
    const { data: existingAdminUser, error: checkError } =
      await supabaseServiceRole
        .from("admin_users")
        .select("id, role, organization_id")
        .eq("id", user.id)
        .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      logger.error("Error checking admin_users", checkError);
      return NextResponse.json(
        {
          error: "Error al verificar usuario admin",
          details: checkError?.message,
        },
        { status: 500 },
      );
    }

    // Si ya existe, retornar éxito
    if (existingAdminUser) {
      return NextResponse.json({
        success: true,
        adminUser: existingAdminUser,
        created: false,
      });
    }

    // Crear registro en admin_users
    // Nota: Después de la migración 20250210000001, el rol debe ser 'admin' (simplificado)
    const { data: newAdminUser, error: createError } = await supabaseServiceRole
      .from("admin_users")
      .insert({
        id: user.id,
        email: user.email,
        role: "admin", // Sistema simplificado usa solo 'admin'
        is_active: true,
        permissions: {
          orders: ["read", "create", "update", "delete"],
          products: ["read", "create", "update", "delete"],
          customers: ["read", "create", "update", "delete"],
          analytics: ["read"],
          settings: ["read", "create", "update", "delete"],
          admin_users: ["read", "create", "update", "delete"],
          support: ["read", "create", "update", "delete"],
          bulk_operations: ["read", "create", "update", "delete"],
        },
      })
      .select()
      .single();

    if (createError || !newAdminUser) {
      logger.error("Error creating admin_users record", createError);
      return NextResponse.json(
        {
          error: "Error al crear registro de usuario admin",
          details: createError?.message,
        },
        { status: 500 },
      );
    }

    logger.info("Admin user record created", {
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      adminUser: newAdminUser,
      created: true,
    });
  } catch (error) {
    logger.error("Error in POST /api/onboarding/ensure-admin-user", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
