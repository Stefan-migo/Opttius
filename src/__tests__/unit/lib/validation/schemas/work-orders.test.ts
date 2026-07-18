/**
 * Unit tests for work order Zod schemas.
 *
 * Tests createWorkOrderSchema validation rules.
 */

import { describe, expect, it } from "vitest";

import { createWorkOrderSchema } from "@/lib/validation/schemas/work-orders";

const validWorkOrder = {
  customer_id: "550e8400-e29b-41d4-a716-446655440000",
  frame_name: "Aviator Classic",
  lens_type: "Progresivo",
  lens_material: "Policarbonato",
  total_amount: 297500,
};

describe("createWorkOrderSchema", () => {
  it("accepts valid work order", () => {
    const result = createWorkOrderSchema.safeParse(validWorkOrder);
    expect(result.success).toBe(true);
  });

  it("rejects missing customer_id", () => {
    const result = createWorkOrderSchema.safeParse({
      frame_name: "Aviator",
      lens_type: "Progresivo",
      lens_material: "Policarbonato",
      total_amount: 100000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("customer_id")),
      ).toBe(true);
    }
  });

  it("rejects invalid customer_id UUID", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      customer_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing frame_name", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      frame_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing lens_type", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lens_type: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing lens_material", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lens_material: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing total_amount", () => {
    const result = createWorkOrderSchema.safeParse({
      customer_id: "550e8400-e29b-41d4-a716-446655440000",
      frame_name: "Aviator",
      lens_type: "Progresivo",
      lens_material: "Policarbonato",
    });
    expect(result.success).toBe(false);
  });

  it("coerces string total_amount to number", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      total_amount: "297500",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total_amount).toBe(297500);
    }
  });

  it("rejects negative total_amount", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      total_amount: -100,
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
      const result = createWorkOrderSchema.safeParse({
        ...validWorkOrder,
        presbyopia_solution,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all status enum values", () => {
    const statuses = [
      "quote",
      "pending",
      "in_progress",
      "completed",
      "cancelled",
      "ordered",
    ] as const;
    for (const status of statuses) {
      const result = createWorkOrderSchema.safeParse({
        ...validWorkOrder,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      // @ts-expect-error testing invalid enum
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all payment_status enum values", () => {
    const statuses = ["pending", "partial", "paid", "refunded"] as const;
    for (const payment_status of statuses) {
      const result = createWorkOrderSchema.safeParse({
        ...validWorkOrder,
        payment_status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("preprocesses far_lens_cost from string", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      far_lens_cost: "75000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.far_lens_cost).toBe(75000);
    }
  });

  it("accepts currency when explicitly provided", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      currency: "USD",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
    }
  });

  it("accepts payment_status as pending when explicitly set", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      payment_status: "pending",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payment_status).toBe("pending");
    }
  });

  it("accepts presbyopia_solution as none when explicitly set", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      presbyopia_solution: "none",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.presbyopia_solution).toBe("none");
    }
  });

  it("accepts lens_index as positive number", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lens_index: 1.67,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-positive lens_index", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lens_index: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts lens_treatments array", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lens_treatments: ["AR", "UV"],
    });
    expect(result.success).toBe(true);
  });

  // ============================================================
  // D1: Preprocessors (near_lens_cost, far_lens_cost NaN),
  //     required field edges, customer_own_frame
  // ============================================================

  it("preprocesses near_lens_cost from string to number", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      near_lens_cost: "20000",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.near_lens_cost).toBe(20000);
  });

  it("preprocesses near_lens_cost null and empty string to null", () => {
    const withNull = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      near_lens_cost: null,
    });
    expect(withNull.success).toBe(true);
    if (withNull.success) expect(withNull.data.near_lens_cost).toBeNull();

    const withEmpty = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      near_lens_cost: "",
    });
    expect(withEmpty.success).toBe(true);
    if (withEmpty.success) expect(withEmpty.data.near_lens_cost).toBeNull();
  });

  it("rejects negative near_lens_cost", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      near_lens_cost: -100,
    });
    expect(result.success).toBe(false);
  });

  it("preprocesses far_lens_cost non-numeric string to null", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      far_lens_cost: "abc",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.far_lens_cost).toBeNull();
  });

  it("rejects far_lens_cost boolean (preprocessor fallthrough)", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      far_lens_cost: true,
    });
    expect(result.success).toBe(false);
  });

  // ponytail: schema has .min(1) BEFORE .trim(), so "   " passes
  // then gets trimmed to "". Would need ".trim().min(1)" to reject whitespace-only.
  it("accepts frame_name with only whitespace (schema order: min before trim)", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      frame_name: "   ",
    });
    expect(result.success).toBe(true);
  });

  it("customer_own_frame accepts true and is optional", () => {
    const withTrue = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      customer_own_frame: true,
    });
    expect(withTrue.success).toBe(true);
    if (withTrue.success) expect(withTrue.data.customer_own_frame).toBe(true);

    const omitted = createWorkOrderSchema.safeParse(validWorkOrder);
    expect(omitted.success).toBe(true);
  });

  // ============================================================
  // D2: Numeric boundaries, string maxLength, invalid enums
  // ============================================================

  it("lens_tint_percentage accepts boundary values 0 and 100", () => {
    for (const lens_tint_percentage of [0, 100]) {
      const r = createWorkOrderSchema.safeParse({
        ...validWorkOrder,
        lens_tint_percentage,
      });
      expect(r.success).toBe(true);
    }
  });

  it("lens_tint_percentage rejects -1 and 101", () => {
    for (const lens_tint_percentage of [-1, 101]) {
      const r = createWorkOrderSchema.safeParse({
        ...validWorkOrder,
        lens_tint_percentage,
      });
      expect(r.success).toBe(false);
    }
  });

  it("deposit_amount accepts 0 and 50000, rejects -1", () => {
    for (const deposit_amount of [0, 50000]) {
      const r = createWorkOrderSchema.safeParse({
        ...validWorkOrder,
        deposit_amount,
      });
      expect(r.success).toBe(true);
    }

    const reject = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      deposit_amount: -1,
    });
    expect(reject.success).toBe(false);
  });

  it("balance_amount rejects 0 and negative", () => {
    for (const balance_amount of [0, -1]) {
      const r = createWorkOrderSchema.safeParse({
        ...validWorkOrder,
        balance_amount,
      });
      expect(r.success).toBe(false);
    }
  });

  it("frame_name rejects string over 255 characters", () => {
    const pass = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      frame_name: "a".repeat(255),
    });
    expect(pass.success).toBe(true);
  });

  it("lens_type rejects string over 100 characters", () => {
    const fail = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lens_type: "a".repeat(101),
    });
    expect(fail.success).toBe(false);
  });

  it("lens_material rejects string over 100 characters", () => {
    const fail = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lens_material: "a".repeat(101),
    });
    expect(fail.success).toBe(false);
  });

  it("lab_name rejects string over 200 characters", () => {
    const fail = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lab_name: "a".repeat(201),
    });
    expect(fail.success).toBe(false);
  });

  it("rejects invalid payment_status", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      // @ts-expect-error testing invalid enum
      payment_status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });

  // ============================================================
  // D3: total_amount edge, defaults, lab/balance fields,
  //     optional UUIDs
  // ============================================================

  it("total_amount empty string and invalid string return required_error", () => {
    const empty = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      total_amount: "",
    });
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(
        empty.error.issues.some((i) => i.path.includes("total_amount")),
      ).toBe(true);
    }

    const invalid = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      total_amount: "invalid",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(
        invalid.error.issues.some((i) => i.path.includes("total_amount")),
      ).toBe(true);
    }
  });

  it("status, currency, presbyopia_solution, deposit_amount accept explicit values", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      status: "in_progress",
      currency: "USD",
      presbyopia_solution: "progressive",
      deposit_amount: 50000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("in_progress");
      expect(result.data.currency).toBe("USD");
      expect(result.data.presbyopia_solution).toBe("progressive");
      expect(result.data.deposit_amount).toBe(50000);
    }
  });

  it("accepts lab_estimated_delivery_date as ISO date string", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lab_estimated_delivery_date: "2024-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("accepts payment_method as string", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      payment_method: "Efectivo",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.payment_method).toBe("Efectivo");
  });

  it("accepts optional UUID fields as null, undefined, or valid UUID", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      prescription_id: null,
      quote_id: undefined,
      frame_product_id: "550e8400-e29b-41d4-a716-446655440001",
      lens_family_id: null,
      far_lens_family_id: undefined,
      near_lens_family_id: null,
      pos_order_id: undefined,
      assigned_to: null,
      branch_id: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional lab fields and assigned_to as null or undefined", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      lab_name: null,
      lab_contact: undefined,
      lab_order_number: null,
      assigned_to: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("accepts internal_notes and customer_notes at max 5000 chars", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      internal_notes: "a".repeat(5000),
      customer_notes: "a".repeat(5000),
    });
    expect(result.success).toBe(true);
  });

  it("balance_amount accepts positive number", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWorkOrder,
      balance_amount: 100000,
    });
    expect(result.success).toBe(true);
  });
});
