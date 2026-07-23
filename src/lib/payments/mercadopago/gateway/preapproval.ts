/**
 * Mercado Pago Gateway — Pre-approval plans & subscription management.
 *
 * @module lib/payments/mercadopago/gateway/preapproval
 */

import { appLogger as logger } from "@/lib/logger";

import { getMPClient, getReadableErrorMessage } from "./helpers";

/**
 * Creates a Preapproval Plan (recurring plan) in Mercado Pago.
 * @param reason - Plan description
 * @param amount - Monthly amount
 * @param currency - Currency code (e.g. CLP)
 * @param backUrl - Return URL after checkout
 */
export async function createPreApprovalPlan(
  reason: string,
  amount: number,
  currency: string,
  backUrl: string,
): Promise<{ id: string; init_point?: string }> {
  const { preApprovalPlan } = getMPClient();
  try {
    const amountInteger = Math.round(Number(amount));
    const result = await preApprovalPlan.create({
      body: {
        reason,
        back_url: backUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: amountInteger,
          currency_id: currency.toUpperCase(),
          billing_day: 10,
          billing_day_proportional: false,
        },
        payment_methods_allowed: {
          payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
        },
      },
    });
    const body =
      (result as { body?: { id?: string; init_point?: string } }).body ??
      (result as { id?: string; init_point?: string });
    const id = body.id ?? (result as { id?: string }).id;
    if (!id) {
      throw new Error(
        "Mercado Pago preapproval plan creation returned no id",
      );
    }
    logger.info("Mercado Pago PreApproval Plan created", {
      planId: id,
      reason,
      amount,
    });
    return {
      id: String(id),
      init_point:
        body.init_point ?? (result as { init_point?: string }).init_point,
    };
  } catch (error) {
    const errorMessage = getReadableErrorMessage(error);
    logger.error(
      "Error creating Mercado Pago PreApproval Plan",
      error instanceof Error ? error : new Error(errorMessage),
      { reason, amount },
    );
    throw new Error(`Mercado Pago preapproval plan error: ${errorMessage}`);
  }
}

/**
 * Creates a Preapproval (subscription) linked to a plan and payer.
 * @param preapprovalPlanId - MP plan id
 * @param payerEmail - Payer email
 * @param cardTokenId - Card token from Bricks
 * @param reason - Description
 * @param externalReference - Our organization_id or subscription id
 * @param backUrl - Return URL
 */
export async function createPreApproval(
  preapprovalPlanId: string,
  payerEmail: string,
  cardTokenId: string,
  reason: string,
  externalReference: string,
  backUrl: string,
): Promise<{
  id: string;
  status: string;
  init_point?: string;
}> {
  const { preApproval } = getMPClient();
  try {
    const result = await preApproval.create({
      body: {
        preapproval_plan_id: preapprovalPlanId,
        payer_email: payerEmail,
        card_token_id: cardTokenId,
        reason,
        external_reference: externalReference,
        back_url: backUrl,
      },
    });
    const body =
      (
        result as {
          body?: { id?: string; status?: string; init_point?: string };
        }
      ).body ??
      (result as { id?: string; status?: string; init_point?: string });
    const id = body.id ?? (result as { id?: string }).id;
    const status =
      body.status ?? (result as { status?: string }).status ?? "pending";
    if (!id) {
      throw new Error("Mercado Pago preapproval creation returned no id");
    }
    logger.info("Mercado Pago PreApproval (subscription) created", {
      preapprovalId: id,
      status,
      externalReference,
    });
    return {
      id: String(id),
      status: String(status),
      init_point:
        body.init_point ?? (result as { init_point?: string }).init_point,
    };
  } catch (error) {
    const errorMessage = getReadableErrorMessage(error);
    logger.error(
      "Error creating Mercado Pago PreApproval",
      error instanceof Error ? error : new Error(errorMessage),
      { preapprovalPlanId, externalReference },
    );
    throw new Error(`Mercado Pago preapproval error: ${errorMessage}`);
  }
}

/**
 * Fetches a PreApproval (subscription) by id (for webhook sync).
 */
export async function getPreApproval(preapprovalId: string): Promise<{
  id: string;
  status: string;
  external_reference?: string | null;
  payer_email?: string;
  reason?: string;
} | null> {
  const { preApproval } = getMPClient();
  try {
    const result = await preApproval.get({ id: preapprovalId });
    const body =
      (result as { body?: Record<string, unknown> }).body ??
      (result as unknown as Record<string, unknown>);
    return {
      id: String(body.id ?? preapprovalId),
      status: String(body.status ?? "pending"),
      external_reference:
        (body.external_reference as string | null) ?? undefined,
      payer_email: body.payer_email as string | undefined,
      reason: body.reason as string | undefined,
    };
  } catch (error) {
    logger.error(
      "Error fetching Mercado Pago PreApproval",
      error instanceof Error ? error : new Error(String(error)),
      { preapprovalId },
    );
    return null;
  }
}
