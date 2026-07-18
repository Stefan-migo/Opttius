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

  // ============================================================
  // C1: Optional field acceptance, price 0 boundary
  // ============================================================

  it("accepts schema with only customer_id (all optionals omitted)", () => {
    const result = createQuoteSchema.safeParse({
      customer_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts subtotal, total_amount, frame_price as 0", () => {
    const r = createQuoteSchema.safeParse({
      ...validQuote,
      subtotal: 0,
      total_amount: 0,
      frame_price: 0,
    });
    expect(r.success).toBe(true);
  });

  it("accepts optional string fields as null or undefined", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      notes: null,
      frame_name: null,
      frame_color: null,
      customer_notes: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional UUID fields as null, undefined, or valid UUID", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      prescription_id: null,
      frame_product_id: undefined,
      lens_family_id: "550e8400-e29b-41d4-a716-446655440001",
      branch_id: null,
      field_operation_id: undefined,
    });
    expect(result.success).toBe(true);
  });

  // ============================================================
  // C2: Preprocessors and enum defaults
  // ============================================================

  it("preprocesses near_lens_cost from string to number", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      near_lens_cost: "30000",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.near_lens_cost).toBe(30000);
  });

  it("preprocesses near_lens_cost null and empty string to null", () => {
    const withNull = createQuoteSchema.safeParse({
      ...validQuote,
      near_lens_cost: null,
    });
    expect(withNull.success).toBe(true);
    if (withNull.success) expect(withNull.data.near_lens_cost).toBeNull();

    const withEmpty = createQuoteSchema.safeParse({
      ...validQuote,
      near_lens_cost: "",
    });
    expect(withEmpty.success).toBe(true);
    if (withEmpty.success) expect(withEmpty.data.near_lens_cost).toBeNull();
  });

  it("rejects negative near_lens_cost", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      near_lens_cost: -100,
    });
    expect(result.success).toBe(false);
  });

  it("preprocesses far_lens_cost non-numeric string to null", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      far_lens_cost: "abc",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.far_lens_cost).toBeNull();
  });

  it("rejects far_lens_cost boolean (preprocessor fallthrough)", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      far_lens_cost: true,
    });
    expect(result.success).toBe(false);
  });

  it("coerces contact_lens_quantity null to 1", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      contact_lens_quantity: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contact_lens_quantity).toBe(1);
  });

  it("coerces contact_lens_cost null to 0", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      contact_lens_cost: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contact_lens_cost).toBe(0);
  });

  it("coerces contact_lens_price null to 0", () => {
    const result = createQuoteSchema.safeParse({
      ...validQuote,
      contact_lens_price: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contact_lens_price).toBe(0);
  });

  it("customer_own_frame accepts true and is optional", () => {
    const withTrue = createQuoteSchema.safeParse({
      ...validQuote,
      customer_own_frame: true,
    });
    expect(withTrue.success).toBe(true);
    if (withTrue.success) expect(withTrue.data.customer_own_frame).toBe(true);

    const omitted = createQuoteSchema.safeParse(validQuote);
    expect(omitted.success).toBe(true);
  });

  it("customer_own_near_frame is optional when omitted", () => {
    const result = createQuoteSchema.safeParse(validQuote);
    expect(result.success).toBe(true);
  });

  it("near_frame_price_includes_tax is optional when omitted", () => {
    const result = createQuoteSchema.safeParse(validQuote);
    expect(result.success).toBe(true);
  });

  // ============================================================
  // C3: Numeric boundaries, string maxLength, near_* fields
  // ============================================================

  it("discount_percentage accepts boundary values 0, 50, 100", () => {
    for (const discount_percentage of [0, 50, 100]) {
      const r = createQuoteSchema.safeParse({ ...validQuote, discount_percentage });
      expect(r.success).toBe(true);
    }
  });

  it("discount_percentage rejects -1 and 101", () => {
    for (const discount_percentage of [-1, 101]) {
      const r = createQuoteSchema.safeParse({ ...validQuote, discount_percentage });
      expect(r.success).toBe(false);
    }
  });

  it("contact_lens_rx_axis_od rejects -1 and 90.5, accepts 0 and 180", () => {
    for (const axis of [0, 180]) {
      const r = createQuoteSchema.safeParse({
        ...validQuote,
        contact_lens_rx_axis_od: axis,
      });
      expect(r.success).toBe(true);
    }
    for (const axis of [-1, 90.5]) {
      const r = createQuoteSchema.safeParse({
        ...validQuote,
        contact_lens_rx_axis_od: axis,
      });
      expect(r.success).toBe(false);
    }
  });

  it("priceNonNegativeSchema accepts 0 and rejects -1 on frame_cost", () => {
    const accept = createQuoteSchema.safeParse({ ...validQuote, frame_cost: 0 });
    expect(accept.success).toBe(true);

    const reject = createQuoteSchema.safeParse({
      ...validQuote,
      frame_cost: -1,
    });
    expect(reject.success).toBe(false);
  });

  it("frame_name rejects string over 255 characters", () => {
    const pass = createQuoteSchema.safeParse({
      ...validQuote,
      frame_name: "a".repeat(255),
    });
    expect(pass.success).toBe(true);

    const fail = createQuoteSchema.safeParse({
      ...validQuote,
      frame_name: "a".repeat(256),
    });
    expect(fail.success).toBe(false);
  });

  it("notes rejects string over 5000 characters", () => {
    const pass = createQuoteSchema.safeParse({
      ...validQuote,
      notes: "a".repeat(5000),
    });
    expect(pass.success).toBe(true);

    const fail = createQuoteSchema.safeParse({
      ...validQuote,
      notes: "a".repeat(5001),
    });
    expect(fail.success).toBe(false);
  });

  it("accepts near_frame_product_id as null, undefined, or valid UUID", () => {
    const withNull = createQuoteSchema.safeParse({
      ...validQuote,
      near_frame_product_id: null,
    });
    expect(withNull.success).toBe(true);

    const withUndefined = createQuoteSchema.safeParse({
      ...validQuote,
      near_frame_product_id: undefined,
    });
    expect(withUndefined.success).toBe(true);

    const withUUID = createQuoteSchema.safeParse({
      ...validQuote,
      near_frame_product_id: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(withUUID.success).toBe(true);
  });
});
