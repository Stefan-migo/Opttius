import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * GET /api/admin/saas-management/payments
 * Obtiene la configuración de todas las pasarelas (root/dev only)
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();

    const { data: gateways, error } = await supabase
      .from("payment_gateways_config")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ gateways });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error al obtener config de pasarelas", error as Error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/saas-management/payments
 * Actualiza el estado de una pasarela (root/dev only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireRoot(request);
    const supabase = createServiceRoleClient();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json(
        { error: "Cuerpo de solicitud inválido (no es JSON)" },
        { status: 400 },
      );
    }

    const { id, is_enabled, display_order, name, description } = body;

    logger.info("Intentando actualizar pasarela", {
      id,
      is_enabled,
      userId,
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
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error al actualizar pasarela", {
      message: error instanceof Error ? error.message : String(error),
      error,
    });
    return NextResponse.json(
      {
        error: "Error interno",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
