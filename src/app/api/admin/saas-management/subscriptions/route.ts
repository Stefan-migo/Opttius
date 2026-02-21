import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";
import { createSubscriptionSchema } from "@/lib/api/validation/zod-schemas";

/**
 * GET /api/admin/saas-management/subscriptions
 * Listar todas las suscripciones con filtros (solo root/dev)
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");
    const status = searchParams.get("status");
    const tier = searchParams.get("tier");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Construir query base
    let query = supabaseServiceRole
      .from("subscriptions")
      .select(
        `
        *,
        organization:organizations (
          id,
          name,
          slug,
          subscription_tier,
          status
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    // Aplicar filtros
    if (organizationId && organizationId !== "all") {
      query = query.eq("organization_id", organizationId);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Si hay filtro por tier, primero obtener IDs de organizaciones con ese tier
    if (tier && tier !== "all") {
      const { data: orgsWithTier, error: orgError } = await supabaseServiceRole
        .from("organizations")
        .select("id")
        .eq("subscription_tier", tier);

      if (orgError) {
        logger.error("Error fetching organizations by tier", orgError);
        return NextResponse.json(
          { error: "Failed to filter by tier", details: orgError.message },
          { status: 500 },
        );
      }

      if (orgsWithTier && orgsWithTier.length > 0) {
        const orgIds = orgsWithTier.map((o: any) => o.id);
        query = query.in("organization_id", orgIds);
      } else {
        // No hay organizaciones con ese tier, retornar vacío
        return NextResponse.json({
          subscriptions: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data: subscriptions, error, count } = await query;

    if (error) {
      logger.error("Error fetching subscriptions", error);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions", details: error.message },
        { status: 500 },
      );
    }

    // Calcular días hasta vencimiento (para trial usar trial_ends_at, para activa usar current_period_end)
    const subscriptionsWithDetails = (subscriptions || []).map((sub: any) => {
      const today = new Date();
      let daysUntilExpiry: number | null = null;
      const isTrialing = sub.status === "trialing";
      const endSource =
        isTrialing && sub.trial_ends_at
          ? sub.trial_ends_at
          : sub.current_period_end;
      if (endSource) {
        const endDate = new Date(endSource);
        const diffTime = endDate.getTime() - today.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

      return {
        ...sub,
        daysUntilExpiry,
        isExpiringSoon:
          daysUntilExpiry !== null &&
          daysUntilExpiry <= 7 &&
          daysUntilExpiry >= 0,
        isExpired,
      };
    });

    return NextResponse.json({
      subscriptions: subscriptionsWithDetails,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in subscriptions API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/subscriptions
 * Crear una nueva suscripción (solo root/dev)
 */
export async function POST(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const body = await request.json();
    const parseResult = createSubscriptionSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Datos inválidos" },
        { status: 400 },
      );
    }
    const {
      organization_id,
      status,
      trial_days,
      trial_ends_at,
      current_period_start,
      current_period_end,
    } = parseResult.data;

    let trialEndsAt: string | null = null;
    let periodEnd: string | null = null;
    if (trial_ends_at) {
      trialEndsAt = new Date(trial_ends_at).toISOString();
      periodEnd = trialEndsAt.split("T")[0];
    } else if (trial_days != null && trial_days > 0) {
      const end = new Date();
      end.setDate(end.getDate() + Number(trial_days));
      trialEndsAt = end.toISOString();
      periodEnd = trialEndsAt.split("T")[0];
    }
    if (current_period_end) periodEnd = current_period_end;

    const { data: newSub, error } = await supabaseServiceRole
      .from("subscriptions")
      .insert({
        organization_id,
        status,
        trial_ends_at: trialEndsAt,
        current_period_start:
          current_period_start ||
          (periodEnd ? new Date().toISOString().split("T")[0] : null),
        current_period_end: periodEnd,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating subscription", error);
      return NextResponse.json(
        { error: "Error al crear suscripción", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ subscription: newSub });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in subscriptions API POST", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
