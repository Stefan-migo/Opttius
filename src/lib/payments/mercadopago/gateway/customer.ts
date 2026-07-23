/**
 * Mercado Pago Gateway — Customer & saved card management.
 *
 * @module lib/payments/mercadopago/gateway/customer
 */

import { appLogger as logger } from "@/lib/logger";

import { getMPClient, getReadableErrorMessage } from "./helpers";

/**
 * Creates a customer in Mercado Pago (for saved cards / recurring).
 * @param email - Payer email
 * @returns MP customer id
 */
export async function createCustomer(email: string): Promise<string> {
  const { customer } = getMPClient();
  try {
    const result = await customer.create({
      body: { email },
    });
    const body =
      (result as { body?: { id?: string } }).body ??
      (result as { id?: string });
    const id = body.id ?? (result as { id?: string }).id;
    if (!id) {
      throw new Error("Mercado Pago customer creation returned no id");
    }
    logger.info("Mercado Pago Customer created", { customerId: id, email });
    return String(id);
  } catch (error) {
    const errorMessage = getReadableErrorMessage(error);
    logger.error(
      "Error creating Mercado Pago Customer",
      error instanceof Error ? error : new Error(errorMessage),
      { email },
    );
    throw new Error(`Mercado Pago customer error: ${errorMessage}`);
  }
}

/**
 * Finds a customer by email (MP search).
 * @param email - Payer email
 * @returns MP customer id or null
 */
export async function findCustomerByEmail(
  email: string,
): Promise<string | null> {
  const { customer } = getMPClient();
  try {
    const result = await customer.search({ options: { email } });
    const results =
      (result as { results?: Array<{ id?: string }> }).results ?? [];
    const first = results[0];
    return first?.id ? String(first.id) : null;
  } catch (error) {
    logger.warn("Mercado Pago customer search failed", {
      error: error instanceof Error ? error.message : String(error),
      email,
    });
    return null;
  }
}

/**
 * Adds a card to a Mercado Pago customer (token from Bricks).
 * @param customerId - MP customer id
 * @param token - Card token from Bricks
 * @returns MP card id
 */
export async function addCardToCustomer(
  customerId: string,
  token: string,
): Promise<string> {
  const { customer } = getMPClient();
  try {
    const result = await customer.createCard({
      customerId,
      body: { token },
    });
    const body =
      (result as { body?: { id?: string } }).body ??
      (result as { id?: string });
    const id = body.id ?? (result as { id?: string }).id;
    if (!id) {
      throw new Error("Mercado Pago card creation returned no id");
    }
    logger.info("Mercado Pago Card added to customer", {
      customerId,
      cardId: id,
    });
    return String(id);
  } catch (error) {
    const errorMessage = getReadableErrorMessage(error);
    logger.error(
      "Error adding card to Mercado Pago Customer",
      error instanceof Error ? error : new Error(errorMessage),
      { customerId },
    );
    throw new Error(`Mercado Pago card error: ${errorMessage}`);
  }
}

/**
 * Creates or gets MP customer and adds card (save payment method).
 * @param email - Payer email
 * @param token - Card token from Bricks
 * @returns { customerId, cardId }
 */
export async function createCustomerAndAddCard(
  email: string,
  token: string,
): Promise<{ customerId: string; cardId: string }> {
  let customerId = await findCustomerByEmail(email);
  if (!customerId) {
    customerId = await createCustomer(email);
  }
  const cardId = await addCardToCustomer(customerId, token);
  return { customerId, cardId };
}
