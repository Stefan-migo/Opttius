/**
 * POST /api/checkout/confirm-payment
 * Confirms a payment using MercadoPago Bricks token (Checkout API)
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
import { z } from "zod";

const confirmPaymentSchema = z.object({
  token: z.string().min(1, "Token es requerido"),
  paymentId: z.string().uuid("Payment ID inválido"),
  payerEmail: z.string().email("Email inválido"),
  payment_method_id: z.string().min(1, "payment_method_id es requerido"),
  issuer_id: z.string().optional(),
  description: z.string().optional(),
  saveCard: z.boolean().optional(),
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
      logger.info("Checkout confirm-payment API called");

      const { client: supabase, getUser } =
        await createClientFromRequest(request);

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
            error: "Organization context required for payments.",
          },
          { status: 403 },
        );
      }

      const organizationId = orgId;

      // Parse body once (request body stream can only be read once)
      let body: z.infer<typeof confirmPaymentSchema>;
      try {
        body = await parseAndValidateBody(request, confirmPaymentSchema);
      } catch (error) {
        if (error instanceof ValidationError) {
          return validationErrorResponse(error);
        }
        throw error;
      }

      const {
        token,
        paymentId: bodyPaymentId,
        payerEmail,
        payment_method_id,
        issuer_id,
        description,
        saveCard,
      } = body;

      // Get payment record
      const paymentService = new PaymentService(supabase);
      const payment = await paymentService.getPaymentById(bodyPaymentId);

      if (!payment) {
        return NextResponse.json(
          { error: "Payment not found" },
          { status: 404 },
        );
      }

      if (payment.organization_id !== organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      if (payment.gateway !== "mercadopago") {
        return NextResponse.json(
          {
            error:
              "Este método de pago requiere completar el pago en la ventana externa. Si fuiste redirigido, verifica el estado en el panel de suscripción.",
          },
          { status: 400 },
        );
      }

      // Create payment with MercadoPago (only MP supports Bricks/token flow)
      const gatewayInstance = PaymentGatewayFactory.getGateway("mercadopago");
      if (!gatewayInstance.createPaymentWithToken) {
        return NextResponse.json(
          { error: "Gateway does not support token payments" },
          { status: 400 },
        );
      }

      const mpPayment = await gatewayInstance.createPaymentWithToken(
        token,
        payment.amount,
        payment.currency,
        user.id,
        organizationId,
        payerEmail,
        payment_method_id,
        issuer_id ?? undefined,
        description || (payment.metadata?.description as string | undefined),
        payment.metadata as Record<string, unknown> | undefined,
      );

      // Update payment record
      await paymentService.updatePaymentStatus(
        payment.id,
        mpPayment.status,
        mpPayment.id,
        payment.metadata,
        mpPayment.id,
      );

      // If payment succeeded, apply to organization
      if (mpPayment.status === "succeeded") {
        await paymentService.applyPaymentSuccessToOrganization(
          organizationId,
          {
            ...payment,
            status: "succeeded",
            gateway_transaction_id: mpPayment.id,
            gateway_payment_intent_id: mpPayment.id,
          },
          mpPayment.id,
          mpPayment.id,
        );
        // Phase C: optionally save card (create MP customer + add card, store in subscription)
        const mpGateway = gatewayInstance as {
          createCustomerAndAddCard?: (
            email: string,
            token: string,
          ) => Promise<{ customerId: string; cardId: string }>;
        };
        if (saveCard && mpGateway.createCustomerAndAddCard) {
          try {
            const { customerId, cardId } =
              await mpGateway.createCustomerAndAddCard(payerEmail, token);
            await paymentService.updateSubscriptionPaymentMethod(
              organizationId,
              customerId,
              cardId,
            );
          } catch (saveError) {
            logger.warn("Failed to save card (non-blocking)", {
              error:
                saveError instanceof Error
                  ? saveError.message
                  : String(saveError),
              organizationId,
            });
            // Do not fail the response; payment already succeeded
          }
        }
      }

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        status: mpPayment.status,
        gatewayPaymentId: mpPayment.id,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Error desconocido al confirmar pago";
      logger.error(
        "Error in checkout confirm-payment",
        error instanceof Error ? error : new Error(message),
      );
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
