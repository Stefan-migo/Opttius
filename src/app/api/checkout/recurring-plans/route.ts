/**
 * GET /api/checkout/recurring-plans
 * Returns subscription tiers with Mercado Pago PreApproval Plan ids (for recurring).
 * Creates MP plans on first request if gateway_plan_id is missing (lazy init).
 */
import { NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { PaymentGatewayFactory } from "@/lib/payments";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

function getBackUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/checkout/result`;
}

export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceSupabase = createServiceRoleClient();
  const { data: tiers, error } = await serviceSupabase
    .from("subscription_tiers")
    .select("name, price_monthly, gateway_plan_id")
    .order("price_monthly", { ascending: true });

  if (error) {
    logger.error("Error fetching recurring plans", error);
    return NextResponse.json(
      { error: "Error al cargar planes recurrentes", details: error.message },
      { status: 500 },
    );
  }

  const gateway = PaymentGatewayFactory.getGateway("mercadopago");
  if (!("createPreApprovalPlan" in gateway)) {
    return NextResponse.json({
      recurringPlans: (tiers || []).map(
        (t: {
          name: string;
          price_monthly: number;
          gateway_plan_id: string | null;
        }) => ({
          name: t.name,
          price_monthly: Number(t.price_monthly),
          plan_id: t.gateway_plan_id,
        }),
      ),
    });
  }

  const backUrl = getBackUrl();
  const results: Array<{
    name: string;
    price_monthly: number;
    plan_id: string | null;
  }> = [];

  for (const tier of tiers || []) {
    let planId = tier.gateway_plan_id as string | null;
    if (!planId) {
      try {
        const created = await (
          gateway as {
            createPreApprovalPlan: (
              reason: string,
              amount: number,
              currency: string,
              backUrl: string,
            ) => Promise<{ id: string }>;
          }
        ).createPreApprovalPlan(
          `Opttius Plan ${tier.name}`,
          Number(tier.price_monthly),
          "CLP",
          backUrl,
        );
        planId = created.id;
        await serviceSupabase
          .from("subscription_tiers")
          .update({ gateway_plan_id: planId })
          .eq("name", tier.name);
      } catch (err) {
        logger.warn("Failed to create MP plan for tier", {
          tier: tier.name,
          err,
        });
      }
    }
    results.push({
      name: tier.name,
      price_monthly: Number(tier.price_monthly),
      plan_id: planId,
    });
  }

  return NextResponse.json({ recurringPlans: results });
}
