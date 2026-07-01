/**
 * POST /api/checkout/create-preapproval
 * Creates a Mercado Pago PreApproval (recurring subscription) for the given tier.
 * MP will charge automatically each period; sync status via webhooks.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ValidationError } from "@/lib/api/errors";
import { rateLimitConfigs, withRateLimit } from "@/lib/rate-limiting";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { appLogger as logger } from "@/lib/logger";
import { PaymentGatewayFactory } from "@/lib/payments";
import {
  createClientFromRequest,
  createServiceRoleClient,
} from "@/utils/supabase/server";

const createPreapprovalSchema = z.object({
  tier: z.enum(["basic", "pro", "premium"]),
  payerEmail: z.string().email("Email inválido"),
  cardTokenId: z.string().min(1, "Token de tarjeta es requerido"),
});

const paymentRateLimitConfig =
  process.env.NODE_ENV === "development"
    ? { ...rateLimitConfigs.payment, maxRequests: 30 }
    : rateLimitConfigs.payment;

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";
const backUrl = `${baseUrl.replace(/\/$/, "")}/checkout/result`;

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  return (
    withRateLimit(paymentRateLimitConfig) as (
      req: NextRequest,
      handler: () => Promise<NextResponse>,
    ) => Promise<NextResponse>
  )(request, async () => {
    try {
      const { client: supabase, getUser } =
        await createClientFromRequest(request);
      const { data: userData, error: userError } = await getUser();
      const user = userData?.user;
      if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      const orgId =
        adminUser && "organization_id" in adminUser
          ? (adminUser as { organization_id: string | null }).organization_id
          : null;
      if (!orgId) {
        return NextResponse.json(
          { error: "Organization context required." },
          { status: 403 },
        );
      }

      let body: z.infer<typeof createPreapprovalSchema>;
      try {
        body = await parseAndValidateBody(request, createPreapprovalSchema);
      } catch (error) {
        if (error instanceof ValidationError) {
          return validationErrorResponse(error);
        }
        throw error;
      }

      const { tier, payerEmail, cardTokenId } = body;

      const serviceSupabase = createServiceRoleClient();
      const { data: tierRow, error: tierError } = await serviceSupabase
        .from("subscription_tiers")
        .select("name, price_monthly, gateway_plan_id")
        .eq("name", tier)
        .single();

      if (tierError || !tierRow?.gateway_plan_id) {
        logger.warn("Recurring plan not found or missing gateway_plan_id", {
          tier,
        });
        return NextResponse.json(
          {
            error:
              "Plan recurrente no disponible para este tier. Use pago único.",
          },
          { status: 400 },
        );
      }

      const gateway = PaymentGatewayFactory.getGateway("mercadopago");
      if (!("createPreApproval" in gateway)) {
        return NextResponse.json(
          { error: "Recurring subscriptions not supported" },
          { status: 400 },
        );
      }

      const preapproval = await (
        gateway as {
          createPreApproval: (
            planId: string,
            payerEmail: string,
            cardTokenId: string,
            reason: string,
            externalRef: string,
            backUrl: string,
          ) => Promise<{ id: string; status: string }>;
        }
      ).createPreApproval(
        tierRow.gateway_plan_id,
        payerEmail,
        cardTokenId,
        `Opttius ${tierRow.name}`,
        orgId,
        backUrl,
      );

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data: existing } = await serviceSupabase
        .from("subscriptions")
        .select("id")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await serviceSupabase
          .from("subscriptions")
          .update({
            status: "active",
            gateway: "mercadopago",
            gateway_subscription_id: preapproval.id,
            current_period_start: now.toISOString().slice(0, 10),
            current_period_end: periodEnd.toISOString().slice(0, 10),
            cancel_at: null,
            canceled_at: null,
            updated_at: now.toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await serviceSupabase.from("subscriptions").insert({
          organization_id: orgId,
          gateway: "mercadopago",
          status: "active",
          gateway_subscription_id: preapproval.id,
          current_period_start: now.toISOString().slice(0, 10),
          current_period_end: periodEnd.toISOString().slice(0, 10),
        });
      }

      await serviceSupabase
        .from("organizations")
        .update({
          subscription_tier: tier,
          updated_at: now.toISOString(),
        })
        .eq("id", orgId);

      return NextResponse.json({
        success: true,
        preapprovalId: preapproval.id,
        status: preapproval.status,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Error al crear suscripción recurrente";
      logger.error(
        "Error in create-preapproval",
        error instanceof Error ? error : new Error(message),
      );
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
