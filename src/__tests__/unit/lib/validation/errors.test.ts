/**
 * Unit tests for validation errors
 *
 * @module __tests__/unit/lib/validation/errors.test
 */

import { describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/validation/errors";

describe("ValidationError", () => {
  it("should construct with a message", () => {
    const err = new ValidationError("Invalid input");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ValidationError");
    expect(err.message).toBe("Invalid input");
    expect(err.details).toBeUndefined();
  });

  it("should accept optional details", () => {
    const err = new ValidationError("Invalid input", {
      field: "email",
    });
    expect(err.details).toEqual({ field: "email" });
  });

  it("should have statusCode-like semantics via message/name", () => {
    const err = new ValidationError("Required field missing");
    expect(err.message).toContain("Required field");
  });
});
