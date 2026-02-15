/**
 * POST /api/admin/payments/create-intent
 * Creates a payment intent (Flow order, Mercado Pago preference, PayPal order, etc.) and a payment record in DB.
 * Requires admin auth and organization context.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { ValidationError } from "@/lib/api/errors";
import { createPaymentIntentSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { PaymentGatewayFactory, PaymentService } from "@/lib/payments";
import type { PaymentGatewayType } from "@/lib/payments";

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
      logger.info("Payments create-intent API called");

      const { client: supabase, getUser } =
        await createClientFromRequest(request);

      const { data: userData, error: userError } = await getUser();
      const user = userData?.user;
      if (userError || !user) {
        logger.error("User authentication failed", userError);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: isAdmin, error: adminError } = (await supabase.rpc(
        "is_admin",
        { user_id: user.id } as IsAdminParams,
      )) as { data: IsAdminResult | null; error: Error | null };
      if (adminError || !isAdmin) {
        logger.warn("Admin check failed or user is not admin", { adminError });
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 },
        );
      }

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

      let body: {
        amount: number;
        currency: string;
        gateway: PaymentGatewayType;
        order_id?: string | null;
      };
      try {
        body = await parseAndValidateBody(request, createPaymentIntentSchema);
      } catch (error) {
        if (error instanceof ValidationError) {
          return validationErrorResponse(error);
        }
        throw error;
      }

      const { amount, currency, gateway, order_id: orderId } = body;

      const paymentService = new PaymentService(supabase);
      const gatewayInstance = PaymentGatewayFactory.getGateway(gateway);

      const paymentRecord = await paymentService.createPayment({
        order_id: orderId ?? null,
        organization_id: organizationId,
        user_id: user.id,
        amount,
        currency,
        status: "pending",
        gateway,
      });

      const intentResponse = await gatewayInstance.createPaymentIntent(
        orderId ?? null,
        amount,
        currency,
        user.id,
        organizationId,
      );

      await paymentService.updatePaymentStatus(
        paymentRecord.id,
        intentResponse.status,
        undefined,
        undefined,
        intentResponse.gatewayPaymentIntentId,
      );

      return NextResponse.json({
        paymentId: paymentRecord.id,
        clientSecret: intentResponse.clientSecret,
        preferenceId: intentResponse.preferenceId,
        approvalUrl: intentResponse.approvalUrl,
        gatewayPaymentIntentId: intentResponse.gatewayPaymentIntentId,
        status: intentResponse.status,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Internal server error";
      logger.error(
        "Payments create-intent error",
        error instanceof Error ? error : new Error(message),
      );
      return NextResponse.json(
        {
          error:
            typeof message === "string" ? message : "Internal server error",
        },
        { status: 500 },
      );
    }
  });
}
