/**
 * Unit tests for common validation schemas (lib/validation/schemas.ts)
 *
 * Tests all reusable Zod schemas with valid, invalid, and edge case inputs.
 * All schemas are pure Zod — no mocks needed.
 *
 * @module __tests__/unit/lib/validation/schemas.test
 */

import { describe, expect, it } from "vitest";

import {
  emailSchema,
  emailOptionalSchema,
  uuidSchema,
  phoneNumberSchema,
  phoneNumberOptionalSchema,
  positiveIntegerSchema,
  nonNegativeIntegerSchema,
  percentageSchema,
  priceSchema,
  nameSchema,
  descriptionSchema,
  slugSchema,
  paginationSchema,
  searchQuerySchema,
  statusSchema,
  booleanStringSchema,
  uuidArraySchema,
} from "@/lib/validation/schemas";

// ============================================================================
// EMAIL
// ============================================================================
describe("emailSchema", () => {
  it("should accept a valid email", () => {
    expect(emailSchema.parse("test@example.com")).toBe("test@example.com");
  });

  it("should reject an invalid email", () => {
    expect(() => emailSchema.parse("not-an-email")).toThrow();
  });

  it("should reject an email without domain", () => {
    expect(() => emailSchema.parse("user@")).toThrow();
  });

  it("should lowercase the email", () => {
    expect(emailSchema.parse("Test@Example.COM")).toBe("test@example.com");
  });

  it("should reject a very long email", () => {
    const long = "a".repeat(250) + "@b.com";
    expect(() => emailSchema.parse(long)).toThrow();
  });
});

describe("emailOptionalSchema", () => {
  it("should accept a valid email", () => {
    const result = emailOptionalSchema.parse("test@example.com");
    expect(result).toBe("test@example.com");
  });

  it("should return null for null input", () => {
    expect(emailOptionalSchema.parse(null)).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(emailOptionalSchema.parse("")).toBeNull();
  });

  it("should return null for undefined (with default)", () => {
    expect(emailOptionalSchema.parse(undefined)).toBeNull();
  });
});

