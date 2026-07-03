/**
 * Unit tests for API validation (validation.ts)
 *
 * Tests validateRequestBody, validateQueryParams, parseAndValidateBody,
 * sanitizeInput, and commonSchemas.
 *
 * @module __tests__/unit/lib/api/validation.test
 */

import { describe, expect, it } from "vitest";

import {
  commonSchemas,
  parseAndValidateBody,
  sanitizeInput,
  validateQueryParams,
  validateRequestBody,
  type ValidationSchema,
} from "@/lib/api/validation";
import { ValidationError } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// validateRequestBody
// ---------------------------------------------------------------------------
describe("validateRequestBody", () => {
  const schema: ValidationSchema = {
    email: { required: true, type: "email" },
    name: { required: true, type: "string", minLength: 2, maxLength: 50 },
    age: { type: "number", min: 18, max: 120 },
    role: { enum: ["admin", "user"] },
  };

  it("should pass on valid body", () => {
    expect(() =>
      validateRequestBody(
        { email: "a@b.com", name: "John", age: 30, role: "admin" },
        schema,
      ),
    ).not.toThrow();
  });

  it("should throw ValidationError when required field is missing", () => {
    expect(() =>
      validateRequestBody({ email: "a@b.com" }, schema),
    ).toThrow(ValidationError);
    expect(() =>
      validateRequestBody({ email: "a@b.com" }, schema),
    ).toThrow(/name is required/);
  });

  it("should throw ValidationError on invalid email", () => {
    expect(() =>
      validateRequestBody(
        { email: "not-an-email", name: "John" },
        schema,
      ),
    ).toThrow(ValidationError);
    expect(() =>
      validateRequestBody(
        { email: "not-an-email", name: "John" },
        schema,
      ),
    ).toThrow(/must be a valid email/);
  });

  it("should throw ValidationError on type mismatch", () => {
    expect(() =>
      validateRequestBody(
        { email: "a@b.com", name: "John", age: "old" },
        schema,
      ),
    ).toThrow(ValidationError);
  });

  it("should throw ValidationError on minLength violation", () => {
    expect(() =>
      validateRequestBody({ email: "a@b.com", name: "X" }, schema),
    ).toThrow(ValidationError);
    expect(() =>
      validateRequestBody({ email: "a@b.com", name: "X" }, schema),
    ).toThrow(/at least 2/);
  });

  it("should throw ValidationError on enum violation", () => {
    expect(() =>
      validateRequestBody(
        { email: "a@b.com", name: "John", role: "superadmin" },
        schema,
      ),
    ).toThrow(ValidationError);
  });

  it("should pass when non-required field with no value is omitted", () => {
    expect(() =>
      validateRequestBody({ email: "a@b.com", name: "John" }, schema),
    ).not.toThrow();
  });

  it("should pass when optional enum field is omitted", () => {
    expect(() =>
      validateRequestBody(
        { email: "a@b.com", name: "John", age: 25 },
        schema,
      ),
    ).not.toThrow();
  });

  it("should throw on empty body", () => {
    expect(() => validateRequestBody({}, schema)).toThrow(ValidationError);
  });

  it("should throw on null body", () => {
    expect(() =>
      validateRequestBody(null, schema),
    ).toThrow(ValidationError);
  });

  it("should report aggregated errors for multiple failures", () => {
    expect(() =>
      validateRequestBody({ age: 10 }, schema),
    ).toThrow(ValidationError);
    // email and name both required, age below min
    const message = (() => {
      try {
        validateRequestBody({ age: 10 }, schema);
        return "";
      } catch (e) {
        return (e as ValidationError).message;
      }
    })();
    expect(message).toContain("email is required");
    expect(message).toContain("name is required");
    expect(message).toContain("must be at least 18");
  });

  it("should validate custom field rules", () => {
    const customSchema: ValidationSchema = {
      code: {
        custom: (v: string) =>
          /^[A-Z]+$/.test(v) || "Code must be uppercase letters",
      },
    };
    expect(() =>
      validateRequestBody({ code: "abc" }, customSchema),
    ).toThrow(ValidationError);
    expect(() =>
      validateRequestBody({ code: "ABC" }, customSchema),
    ).not.toThrow();
  });

  it("should validate pattern rules", () => {
    const patternSchema: ValidationSchema = {
      phone: { pattern: /^\d{3}-\d{4}$/ },
    };
    expect(() =>
      validateRequestBody({ phone: "abc-defg" }, patternSchema),
    ).toThrow(/format is invalid/);
    expect(() =>
      validateRequestBody({ phone: "123-4567" }, patternSchema),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateQueryParams
// ---------------------------------------------------------------------------
describe("validateQueryParams", () => {
  it("should pass on valid query params", () => {
    const params = new URLSearchParams("page=2&limit=20");
    const schema: ValidationSchema = {
      page: { type: "number", min: 1 },
      limit: { type: "number", min: 1, max: 100 },
    };
    expect(() => validateQueryParams(params, schema)).not.toThrow();
  });

  it("should throw ValidationError on missing required param", () => {
    const params = new URLSearchParams("");
    const schema: ValidationSchema = {
      page: { required: true, type: "number" },
    };
    expect(() => validateQueryParams(params, schema)).toThrow(ValidationError);
  });

  it("should not throw when string is NaN-coerced to number type", () => {
    // Number("abc") = NaN; typeof NaN === "number", so the type check passes.
    const params = new URLSearchParams("page=abc");
    const schema: ValidationSchema = {
      page: { type: "number" },
    };
    expect(() => validateQueryParams(params, schema)).not.toThrow();
  });

  it("should convert string to boolean for boolean type params", () => {
    const params = new URLSearchParams("active=true");
    const schema: ValidationSchema = {
      active: { required: true, type: "boolean" },
    };
    expect(() => validateQueryParams(params, schema)).not.toThrow();
  });

  it("should throw on out-of-range number", () => {
    const params = new URLSearchParams("page=0");
    const schema: ValidationSchema = {
      page: { type: "number", min: 1 },
    };
    expect(() => validateQueryParams(params, schema)).toThrow(ValidationError);
  });

  it("should pass on optional param omitted", () => {
    const params = new URLSearchParams("");
    const schema: ValidationSchema = {
      sort: { type: "string", enum: ["asc", "desc"] },
    };
    expect(() => validateQueryParams(params, schema)).not.toThrow();
  });

  it("should combine multiple errors", () => {
    const params = new URLSearchParams("page=-1&limit=999");
    const schema: ValidationSchema = {
      page: { type: "number", min: 1 },
      limit: { type: "number", max: 100 },
    };
    const message = (() => {
      try {
        validateQueryParams(params, schema);
        return "";
      } catch (e) {
        return (e as ValidationError).message;
      }
    })();
    expect(message).toContain("Query parameter validation failed");
  });
});

// ---------------------------------------------------------------------------
// sanitizeInput
// ---------------------------------------------------------------------------
describe("sanitizeInput", () => {
  it("should trim string values", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("should trim all strings in an array", () => {
    expect(sanitizeInput(["  a  ", "  b  "])).toEqual(["a", "b"]);
  });

  it("should trim all string properties in an object", () => {
    const input = { name: "  John  ", city: "  NY  ", age: 30 };
    expect(sanitizeInput(input)).toEqual({
      name: "John",
      city: "NY",
      age: 30,
    });
  });

  it("should recursively sanitize nested objects", () => {
    const input = {
      user: { name: "  Jane  ", address: { street: "  Main St  " } },
    };
    const result = sanitizeInput(input) as Record<string, unknown>;
    expect((result.user as Record<string, unknown>).name).toBe("Jane");
    expect(
      ((result.user as Record<string, unknown>).address as Record<string, unknown>).street,
    ).toBe("Main St");
  });

  it("should return non-string primitives unchanged", () => {
    expect(sanitizeInput(42)).toBe(42);
    expect(sanitizeInput(true)).toBe(true);
    expect(sanitizeInput(null)).toBeNull();
  });

  it("should return undefined as-is", () => {
    expect(sanitizeInput(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseAndValidateBody
// ---------------------------------------------------------------------------
describe("parseAndValidateBody", () => {
  const schema: ValidationSchema = {
    email: { required: true, type: "email" },
    name: { required: true, type: "string" },
  };

  it("should parse, sanitize, and validate a valid request body", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({
        email: "  a@b.com  ",
        name: "  John  ",
      }),
    } as unknown as Request;

    const result = (await parseAndValidateBody(request, schema)) as Record<
      string,
      unknown
    >;
    expect(result.email).toBe("a@b.com");
    expect(result.name).toBe("John");
  });

  it("should throw ValidationError on invalid JSON", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    } as unknown as Request;

    await expect(parseAndValidateBody(request, schema)).rejects.toThrow(
      ValidationError,
    );
    await expect(parseAndValidateBody(request, schema)).rejects.toThrow(
      "Invalid JSON",
    );
  });

  it("should throw ValidationError on schema violation", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ email: "bad", name: "" }),
    } as unknown as Request;

    await expect(parseAndValidateBody(request, schema)).rejects.toThrow(
      ValidationError,
    );
  });

  it("should re-throw non-SyntaxError exceptions", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error("network error")),
    } as unknown as Request;

    await expect(parseAndValidateBody(request, schema)).rejects.toThrow(
      "network error",
    );
  });
});

// ---------------------------------------------------------------------------
// commonSchemas
// ---------------------------------------------------------------------------
describe("commonSchemas", () => {
  describe("userRegistration", () => {
    const s = commonSchemas.userRegistration;
    it("should accept valid registration data", () => {
      expect(() =>
        validateRequestBody(
          {
            email: "a@b.com",
            password: "12345678",
            firstName: "John",
            lastName: "Doe",
          },
          s,
        ),
      ).not.toThrow();
    });

    it("should reject short password", () => {
      expect(() =>
        validateRequestBody(
          {
            email: "a@b.com",
            password: "123",
            firstName: "John",
            lastName: "Doe",
          },
          s,
        ),
      ).toThrow(ValidationError);
    });
  });

  describe("userLogin", () => {
    const s = commonSchemas.userLogin;
    it("should accept valid login data", () => {
      expect(() =>
        validateRequestBody({ email: "a@b.com", password: "p" }, s),
      ).not.toThrow();
    });

    it("should reject missing password", () => {
      expect(() =>
        validateRequestBody({ email: "a@b.com" }, s),
      ).toThrow(ValidationError);
    });
  });

  describe("contactForm", () => {
    const s = commonSchemas.contactForm;
    it("should accept valid contact data", () => {
      expect(() =>
        validateRequestBody(
          {
            name: "John",
            email: "a@b.com",
            subject: "Hello",
            message: "This is a valid message",
          },
          s,
        ),
      ).not.toThrow();
    });

    it("should reject short message", () => {
      expect(() =>
        validateRequestBody(
          {
            name: "John",
            email: "a@b.com",
            subject: "Hi",
            message: "Short",
          },
          s,
        ),
      ).toThrow(ValidationError);
    });
  });

  describe("newsletter", () => {
    const s = commonSchemas.newsletter;
    it("should accept valid newsletter data", () => {
      expect(() =>
        validateRequestBody({ email: "a@b.com" }, s),
      ).not.toThrow();
    });
  });

  describe("checkout", () => {
    const s = commonSchemas.checkout;
    it("should accept valid checkout data", () => {
      expect(() =>
        validateRequestBody(
          { items: [1, 2], payer_info: { name: "John" } },
          s,
        ),
      ).not.toThrow();
    });
  });

  describe("pagination", () => {
    const s = commonSchemas.pagination;
    it("should accept valid pagination params", () => {
      expect(() =>
        validateQueryParams(
          new URLSearchParams("page=2&limit=50&sort=asc"),
          s,
        ),
      ).not.toThrow();
    });

    it("should reject invalid sort value", () => {
      expect(() =>
        validateQueryParams(
          new URLSearchParams("sort=invalid"),
          s,
        ),
      ).toThrow(ValidationError);
    });
  });
});
