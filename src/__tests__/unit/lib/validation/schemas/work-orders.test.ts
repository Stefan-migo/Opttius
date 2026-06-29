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
});
