import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    // Verificar que el usuario es root/dev
    await requireRoot(request);

    const supabaseServiceRole = createServiceRoleClient();

    // Obtener métricas básicas del sistema
    // Total de organizaciones
    const { count: totalOrgs } = await supabaseServiceRole
      .from("organizations")
      .select("*", { count: "exact", head: true });

    const { count: activeOrgs } = await supabaseServiceRole
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Total de usuarios admin
    const { count: totalUsers } = await supabaseServiceRole
      .from("admin_users")
      .select("*", { count: "exact", head: true });

    const { count: activeUsers } = await supabaseServiceRole
      .from("admin_users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Total de suscripciones
    const { count: totalSubs } = await supabaseServiceRole
      .from("subscriptions")
      .select("*", { count: "exact", head: true });

    const { count: activeSubs } = await supabaseServiceRole
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Calcular ingresos desde subscriptions activas
    const { data: activeSubscriptions } = await supabaseServiceRole
      .from("subscriptions")
      .select(
        "organization_id, organization:organizations!inner(subscription_tier)",
      )
      .eq("status", "active");

    // Obtener precios de tiers
    const { data: tiers } = await supabaseServiceRole
      .from("subscription_tiers")
      .select("name, price_monthly");

    const tierPrices: Record<string, number> = {};
    tiers?.forEach((tier) => {
      tierPrices[tier.name] = tier.price_monthly || 0;
    });

    // Calcular ingresos mensuales
    let monthlyRevenue = 0;
    activeSubscriptions?.forEach((sub: unknown) => {
      const tier = sub.organization?.subscription_tier;
      if (tier && tierPrices[tier]) {
        monthlyRevenue += tierPrices[tier];
      }
    });

    const annualRevenue = monthlyRevenue * 12;

    // Calcular crecimiento de organizaciones (últimos 30 días vs anteriores 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { count: orgsLast30Days } = await supabaseServiceRole
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { count: orgsPrevious30Days } = await supabaseServiceRole
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString());

    const organizationGrowth =
      orgsPrevious30Days && orgsPrevious30Days > 0
        ? ((orgsLast30Days || 0) / orgsPrevious30Days - 1) * 100
        : orgsLast30Days && orgsLast30Days > 0
          ? 100
          : 0;

    // Calcular tasa de conversión de trials
    const { count: totalTrials } = await supabaseServiceRole
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "trialing");

    const { count: convertedTrials } = await supabaseServiceRole
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .not("gateway_subscription_id", "is", null);

    const trialConversionRate =
      totalTrials && totalTrials > 0
        ? ((convertedTrials || 0) / totalTrials) * 100
        : 0;

    // Distribución por tier
    const { data: orgsByTier } = await supabaseServiceRole
      .from("organizations")
      .select("subscription_tier")
      .eq("status", "active");

    const tierDistribution: Record<string, number> = {};
    orgsByTier?.forEach((org) => {
      const tier = org.subscription_tier || "unknown";
      tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
    });

    const metrics = {
      totalOrganizations: totalOrgs || 0,
      activeOrganizations: activeOrgs || 0,
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalSubscriptions: totalSubs || 0,
      activeSubscriptions: activeSubs || 0,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      annualRevenue: Math.round(annualRevenue * 100) / 100,
      organizationGrowth: Math.round(organizationGrowth * 100) / 100,
      trialConversionRate: Math.round(trialConversionRate * 100) / 100,
      tierDistribution,
      organizationsLast30Days: orgsLast30Days || 0,
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error fetching SaaS metrics", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
