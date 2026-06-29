/**
 * Unit tests for quote Zod schemas.
 *
 * Tests createQuoteSchema validation rules.
 */

import { describe, expect, it } from "vitest";

import { createQuoteSchema } from "@/lib/validation/schemas/quotes";

const validQuote = {
  customer_id: "550e8400-e29b-41d4-a716-446655440000",
  frame_name: "Aviator Classic",
  lens_type: "Progresivo",
  lens_material: "Policarbonato",
  subtotal: 250000,
  total_amount: 297500,
  tax_amount: 47500,
};

describe("createQuoteSchema", () => {
  it("accepts valid quote", () => {
    const result = createQuoteSchema.safeParse(validQuote);
    expect(result.success).toBe(true);
  });

  it("rejects missing customer_id", () => {
    const result = createQuoteSchema.safeParse({
      frame_name: "Aviator",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("customer_id")),
      ).toBe(true);
    }
  });

  it("rejects invalid customer_id UUID", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      customer_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all presbyopia_solution enum values", () => {
    const solutions = [
      "none",
      "two_separate",
      "bifocal",
      "trifocal",
      "progressive",
    ] as const;
    for (const presbyopia_solution of solutions) {
      const result = createQuoteSchema.safeParse({
        ...validQuote,
        presbyopia_solution,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid presbyopia_solution", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      // @ts-expect-error testing invalid enum
      presbyopia_solution: "monovision",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all status enum values", () => {
    const statuses = ["draft", "sent", "accepted", "rejected", "expired"] as const;
    for (const status of statuses) {
      const result = createQuoteSchema.safeParse({
        ...validQuote,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts status as draft when explicitly set", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      status: "draft",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
    }
  });

  it("accepts currency when explicitly provided", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      currency: "USD",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
    }
  });

  it("preprocesses far_lens_cost from string", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      far_lens_cost: "75000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.far_lens_cost).toBe(75000);
    }
  });

  it("preprocesses far_lens_cost null and empty string to null", () => {
    const withNull = createQuoteSchema.safeParse({
      ...validQuote,
      far_lens_cost: null,
    });
    expect(withNull.success).toBe(true);
    if (withNull.success) {
      expect(withNull.data.far_lens_cost).toBeNull();
    }

    const withEmpty = createQuoteSchema.safeParse({
      ...validQuote,
      far_lens_cost: "",
    });
    expect(withEmpty.success).toBe(true);
    if (withEmpty.success) {
      expect(withEmpty.data.far_lens_cost).toBeNull();
    }
  });

  it("rejects negative far_lens_cost", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      far_lens_cost: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts contact_lens axis values between 0 and 180", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      contact_lens_rx_axis_od: 90,
      contact_lens_rx_axis_os: 180,
    });
    expect(result.success).toBe(true);
  });

  it("rejects contact_lens axis over 180", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      contact_lens_rx_axis_od: 200,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional lens_treatments array", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      lens_treatments: ["AR", "UV", "BlueCut"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts lens_index as positive number", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      lens_index: 1.67,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-positive lens_index", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      lens_index: 0,
    });
    expect(result.success).toBe(false);
  });
});
