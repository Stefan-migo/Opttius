import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/admin/saas-management/payments
 * Obtiene la configuración de todas las pasarelas
 */
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const supabase = await createClient();

    // Verificar que es super_admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      adminUser?.role !== "super_admin" &&
      adminUser?.role !== "root" &&
      adminUser?.role !== "dev"
    ) {
      logger.warn("Acceso denegado a SaaS Payments", {
        userId: user.id,
        userEmail: user.email,
        role: adminUser?.role || "sin-registro",
      });
      return NextResponse.json(
        {
          error: "Prohibido: Se requiere rol de Super Admin, Root o Dev",
          debug: { role: adminUser?.role || "no-role" },
        },
        { status: 403 },
      );
    }

    const { data: gateways, error } = await supabase
      .from("payment_gateways_config")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ gateways });
  } catch (error) {
    logger.error("Error al obtener config de pasarelas", error as Error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/saas-management/payments
 * Actualiza el estado de una pasarela
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json(
        { error: "Cuerpo de solicitud inválido (no es JSON)" },
        { status: 400 },
      );
    }

    const { id, is_enabled, display_order, name, description } = body;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      adminUser?.role !== "super_admin" &&
      adminUser?.role !== "root" &&
      adminUser?.role !== "dev"
    ) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }

    logger.info("Intentando actualizar pasarela", {
      id,
      is_enabled,
      role: adminUser?.role,
    });

    if (!id)
      return NextResponse.json(
        { error: "ID de pasarela requerido" },
        { status: 400 },
      );

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (is_enabled !== undefined) updateData.is_enabled = is_enabled;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const { data, error } = await supabase
      .from("payment_gateways_config")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle(); // Better than single() if id might not exist

    if (error) {
      logger.error("Error en query de Supabase al actualizar pasarela", error);
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "Pasarela no encontrada" },
        { status: 404 },
      );
    }

    logger.info("Configuración de pasarela actualizada", {
      gateway: data.gateway_id,
      enabled: data.is_enabled,
    });

    return NextResponse.json({ success: true, gateway: data });
  } catch (error: any) {
    logger.error("Error al actualizar pasarela", {
      message: error?.message || String(error),
      error,
    });
    return NextResponse.json(
      { error: "Error interno", details: error?.message },
      { status: 500 },
    );
  }
}
