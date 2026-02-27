/**
 * POST /api/checkout/create-intent
 * Creates a payment intent for checkout (public route with authentication)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { ValidationError } from "@/lib/api/errors";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { PaymentGatewayFactory, PaymentService } from "@/lib/payments";
import type { PaymentGatewayType } from "@/lib/payments";
import { z } from "zod";

const createCheckoutIntentSchema = z.object({
  amount: z.number().positive("El monto debe ser positivo"),
  currency: z.string().default("CLP"),
  gateway: z
    .enum(["flow", "mercadopago", "paypal", "nowpayments"])
    .default("mercadopago"),
  subscription_tier: z.enum(["basic", "pro", "premium"]).optional(),
  isUpgrade: z.boolean().optional(),
  isDowngrade: z.boolean().optional(),
});

const paymentRateLimitConfig =
  process.env.NODE_ENV === "development"
    ? { ...rateLimitConfigs.payment, maxRequests: 50 }
    : rateLimitConfigs.payment;

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  return (
    withRateLimit(paymentRateLimitConfig) as (
      req: NextRequest,
      handler: () => Promise<NextResponse>,
    ) => Promise<NextResponse>
  )(request, async () => {
    try {
      logger.info("Checkout create-intent API called");

      let supabase: Awaited<
        ReturnType<typeof createClientFromRequest>
      >["client"];
      let getUser: Awaited<
        ReturnType<typeof createClientFromRequest>
      >["getUser"];
      try {
        const created = await createClientFromRequest(request);
        supabase = created.client;
        getUser = created.getUser;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(
          "createClientFromRequest failed",
          err instanceof Error ? err : new Error(msg),
        );
        return NextResponse.json(
          {
            error:
              "Error de sesión. Intenta recargar o iniciar sesión de nuevo.",
          },
          { status: 500 },
        );
      }

      const { data: userData, error: userError } = await getUser();
      const user = userData?.user;
      if (userError || !user) {
        logger.error("User authentication failed", userError);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get user's organization
      const { data: adminUser, error: adminUserError } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      const orgId =
        adminUser && "organization_id" in adminUser
          ? (adminUser as { organization_id: string | null }).organization_id
          : null;
      if (adminUserError || !orgId) {
        logger.warn("User has no organization_id", { adminUserError });
        return NextResponse.json(
          {
            error:
              "Organization context required for payments. Your user must belong to an organization.",
          },
          { status: 403 },
        );
      }

      const organizationId = orgId;

      let body: z.infer<typeof createCheckoutIntentSchema>;
      try {
        body = await parseAndValidateBody(request, createCheckoutIntentSchema);
      } catch (error) {
        if (error instanceof ValidationError) {
          return validationErrorResponse(error);
        }
        throw error;
      }

      let { amount, currency, gateway, subscription_tier } = body;
      let amountNum = Number(amount);

      // NOWPayments normalization: Convert CLP to USD because NOWPayments doesn't support CLP fiat price
      if (gateway === "nowpayments" && currency === "CLP") {
        const CLP_TO_USD_RATE =
          Number(process.env.NOWPAYMENTS_CLP_TO_USD_RATE || "950") || 950;
        const originalAmount = amountNum;
        amountNum = Math.round((amountNum / CLP_TO_USD_RATE) * 100) / 100;
        currency = "USD";
        logger.info("NOWPayments Currency Normalization Applied", {
          original: `${originalAmount} CLP`,
          normalized: `${amountNum} USD`,
          rate: CLP_TO_USD_RATE,
        });
      }
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return NextResponse.json(
          { error: "El monto debe ser un número positivo." },
          { status: 400 },
        );
      }

      const paymentService = new PaymentService(supabase);
      const gatewayInstance = PaymentGatewayFactory.getGateway(gateway);

      // Create payment record with metadata
      const metadata: Record<string, unknown> = {
        subscription_tier: subscription_tier || undefined,
        is_upgrade: body.isUpgrade || false,
        is_downgrade: body.isDowngrade || false,
      };

      let paymentRecord;
      try {
        paymentRecord = await paymentService.createPayment({
          order_id: null,
          organization_id: organizationId,
          user_id: user.id,
          amount: amountNum,
          currency,
          status: "pending",
          gateway,
          metadata,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(
          "createPayment failed",
          err instanceof Error ? err : new Error(msg),
          { organizationId },
        );
        return NextResponse.json(
          {
            error:
              "No se pudo crear el registro de pago. Revisa permisos o contacta soporte.",
          },
          { status: 500 },
        );
      }

      let intentResponse;
      try {
        intentResponse = await gatewayInstance.createPaymentIntent(
          paymentRecord.id,
          amountNum,
          currency,
          user.id,
          organizationId,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(
          "createPaymentIntent (gateway) failed",
          err instanceof Error ? err : new Error(msg),
          {
            gateway,
            amount: amountNum,
          },
        );
        return NextResponse.json(
          {
            error:
              process.env.NODE_ENV === "development"
                ? msg
                : "Error al conectar con la pasarela de pago. Revisa la configuración (Mercado Pago) o intenta más tarde.",
          },
          { status: 500 },
        );
      }

      try {
        await paymentService.updatePaymentStatus(
          paymentRecord.id,
          intentResponse.status,
          undefined,
          metadata,
          intentResponse.gatewayPaymentIntentId,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(
          "updatePaymentStatus failed",
          err instanceof Error ? err : new Error(msg),
          {
            paymentId: paymentRecord.id,
          },
        );
        return NextResponse.json(
          {
            error:
              "Pago creado pero no se pudo actualizar el estado. Guarda el ID: " +
              paymentRecord.id,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        paymentId: paymentRecord.id,
        clientSecret: intentResponse.clientSecret,
        preferenceId: intentResponse.preferenceId,
        approvalUrl: intentResponse.approvalUrl || intentResponse.invoiceUrl,
        invoiceUrl: intentResponse.invoiceUrl,
        gatewayPaymentIntentId: intentResponse.gatewayPaymentIntentId,
        status: intentResponse.status,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Error desconocido al crear intento de pago";
      const isDev = process.env.NODE_ENV === "development";
      logger.error(
        "Error in checkout create-intent",
        error instanceof Error ? error : new Error(message),
        isDev && error instanceof Error ? { stack: error.stack } : undefined,
      );
      return NextResponse.json(
        {
          error: isDev
            ? message
            : "Error al crear intento de pago. Intenta de nuevo.",
        },
        { status: 500 },
      );
    }
  });
}
