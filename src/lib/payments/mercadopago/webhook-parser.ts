/**
 * Parses webhook request body and search params for MercadoPago notifications.
 * Pure function — no side effects, no logger calls.
 *
 * @module lib/payments/mercadopago/webhook-parser
 */

export function parseWebhookBody(
  body: unknown,
  searchParams: URLSearchParams,
): { eventId: string | null; topic: string | null } {
  // Priority cascade for eventId:
  // 1. searchParams "data.id" or "id"
  let eventId = searchParams.get("data.id") ?? searchParams.get("id") ?? null;

  // 2. Attempt body extraction when searchParams yielded nothing
  if (body && typeof body === "object" && !eventId) {
    const bodyRecord = body as Record<string, unknown>;
    const data = bodyRecord.data;

    if (data != null && typeof data === "object" && "id" in data) {
      eventId = String((data as { id: unknown }).id);
    } else if (typeof data === "string") {
      eventId = data;
    } else if (
      typeof bodyRecord.id === "string" ||
      typeof bodyRecord.id === "number"
    ) {
      eventId = String(bodyRecord.id);
    } else if (
      typeof bodyRecord.api_id === "string" ||
      typeof bodyRecord.api_id === "number"
    ) {
      eventId = String(bodyRecord.api_id);
    }
  }

  // Fallback: searchParams "id" again (matches original route behaviour)
  if (!eventId) {
    eventId = searchParams.get("id") ?? null;
  }

  // Topic from body → searchParams → inferred from eventId
  const bodyRecord =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const topicFromBody =
    (bodyRecord && typeof bodyRecord.type === "string"
      ? bodyRecord.type
      : null) ??
    (bodyRecord && typeof bodyRecord.action === "string"
      ? bodyRecord.action
      : null) ??
    null;
  const topic =
    topicFromBody ?? searchParams.get("topic") ?? (eventId ? "payment" : null);

  return { eventId, topic };
}
