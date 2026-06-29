/**
 * Unit tests for customer Zod schemas.
 *
 * Tests customerBaseSchema (createCustomerSchema),
 * updateCustomerSchema, and searchCustomerSchema.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createCustomerSchema,
  searchCustomerSchema,
  updateCustomerSchema,
} from "@/lib/validation/schemas/customers";

const validCustomer = {
  first_name: "Juan",
  last_name: "Pérez",
  email: "juan@example.com",
  phone: "+56912345678",
  rut: "12.345.678-9",
  date_of_birth: "1990-05-15",
  gender: "male",
  city: "Santiago",
  country: "Chile",
};

describe("createCustomerSchema", () => {
  it("accepts valid customer data", () => {
    const result = createCustomerSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it("accepts customer with only first_name", () => {
    const result = createCustomerSchema.safeParse({
      first_name: "Juan",
    });
    expect(result.success).toBe(true);
  });

  it("accepts customer with only last_name", () => {
    const result = createCustomerSchema.safeParse({
      last_name: "Pérez",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when both first_name and last_name are missing", () => {
    const result = createCustomerSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("first_name")),
      ).toBe(true);
    }
  });

  it("rejects empty first_name", () => {
    const result = createCustomerSchema.safeParse({
      first_name: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty last_name", () => {
    const result = createCustomerSchema.safeParse({
      last_name: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all gender enum values", () => {
    const genders = ["male", "female", "other", "prefer_not_to_say"] as const;
    for (const gender of genders) {
      const result = createCustomerSchema.safeParse({
        ...validCustomer,
        gender,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid gender value", () => {
    const result = createCustomerSchema.safeParse({
      ...validCustomer,
      // @ts-expect-error testing invalid enum
      gender: "unknown",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all preferred_contact_method enum values", () => {
    const methods = ["email", "phone", "sms", "whatsapp"] as const;
    for (const method of methods) {
      const result = createCustomerSchema.safeParse({
        ...validCustomer,
        preferred_contact_method: method,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid preferred_contact_method", () => {
    const result = createCustomerSchema.safeParse({
      ...validCustomer,
      // @ts-expect-error testing invalid enum
      preferred_contact_method: "pigeon",
    });
    expect(result.success).toBe(false);
  });

  it("accepts country when explicitly provided", () => {
    const result = createCustomerSchema.safeParse({
      first_name: "Ana",
      country: "Argentina",
    });
    expect(result.success).toBe(true);
  });

  it("accepts is_active as false", () => {
    const result = createCustomerSchema.safeParse({
      first_name: "Ana",
      is_active: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional fields as null", () => {
    const result = createCustomerSchema.safeParse({
      first_name: "Juan",
      gender: null,
      address_line_1: null,
      tags: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts tags as string array", () => {
    const result = createCustomerSchema.safeParse({
      first_name: "Juan",
      tags: ["vip", "contact-lens"],
    });
    expect(result.success).toBe(true);
  });

  it("transforms trimmed first_name", () => {
    const result = createCustomerSchema.safeParse({
      first_name: "  Juan  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBe("Juan");
    }
  });
});

describe("updateCustomerSchema", () => {
  it("accepts partial update with one field", () => {
    const result = updateCustomerSchema.safeParse({
      first_name: "María",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no fields to update)", () => {
    const result = updateCustomerSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts nullable fields", () => {
    const result = updateCustomerSchema.safeParse({
      address_line_1: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = updateCustomerSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("searchCustomerSchema", () => {
  it("accepts search query", () => {
    const result = searchCustomerSchema.safeParse({
      q: "Juan",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = searchCustomerSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts is_active boolean", () => {
    const result = searchCustomerSchema.safeParse({
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for branch_id", () => {
    const result = searchCustomerSchema.safeParse({
      branch_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});
