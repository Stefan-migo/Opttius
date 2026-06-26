/**
 * Unit tests for parseWebhookBody — pure function, no mocks needed.
 */

import { describe, expect, it } from "vitest";

import { parseWebhookBody } from "@/lib/payments/mercadopago/webhook-parser";

describe("parseWebhookBody", () => {
  it("should extract eventId from searchParams data.id", () => {
    const searchParams = new URLSearchParams({ "data.id": "12345" });
    const result = parseWebhookBody(null, searchParams);
    expect(result.eventId).toBe("12345");
    expect(result.topic).toBe("payment");
  });

  it("should extract eventId from searchParams id", () => {
    const searchParams = new URLSearchParams({ id: "67890" });
    const result = parseWebhookBody(null, searchParams);
    expect(result.eventId).toBe("67890");
  });

  it("should extract eventId from body.data.id object", () => {
    const body = { data: { id: "abc" } };
    const result = parseWebhookBody(body, new URLSearchParams());
    expect(result.eventId).toBe("abc");
  });

  it("should extract eventId from body.data string", () => {
    const body = { data: "def" };
    const result = parseWebhookBody(body, new URLSearchParams());
    expect(result.eventId).toBe("def");
  });

  it("should extract eventId from body.id", () => {
    const body = { id: "ghi" };
    const result = parseWebhookBody(body, new URLSearchParams());
    expect(result.eventId).toBe("ghi");
  });

  it("should extract eventId from body.id as number", () => {
    const body = { id: 789 };
    const result = parseWebhookBody(body, new URLSearchParams());
    expect(result.eventId).toBe("789");
  });

  it("should extract eventId from body.api_id", () => {
    const body = { api_id: "api_123" };
    const result = parseWebhookBody(body, new URLSearchParams());
    expect(result.eventId).toBe("api_123");
  });

  it("should prefer searchParams over body for eventId", () => {
    const searchParams = new URLSearchParams({ "data.id": "from_query" });
    const body = { data: { id: "from_body" } };
    const result = parseWebhookBody(body, searchParams);
    expect(result.eventId).toBe("from_query");
  });

  it("should extract topic from body.type", () => {
    const body = { type: "payment" };
    const result = parseWebhookBody(body, new URLSearchParams());
    expect(result.topic).toBe("payment");
  });

  it("should extract topic from body.action", () => {
    const body = { action: "payment.created" };
    const result = parseWebhookBody(body, new URLSearchParams());
    expect(result.topic).toBe("payment.created");
  });

  it("should prefer body.type over body.action", () => {
    const body = { type: "payment", action: "payment.created" };
    const result = parseWebhookBody(body, new URLSearchParams());
    expect(result.topic).toBe("payment");
  });

  it("should use searchParams topic as fallback", () => {
    const searchParams = new URLSearchParams({ topic: "merchant_order" });
    const result = parseWebhookBody(null, searchParams);
    expect(result.topic).toBe("merchant_order");
  });

  it("should infer payment topic when eventId present but no topic", () => {
    const searchParams = new URLSearchParams({ id: "123" });
    const result = parseWebhookBody(null, searchParams);
    expect(result.topic).toBe("payment");
  });

  it("should return null eventId and null topic when nothing provided", () => {
    const result = parseWebhookBody(null, new URLSearchParams());
    expect(result.eventId).toBeNull();
    expect(result.topic).toBeNull();
  });

  it("should handle empty body object gracefully", () => {
    const result = parseWebhookBody({}, new URLSearchParams());
    expect(result.eventId).toBeNull();
    expect(result.topic).toBeNull();
  });

  it("should not throw on non-object body (e.g. string)", () => {
    const result = parseWebhookBody("not-an-object", new URLSearchParams());
    expect(result.eventId).toBeNull();
    expect(result.topic).toBeNull();
  });

  it("should not throw on null body", () => {
    const result = parseWebhookBody(null, new URLSearchParams());
    expect(result.eventId).toBeNull();
    expect(result.topic).toBeNull();
  });
});
