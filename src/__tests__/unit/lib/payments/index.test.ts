/**
 * Unit tests for payments module index (gateway factory)
 *
 * @module __tests__/unit/lib/payments/index.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock all gateway modules so their imports are never evaluated
const MockGateway = vi.hoisted(
  () =>
    class MockGateway {
      createPaymentIntent = vi.fn();
      processWebhookEvent = vi.fn();
      mapStatus = vi.fn();
    },
);

vi.mock("@/lib/payments/flow/gateway", () => ({
  FlowGateway: MockGateway,
}));

vi.mock("@/lib/payments/mercadopago/gateway", () => ({
  MercadoPagoGateway: MockGateway,
}));

vi.mock("@/lib/payments/nowpayments/gateway", () => ({
  NowPaymentsGateway: MockGateway,
}));

vi.mock("@/lib/payments/paypal/gateway", () => ({
  PayPalGateway: MockGateway,
}));

import type { IPaymentGateway } from "@/lib/payments/interfaces";
import { PaymentGatewayFactory } from "@/lib/payments/index";

describe("PaymentGatewayFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getGateway('flow') should return a FlowGateway instance", () => {
    const gateway = PaymentGatewayFactory.getGateway("flow");
    expect(gateway).toBeDefined();
    expect(typeof gateway.createPaymentIntent).toBe("function");
  });

  it("getGateway('mercadopago') should return a MercadoPagoGateway instance", () => {
    const gateway = PaymentGatewayFactory.getGateway("mercadopago");
    expect(gateway).toBeDefined();
    expect(typeof gateway.processWebhookEvent).toBe("function");
  });

  it("getGateway('nowpayments') should return a NowPaymentsGateway instance", () => {
    const gateway = PaymentGatewayFactory.getGateway("nowpayments");
    expect(gateway).toBeDefined();
    expect(typeof gateway.createPaymentIntent).toBe("function");
  });

  it("getGateway('paypal') should return a PayPalGateway instance", () => {
    const gateway = PaymentGatewayFactory.getGateway("paypal");
    expect(gateway).toBeDefined();
    expect(typeof gateway.createPaymentIntent).toBe("function");
  });

  it("getGateway with invalid type should throw", () => {
    expect(() =>
      PaymentGatewayFactory.getGateway("invalid" as never),
    ).toThrow("not supported");
  });
});
