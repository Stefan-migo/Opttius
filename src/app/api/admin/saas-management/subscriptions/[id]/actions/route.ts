import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { recordAuditLog, getClientInfoFromRequest } from "@/lib/saas/audit-log";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * POST /api/admin/saas-management/subscriptions/[id]/actions
 * Acciones sobre suscripciones: cancelar, reactivar, modificar
 */
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;
    const body = await request.json();
    const { action, value } = body;

    // Verificar que la suscripción existe
    const { data: subscription } = await supabaseServiceRole
      .from("subscriptions")
      .select("id, status, organization_id, current_period_end")
      .eq("id", id)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    const updateData: unknown = {};

    switch (action) {
      case "cancel":
        updateData.status = "cancelled";
        updateData.cancel_at = new Date().toISOString().split("T")[0];
        updateData.canceled_at = new Date().toISOString();
        break;

      case "reactivate":
        updateData.status = "active";
        updateData.cancel_at = null;
        updateData.canceled_at = null;
        break;

      case "extend":
        // Extender período de suscripción
        if (!value || !value.days) {
          return NextResponse.json(
            { error: "days es requerido para extender suscripción" },
            { status: 400 },
          );
        }

        const currentEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end)
          : new Date();
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + parseInt(value.days));

        updateData.current_period_end = newEnd.toISOString().split("T")[0];
        break;

      case "sync_gateway":
        // Sincronizar con Flow/Mercado Pago (placeholder - implementar según integración)
        logger.info(`Gateway sync requested for subscription ${id}`);
        return NextResponse.json({
          success: true,
          message: "Sincronización con pasarela pendiente de implementación",
        });

      default:
        return NextResponse.json(
          { error: `Acción inválida: ${action}` },
          { status: 400 },
        );
    }

    const { data: updatedSub, error: updateError } = await supabaseServiceRole
      .from("subscriptions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error performing action on subscription", updateError);
      return NextResponse.json(
        { error: "Failed to perform action", details: updateError.message },
        { status: 500 },
      );
    }

    // Record audit log
    const { userId, user } = await requireRoot(request);
    const { ipAddress, userAgent } = getClientInfoFromRequest(request);
    await recordAuditLog({
      userId,
      userEmail: user?.email,
      action: action as "cancel" | "reactivate" | "extend",
      targetType: "subscription",
      targetId: id,
      targetName: subscription.organization_id || null,
      oldValue: { status: subscription.status },
      newValue: { status: updatedSub?.status },
      ipAddress,
      userAgent,
    });

    logger.info(`Subscription action performed: ${action} on ${id}`);

    const messages: Record<string, string> = {
      cancel:
        "Suscripción cancelada. La organización mantendrá el acceso hasta el final del periodo actual.",
      reactivate: "Suscripción reactivada.",
      extend: "Periodo extendido correctamente.",
    };

    return NextResponse.json({
      success: true,
      subscription: updatedSub,
      action,
      message: messages[action] || "Acción realizada.",
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in subscription action", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
