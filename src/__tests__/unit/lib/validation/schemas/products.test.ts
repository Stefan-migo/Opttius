/**
 * Unit tests for product Zod schemas.
 *
 * Tests createProductSchema, updateProductSchema,
 * and searchProductSchema.
 */

import { describe, expect, it } from "vitest";

import {
  createProductSchema,
  productBaseSchema,
  searchProductSchema,
  updateProductSchema,
} from "@/lib/validation/schemas/products";

const validProduct = {
  name: "Aviator Classic",
  price: 150000,
  product_type: "frame",
  status: "active",
};

describe("productBaseSchema", () => {
  it("accepts valid product data", () => {
    const result = productBaseSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = productBaseSchema.safeParse({
      price: 150000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("name"))).toBe(
        true,
      );
    }
  });

  it("rejects empty name", () => {
    const result = productBaseSchema.safeParse({
      name: "",
      price: 150000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing price", () => {
    const result = productBaseSchema.safeParse({
      name: "Aviator Classic",
    });
    expect(result.success).toBe(false);
  });

  it("coerces string price to number", () => {
    const result = productBaseSchema.safeParse({
      name: "Aviator Classic",
      price: "150000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(150000);
    }
  });

  it("rejects negative price", () => {
    const result = productBaseSchema.safeParse({
      name: "Aviator Classic",
      price: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all product_type enum values", () => {
    const types = ["frame", "lens", "accessory", "service", "other"] as const;
    for (const product_type of types) {
      const result = productBaseSchema.safeParse({
        ...validProduct,
        product_type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid product_type", () => {
    const result = productBaseSchema.safeParse({
      ...validProduct,
      // @ts-expect-error testing invalid enum
      product_type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all status enum values", () => {
    const statuses = ["active", "draft", "archived"] as const;
    for (const status of statuses) {
      const result = productBaseSchema.safeParse({
        ...validProduct,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("defaults product_type to frame", () => {
    const result = productBaseSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.product_type).toBe("frame");
    }
  });

  it("accepts status as draft when explicitly set", () => {
    const result = productBaseSchema.safeParse({
      ...validProduct,
      status: "draft",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
    }
  });

  it("accepts optional optical frame numeric fields", () => {
    const result = productBaseSchema.safeParse({
      ...validProduct,
      frame_bridge_width: 18,
      frame_temple_length: 145,
      frame_lens_width: 52,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative frame_bridge_width", () => {
    const result = productBaseSchema.safeParse({
      ...validProduct,
      frame_bridge_width: -5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts ingredients array", () => {
    const result = productBaseSchema.safeParse({
      ...validProduct,
      ingredients: [
        { name: "Ingrediente A", percentage: 30 },
        { name: "Ingrediente B" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects ingredient with invalid percentage", () => {
    const result = productBaseSchema.safeParse({
      ...validProduct,
      ingredients: [{ name: "Test", percentage: 150 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("createProductSchema", () => {
  it("accepts create with stock_quantity", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      stock_quantity: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateProductSchema", () => {
  it("accepts partial product update", () => {
    const result = updateProductSchema.safeParse({
      name: "Updated Name",
      price: 200000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateProductSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("searchProductSchema", () => {
  it("accepts search with filters", () => {
    const result = searchProductSchema.safeParse({
      q: "aviator",
      product_type: "frame",
      status: "active",
      min_price: 1000,
      max_price: 500000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty search", () => {
    const result = searchProductSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("coerces min_price string to number", () => {
    const result = searchProductSchema.safeParse({
      min_price: "50000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.min_price).toBe(50000);
    }
  });

  it("rejects negative min_price", () => {
    const result = searchProductSchema.safeParse({
      min_price: -100,
    });
    expect(result.success).toBe(false);
  });
});
