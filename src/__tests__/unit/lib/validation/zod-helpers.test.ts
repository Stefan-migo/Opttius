/**
 * Unit tests for Zod validation helpers (lib/validation/zod-helpers.ts)
 *
 * Tests parseAndValidateBody and parseAndValidateQuery functions.
 *
 * @module __tests__/unit/lib/validation/zod-helpers.test
 */

import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  parseAndValidateBody,
  parseAndValidateQuery,
  ValidationError,
} from "@/lib/validation/zod-helpers";

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

function makeRequest(overrides: Partial<NextRequest> = {}): NextRequest {
  return {
    url: "http://localhost:3000/api/test",
    headers: new Headers(),
    ...overrides,
  } as NextRequest;
}

// ---------------------------------------------------------------------------
// parseAndValidateBody
// ---------------------------------------------------------------------------
describe("parseAndValidateBody", () => {
  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Must be a valid email"),
  });

  it("should parse and return validated data when body is valid", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ name: "John", email: "john@test.com" }),
      ...makeRequest(),
    } as unknown as NextRequest;

    const data = await parseAndValidateBody(request, schema);

    expect(data).toEqual({ name: "John", email: "john@test.com" });
    expect(request.json).toHaveBeenCalledOnce();
  });

  it("should throw ValidationError when body fails schema validation", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ name: "", email: "bad" }),
      ...makeRequest(),
    } as unknown as NextRequest;

    await expect(parseAndValidateBody(request, schema)).rejects.toThrow(
      ValidationError,
    );
  });

  it("should throw ValidationError with field-level details on invalid body", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ name: "", email: "bad" }),
      ...makeRequest(),
    } as unknown as NextRequest;

    try {
      await parseAndValidateBody(request, schema);
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const ve = error as ValidationError;
      expect(ve.details).toBeInstanceOf(Array);
      expect((ve.details as Array<{ field: string }>).length).toBeGreaterThan(0);
    }
  });

  it("should throw ValidationError on empty body when fields are required", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({}),
      ...makeRequest(),
    } as unknown as NextRequest;

    await expect(parseAndValidateBody(request, schema)).rejects.toThrow(
      ValidationError,
    );
  });

  it("should throw ValidationError when body is not valid JSON", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
      ...makeRequest(),
    } as unknown as NextRequest;

    await expect(parseAndValidateBody(request, schema)).rejects.toThrow(
      ValidationError,
    );
    await expect(parseAndValidateBody(request, schema)).rejects.toThrow(
      "Invalid JSON",
    );
  });

  it("should re-throw non-SyntaxError exceptions from request.json()", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error("network error")),
      ...makeRequest(),
    } as unknown as NextRequest;

    await expect(parseAndValidateBody(request, schema)).rejects.toThrow(
      "network error",
    );
  });
});

// ---------------------------------------------------------------------------
// parseAndValidateQuery
// ---------------------------------------------------------------------------
describe("parseAndValidateQuery", () => {
  const paginationSchema = z.object({
    page: z.coerce.number().int().min(1),
    limit: z.coerce.number().int().min(1).max(100),
  });

  function mockRequestWithQuery(urlString: string): NextRequest {
    const url = new URL(urlString);
    const request = makeRequest() as NextRequest;
    Object.defineProperty(request, "nextUrl", {
      value: { searchParams: url.searchParams },
      configurable: true,
    });
    return request;
  }

  it("should parse and return validated query params", () => {
    const request = mockRequestWithQuery(
      "http://localhost:3000/api/test?page=2&limit=20",
    );

    const data = parseAndValidateQuery(request, paginationSchema);

    expect(data).toEqual({ page: 2, limit: 20 });
  });

  it("should throw ValidationError when query params are out of range", () => {
    const request = mockRequestWithQuery(
      "http://localhost:3000/api/test?page=0&limit=999",
    );

    expect(() => parseAndValidateQuery(request, paginationSchema)).toThrow(
      ValidationError,
    );
  });

  it("should throw ValidationError when required query params are missing", () => {
    const request = mockRequestWithQuery("http://localhost:3000/api/test");

    expect(() => parseAndValidateQuery(request, paginationSchema)).toThrow(
      ValidationError,
    );
  });

  it("should handle optional query params with defaults", () => {
    const optionalSchema = z.object({
      search: z.string().optional(),
      page: z.coerce.number().default(1),
    });

    const request = mockRequestWithQuery("http://localhost:3000/api/test");

    const data = parseAndValidateQuery(request, optionalSchema);

    expect(data).toEqual({ page: 1 });
  });

  it("should collect duplicate query params as arrays", () => {
    const request = mockRequestWithQuery(
      "http://localhost:3000/api/test?filter=a&filter=b",
    );
    const arraySchema = z.object({
      filter: z.array(z.string()).optional(),
    });

    const data = parseAndValidateQuery(request, arraySchema);

    expect(data).toEqual({ filter: ["a", "b"] });
  });
});
