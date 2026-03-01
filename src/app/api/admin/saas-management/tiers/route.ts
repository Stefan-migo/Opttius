import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError, ValidationError } from "@/lib/api/errors";
import { tierUpdateSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";

/**
 * GET /api/admin/saas-management/tiers
 * Listar todos los tiers con estadísticas
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    // Obtener todos los tiers
    const { data: tiers, error } = await supabaseServiceRole
      .from("subscription_tiers")
      .select("*")
      .order("price_monthly", { ascending: true });

    if (error) {
      logger.error("Error fetching tiers", error);
      return NextResponse.json(
        { error: "Failed to fetch tiers" },
        { status: 500 },
      );
    }

    // Obtener estadísticas por tier
    const tiersWithStats = await Promise.all(
      (tiers || []).map(async (tier) => {
        // Contar organizaciones por tier
        const { count: orgCount } = await supabaseServiceRole
          .from("organizations")
          .select("*", { count: "exact", head: true })
          .eq("subscription_tier", tier.name);

        // Contar organizaciones activas
        const { count: activeOrgCount } = await supabaseServiceRole
          .from("organizations")
          .select("*", { count: "exact", head: true })
          .eq("subscription_tier", tier.name)
          .eq("status", "active");

        // Calcular ingresos mensuales estimados (precio * organizaciones activas)
        const monthlyRevenue =
          (tier.price_monthly || 0) * (activeOrgCount || 0);

        return {
          ...tier,
          stats: {
            totalOrganizations: orgCount || 0,
            activeOrganizations: activeOrgCount || 0,
            estimatedMonthlyRevenue: monthlyRevenue,
          },
        };
      }),
    );

    return NextResponse.json({ tiers: tiersWithStats });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in tiers API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/saas-management/tiers/[name]
 * Actualizar tier existente
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    let body;
    try {
      body = await parseAndValidateBody(request, tierUpdateSchema);
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error);
      }
      throw error;
    }

    const {
      name,
      price_monthly,
      max_branches,
      max_users,
      max_customers,
      max_products,
      features,
    } = body;

    // Validar que el tier existe
    const { data: existingTier } = await supabaseServiceRole
      .from("subscription_tiers")
      .select("name")
      .eq("name", name)
      .single();

    if (!existingTier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Preparar updates
    const updates: any = {};

    if (price_monthly !== undefined) {
      if (price_monthly < 0) {
        return NextResponse.json(
          { error: "price_monthly debe ser mayor o igual a 0" },
          { status: 400 },
        );
      }
      updates.price_monthly = price_monthly;
    }

    // NULL = unlimited; 0, null, undefined from client -> store NULL in DB
    const toLimitValue = (v: number | null | undefined) =>
      v == null || v === 0 ? null : v;

    if (max_branches !== undefined) {
      updates.max_branches = toLimitValue(max_branches);
    }

    if (max_users !== undefined) {
      updates.max_users = toLimitValue(max_users);
    }

    if (max_customers !== undefined) {
      updates.max_customers = toLimitValue(max_customers);
    }

    if (max_products !== undefined) {
      updates.max_products = toLimitValue(max_products);
    }

    if (features !== undefined) {
      updates.features = features;
    }

    // Actualizar
    const { data: updatedTier, error: updateError } = await supabaseServiceRole
      .from("subscription_tiers")
      .update(updates)
      .eq("name", name)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating tier", updateError);
      return NextResponse.json(
        { error: "Failed to update tier", details: updateError.message },
        { status: 500 },
      );
    }

    logger.info(`Tier updated: ${name}`);

    return NextResponse.json({ tier: updatedTier });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error updating tier", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
