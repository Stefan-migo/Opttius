import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { updateSubscriptionSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * GET /api/admin/saas-management/subscriptions/[id]
 * Obtener detalles completos de una suscripción
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

    // Obtener suscripción (sin relaciones complejas)
    const { data: subscription, error } = await supabaseServiceRole
      .from("subscriptions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !subscription) {
      logger.error("Error fetching subscription", error);
      return NextResponse.json(
        { error: "Subscription not found", details: error?.message },
        { status: 404 },
      );
    }

    // Obtener organización si existe
    let organization = null;
    if (subscription.organization_id) {
      const { data: org } = await supabaseServiceRole
        .from("organizations")
        .select(
          "id, name, slug, subscription_tier, status, owner_id, created_at",
        )
        .eq("id", subscription.organization_id)
        .maybeSingle();
      organization = org;
    }

    return NextResponse.json({
      subscription: {
        ...subscription,
        organization: organization || null,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error fetching subscription details", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/saas-management/subscriptions/[id]
 * Actualizar suscripción
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
    const parseResult = updateSubscriptionSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Datos inválidos" },
        { status: 400 },
      );
    }
    const {
      status,
      current_period_start,
      current_period_end,
      trial_ends_at,
      cancel_at,
    } = parseResult.data;

    // Verificar que la suscripción existe
    const { data: existingSub } = await supabaseServiceRole
      .from("subscriptions")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingSub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    // Preparar updates
    const updates: unknown = {};

    if (status !== undefined) updates.status = status;

    if (current_period_start !== undefined) {
      updates.current_period_start = current_period_start;
    }

    if (current_period_end !== undefined) {
      updates.current_period_end = current_period_end;
    }

    if (trial_ends_at !== undefined) {
      updates.trial_ends_at = trial_ends_at
        ? new Date(trial_ends_at).toISOString()
        : null;
    }

    if (cancel_at !== undefined) {
      updates.cancel_at = cancel_at;
      if (cancel_at) {
        updates.canceled_at = new Date().toISOString();
      } else {
        updates.canceled_at = null;
      }
    }

    // Actualizar
    const { data: updatedSub, error: updateError } = await supabaseServiceRole
      .from("subscriptions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating subscription", updateError);
      return NextResponse.json(
        {
          error: "Failed to update subscription",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    logger.info(`Subscription updated: ${id}`);

    return NextResponse.json({ subscription: updatedSub });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error updating subscription", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/saas-management/subscriptions/[id]
 * Eliminar suscripción completamente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;

    // Verificar que la suscripción existe
    const { data: existingSub } = await supabaseServiceRole
      .from("subscriptions")
      .select("id, organization_id, gateway_subscription_id")
      .eq("id", id)
      .single();

    if (!existingSub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
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

    logger.info(`Deleting subscription ${id}`);

    // Eliminar la suscripción
    const { error: deleteError } = await supabaseServiceRole
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("Error deleting subscription", deleteError);
      return NextResponse.json(
        {
          error: "Failed to delete subscription",
          details: deleteError.message,
        },
        { status: 500 },
      );
    }

    logger.info(`Subscription deleted successfully: ${id}`);

    return NextResponse.json({
      success: true,
      message: "Suscripción eliminada completamente",
      deleted: {
        subscriptionId: id,
        organizationId: existingSub.organization_id,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error deleting subscription", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