// ============================================================================
// UUID
// ============================================================================
describe("uuidSchema", () => {
  it("should accept a valid UUID", () => {
    expect(uuidSchema.parse("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("should reject a non-UUID string", () => {
    expect(() => uuidSchema.parse("not-a-uuid")).toThrow();
  });

  it("should reject an empty string", () => {
    expect(() => uuidSchema.parse("")).toThrow();
  });
});

// ============================================================================
// PHONE
// ============================================================================
describe("phoneNumberSchema", () => {
  it("should accept a valid international phone number with +", () => {
    expect(phoneNumberSchema.parse("+56912345678")).toBe("+56912345678");
  });

  it("should accept a valid phone number without +", () => {
    expect(phoneNumberSchema.parse("56912345678")).toBe("56912345678");
  });

  it("should accept a valid number with leading 1", () => {
    expect(phoneNumberSchema.parse("+12125551234")).toBe("+12125551234");
  });

  it("should reject a phone number with letters", () => {
    expect(() => phoneNumberSchema.parse("+56912ABCD78")).toThrow();
  });

  it("should reject an empty string", () => {
    expect(() => phoneNumberSchema.parse("")).toThrow();
  });

  it("should reject a number that is too short", () => {
    expect(() => phoneNumberSchema.parse("+1")).toThrow();
  });
});

describe("phoneNumberOptionalSchema", () => {
  it("should accept a valid phone number", () => {
    expect(phoneNumberOptionalSchema.parse("+56912345678")).toBe(
      "+56912345678",
    );
  });

  it("should return null for undefined", () => {
    expect(phoneNumberOptionalSchema.parse(undefined)).toBeNull();
  });

  it("should return null for null", () => {
    expect(phoneNumberOptionalSchema.parse(null)).toBeNull();
  });
});

// ============================================================================
// NUMBERS
// ============================================================================
describe("positiveIntegerSchema", () => {
  it("should accept a positive integer", () => {
    expect(positiveIntegerSchema.parse(5)).toBe(5);
  });

  it("should reject zero", () => {
    expect(() => positiveIntegerSchema.parse(0)).toThrow();
  });

  it("should reject negative numbers", () => {
    expect(() => positiveIntegerSchema.parse(-1)).toThrow();
  });

  it("should reject floats", () => {
    expect(() => positiveIntegerSchema.parse(3.5)).toThrow();
  });
});

describe("nonNegativeIntegerSchema", () => {
  it("should accept zero", () => {
    expect(nonNegativeIntegerSchema.parse(0)).toBe(0);
  });

  it("should accept a positive integer", () => {
    expect(nonNegativeIntegerSchema.parse(10)).toBe(10);
  });

  it("should reject negative numbers", () => {
    expect(() => nonNegativeIntegerSchema.parse(-1)).toThrow();
  });
});

describe("percentageSchema", () => {
  it("should accept 0", () => {
    expect(percentageSchema.parse(0)).toBe(0);
  });

  it("should accept 100", () => {
    expect(percentageSchema.parse(100)).toBe(100);
  });

  it("should accept values in range", () => {
    expect(percentageSchema.parse(50.5)).toBe(50.5);
  });

  it("should reject negative values", () => {
    expect(() => percentageSchema.parse(-1)).toThrow();
  });

  it("should reject values above 100", () => {
    expect(() => percentageSchema.parse(101)).toThrow();
  });
});

describe("priceSchema", () => {
  it("should accept a valid price", () => {
    expect(priceSchema.parse(100.0)).toBe(100.0);
  });

  it("should accept zero", () => {
    expect(priceSchema.parse(0)).toBe(0);
  });

  it("should reject negative prices", () => {
    expect(() => priceSchema.parse(-10)).toThrow();
  });

  it("should accept two decimal places", () => {
    expect(priceSchema.parse(99.99)).toBe(99.99);
  });

  it("should reject more than two decimal places", () => {
    expect(() => priceSchema.parse(10.123)).toThrow();
  });
});

// ============================================================================
// TEXT
// ============================================================================
describe("nameSchema", () => {
  it("should accept a valid name", () => {
    expect(nameSchema.parse("John Doe")).toBe("John Doe");
  });

  it("should trim whitespace", () => {
    expect(nameSchema.parse("  John  ")).toBe("John");
  });

  it("should reject an empty name", () => {
    expect(() => nameSchema.parse("")).toThrow();
  });

  it("should reject names over 100 chars", () => {
    expect(() => nameSchema.parse("a".repeat(101))).toThrow();
  });
});

describe("descriptionSchema", () => {
  it("should accept a valid description", () => {
    expect(descriptionSchema.parse("Some description")).toBe(
      "Some description",
    );
  });

  it("should return null for undefined", () => {
    expect(descriptionSchema.parse(undefined)).toBeNull();
  });

  it("should return null for null", () => {
    expect(descriptionSchema.parse(null)).toBeNull();
  });

  it("should reject strings over 1000 chars", () => {
    expect(() => descriptionSchema.parse("a".repeat(1001))).toThrow();
  });
});

describe("slugSchema", () => {
  it("should accept a valid lowercase slug", () => {
    expect(slugSchema.parse("my-slug")).toBe("my-slug");
  });

  it("should reject uppercase characters", () => {
    expect(() => slugSchema.parse("My-Slug")).toThrow();
  });

  it("should accept slugs with numbers", () => {
    expect(slugSchema.parse("section-2")).toBe("section-2");
  });

  it("should reject slugs with uppercase", () => {
    expect(() => slugSchema.parse("MySlug")).toThrow();
  });

  it("should reject slugs with spaces", () => {
    expect(() => slugSchema.parse("my slug")).toThrow();
  });

  it("should reject slugs with special characters", () => {
    expect(() => slugSchema.parse("my_slug!")).toThrow();
  });

  it("should reject empty string", () => {
    expect(() => slugSchema.parse("")).toThrow();
  });
});

// ============================================================================
// PAGINATION
// ============================================================================
describe("paginationSchema", () => {
  it("should apply default values for page and limit", () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it("should accept explicit page and limit", () => {
    const result = paginationSchema.parse({ page: 3, limit: 25 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
  });

  it("should reject page < 1", () => {
    expect(() => paginationSchema.parse({ page: 0, limit: 10 })).toThrow();
  });

  it("should reject limit > 100", () => {
    expect(() => paginationSchema.parse({ page: 1, limit: 101 })).toThrow();
  });

  it("should reject limit < 1", () => {
    expect(() => paginationSchema.parse({ page: 1, limit: 0 })).toThrow();
  });

  it("should reject non-integer page", () => {
    expect(() => paginationSchema.parse({ page: 1.5, limit: 10 })).toThrow();
  });
});

// ============================================================================
// SEARCH
// ============================================================================
describe("searchQuerySchema", () => {
  it("should accept a valid search query", () => {
    expect(searchQuerySchema.parse("lens")).toBe("lens");
  });

  it("should trim whitespace", () => {
    expect(searchQuerySchema.parse("  lens  ")).toBe("lens");
  });

  it("should reject empty search", () => {
    expect(() => searchQuerySchema.parse("")).toThrow();
  });

  it("should reject queries over 100 chars", () => {
    expect(() => searchQuerySchema.parse("a".repeat(101))).toThrow();
  });
});

// ============================================================================
// STATUS
// ============================================================================
describe("statusSchema", () => {
  it("should accept valid status values", () => {
    expect(statusSchema.parse("active")).toBe("active");
    expect(statusSchema.parse("inactive")).toBe("inactive");
    expect(statusSchema.parse("pending")).toBe("pending");
    expect(statusSchema.parse("completed")).toBe("completed");
    expect(statusSchema.parse("cancelled")).toBe("cancelled");
    expect(statusSchema.parse("draft")).toBe("draft");
  });

  it("should reject an invalid status", () => {
    expect(() => statusSchema.parse("deleted")).toThrow();
  });
});

// ============================================================================
// BOOLEAN STRING
// ============================================================================
describe("booleanStringSchema", () => {
  it("should transform 'true' to true", () => {
    expect(booleanStringSchema.parse("true")).toBe(true);
  });

  it("should transform 'false' to false", () => {
    expect(booleanStringSchema.parse("false")).toBe(false);
  });

  it("should pass through boolean true", () => {
    expect(booleanStringSchema.parse(true)).toBe(true);
  });

  it("should pass through boolean false", () => {
    expect(booleanStringSchema.parse(false)).toBe(false);
  });

  it("should reject other strings", () => {
    expect(() => booleanStringSchema.parse("yes")).toThrow();
    expect(() => booleanStringSchema.parse("1")).toThrow();
  });
});

// ============================================================================
// UUID ARRAY
// ============================================================================
describe("uuidArraySchema", () => {
  it("should accept an array of valid UUIDs", () => {
    const uuids = [
      "550e8400-e29b-41d4-a716-446655440000",
      "660e8400-e29b-41d4-a716-446655440001",
    ];
    expect(uuidArraySchema.parse(uuids)).toEqual(uuids);
  });

  it("should reject an empty array", () => {
    expect(() => uuidArraySchema.parse([])).toThrow();
  });

  it("should reject an array with invalid UUIDs", () => {
    expect(() => uuidArraySchema.parse(["not-a-uuid"])).toThrow();
  });
});
