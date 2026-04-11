import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * GET /api/admin/saas-management/organizations/[id]/subscriptions
 * Listar todas las suscripciones de una organización
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

    // Obtener suscripciones
    const { data: subscriptions, error } = await supabaseServiceRole
      .from("subscriptions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching subscriptions", error);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ subscriptions: subscriptions || [] });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in organization subscriptions API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/organizations/[id]/subscriptions
 * Crear nueva suscripción para una organización
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
    const {
      gateway_subscription_id,
      gateway_customer_id,
      gateway = "flow",
      status = "trialing",
      current_period_start,
      current_period_end,
    } = body;

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

    // Validar status
    const validStatuses = [
      "active",
      "past_due",
      "cancelled",
      "trialing",
      "incomplete",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Status inválido. Debe ser: " + validStatuses.join(", ") },
        { status: 400 },
      );
    }

    // Crear suscripción
    const { data: newSubscription, error: createError } =
      await supabaseServiceRole
        .from("subscriptions")
        .insert({
          organization_id: organizationId,
          gateway_subscription_id: gateway_subscription_id || null,
          gateway_customer_id: gateway_customer_id || null,
          gateway: gateway || "flow",
          status,
          current_period_start: current_period_start || null,
          current_period_end: current_period_end || null,
        })
        .select()
        .single();

    if (createError) {
      logger.error("Error creating subscription", createError);
      return NextResponse.json(
        {
          error: "Failed to create subscription",
          details: createError.message,
        },
        { status: 500 },
      );
    }

    logger.info(
      `Subscription created: ${newSubscription.id} for organization ${organizationId}`,
    );

    return NextResponse.json(
      { subscription: newSubscription },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in organization subscriptions API POST", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
