/**
 * POST /api/admin/subscription/actions
 * Acciones sobre la suscripción de la organización del usuario actual (cancelar, etc.)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    const organizationId = adminUser?.organization_id;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No tienes una organización asignada" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Se requiere el campo action" },
        { status: 400 },
      );
    }

    if (action === "cancel") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, status, current_period_end")
        .eq("organization_id", organizationId)
        .in("status", ["active", "trialing", "past_due", "incomplete"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub) {
        return NextResponse.json(
          { error: "No hay suscripción activa para cancelar" },
          { status: 404 },
        );
      }

      // Set cancel_at to current_period_end (access until end of paid period)
      // If no current_period_end, use today + 30 days as fallback
      const cancelAt = sub.current_period_end
        ? new Date(sub.current_period_end).toISOString().split("T")[0]
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancel_at: cancelAt,
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      if (updateError) {
        logger.error("Error cancelling subscription", updateError);
        return NextResponse.json(
          { error: "Error al cancelar la suscripción" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Suscripción cancelada. Tendrás acceso completo hasta ${cancelAt}.`,
        cancelAt,
      });
    }

    if (action === "reactivate") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("organization_id", organizationId)
        .eq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub) {
        return NextResponse.json(
          { error: "No hay suscripción cancelada para reactivar" },
          { status: 404 },
        );
      }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          cancel_at: null,
          canceled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      if (updateError) {
        logger.error("Error reactivating subscription", updateError);
        return NextResponse.json(
          { error: "Error al reactivar la suscripción" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Suscripción reactivada.",
      });
    }

    return NextResponse.json(
      { error: `Acción no permitida: ${action}` },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Error in subscription actions API", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
