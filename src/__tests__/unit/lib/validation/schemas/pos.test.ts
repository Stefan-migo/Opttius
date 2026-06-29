/**
 * Unit tests for POS Zod schemas.
 *
 * Tests processSaleSchema, createPaymentIntentSchema,
 * and pendingBalancePaySchema.
 */

import { describe, expect, it } from "vitest";

import {
  createPaymentIntentSchema,
  pendingBalancePaySchema,
  processSaleSchema,
} from "@/lib/validation/schemas/pos";

const validSale = {
  payment_method_type: "cash",
  subtotal: 250000,
  total_amount: 250000,
  items: [
    {
      product_id: "550e8400-e29b-41d4-a716-446655440001",
      quantity: 1,
      unit_price: 250000,
      product_name: "Aviator Classic",
    },
  ],
};

describe("processSaleSchema", () => {
  it("accepts valid cash sale", () => {
    const result = processSaleSchema.safeParse(validSale);
    expect(result.success).toBe(true);
  });

  it("rejects missing payment_method_type", () => {
    const result = processSaleSchema.safeParse({
      subtotal: 250000,
      total_amount: 250000,
      items: validSale.items,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("payment_method_type")),
      ).toBe(true);
    }
  });

  it("accepts all payment_method_type enum values", () => {
    const methods = [
      "cash",
      "card",
      "credit",
      "debit_card",
      "credit_card",
      "deposit",
      "transfer",
    ] as const;
    for (const method of methods) {
      const result = processSaleSchema.safeParse({
        ...validSale,
        payment_method_type: method,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid payment_method_type", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      // @ts-expect-error testing invalid enum
      payment_method_type: "bitcoin",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all payment_status enum values", () => {
    const statuses = ["paid", "pending", "partial", "failed", "refunded"] as const;
    for (const payment_status of statuses) {
      const result = processSaleSchema.safeParse({
        ...validSale,
        payment_status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty items array", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing items", () => {
    const result = processSaleSchema.safeParse({
      payment_method_type: "cash",
      subtotal: 250000,
      total_amount: 250000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects total_amount that does not match subtotal + tax", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      subtotal: 100000,
      tax_amount: 19000,
      total_amount: 150000, // should be 119000
    });
    expect(result.success).toBe(false);
  });

  it("accepts total_amount that matches subtotal + tax", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      subtotal: 100000,
      tax_amount: 19000,
      total_amount: 119000,
    });
    expect(result.success).toBe(true);
  });

  it("coerces string price to number", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      subtotal: "250000",
      total_amount: "250000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subtotal).toBe(250000);
      expect(result.data.total_amount).toBe(250000);
    }
  });

  it("accepts payments array with matching total", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      payments: [
        { method: "cash", amount: 100000 },
        { method: "debit_card", amount: 150000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects payments array that does not cover total", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      payments: [{ method: "cash", amount: 50000 }],
    });
    expect(result.success).toBe(false);
  });

  it("requires purchase_order_id when agreement_id is set", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      agreement_id: "550e8400-e29b-41d4-a716-446655440010",
      // no purchase_order_id
    });
    expect(result.success).toBe(false);
  });

  it("accepts agreement_id with purchase_order_id", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      agreement_id: "550e8400-e29b-41d4-a716-446655440010",
      purchase_order_id: "550e8400-e29b-41d4-a716-446655440011",
    });
    expect(result.success).toBe(true);
  });

  it("coerces quantity from string", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      items: [
        {
          ...validSale.items[0],
          quantity: "2",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].quantity).toBe(2);
    }
  });

  it("rejects invalid unit_price (not a number)", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      items: [
        {
          ...validSale.items[0],
          unit_price: "free",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts currency when explicitly provided", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      currency: "USD",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
    }
  });

  it("accepts status as delivered when explicitly set", () => {
    const result = processSaleSchema.safeParse({
      ...validSale,
      status: "delivered",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("delivered");
    }
  });
});

describe("createPaymentIntentSchema", () => {
  it("accepts valid payment intent", () => {
    const result = createPaymentIntentSchema.safeParse({
      amount: 250000,
      gateway: "flow",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing amount", () => {
    const result = createPaymentIntentSchema.safeParse({
      gateway: "flow",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid gateway", () => {
    const result = createPaymentIntentSchema.safeParse({
      amount: 250000,
      // @ts-expect-error testing invalid enum
      gateway: "stripe",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all gateway enum values", () => {
    const gateways = ["flow", "mercadopago", "paypal"] as const;
    for (const gateway of gateways) {
      const result = createPaymentIntentSchema.safeParse({
        amount: 250000,
        gateway,
      });
      expect(result.success).toBe(true);
    }
  });

  it("transforms currency to uppercase", () => {
    const result = createPaymentIntentSchema.safeParse({
      amount: 250000,
      gateway: "flow",
      currency: "clp",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("CLP");
    }
  });
});

describe("pendingBalancePaySchema", () => {
  const validBalancePay = {
    order_id: "550e8400-e29b-41d4-a716-446655440000",
    payment_amount: 50000,
    payment_method: "cash",
  };

  it("accepts valid balance payment", () => {
    const result = pendingBalancePaySchema.safeParse(validBalancePay);
    expect(result.success).toBe(true);
  });

  it("rejects missing order_id", () => {
    const result = pendingBalancePaySchema.safeParse({
      payment_amount: 50000,
      payment_method: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid order_id UUID", () => {
    const result = pendingBalancePaySchema.safeParse({
      ...validBalancePay,
      order_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid payment_method", () => {
    const result = pendingBalancePaySchema.safeParse({
      ...validBalancePay,
      // @ts-expect-error testing invalid enum
      payment_method: "crypto",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative payment_amount", () => {
    const result = pendingBalancePaySchema.safeParse({
      ...validBalancePay,
      payment_amount: -100,
    });
    expect(result.success).toBe(false);
  });
});
