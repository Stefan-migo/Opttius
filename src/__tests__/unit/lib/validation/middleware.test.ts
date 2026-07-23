/**
 * Unit tests for validation middleware (lib/validation/middleware.ts)
 *
 * Tests withBodyValidation, withQueryValidation, withPathValidation,
 * and withValidation.
 *
 * @module __tests__/unit/lib/validation/middleware.test
 */

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  withBodyValidation,
  withPathValidation,
  withQueryValidation,
  withValidation,
} from "@/lib/validation/middleware";

vi.mock("@/lib/logger", () => ({
  appLogger: {
    error: vi.fn(),
    warn: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// withBodyValidation
// ---------------------------------------------------------------------------
describe("withBodyValidation", () => {
  const userSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
  });

  it("should call handler with validated data when body is valid", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));

    const wrapped = withBodyValidation(userSchema, handler);
    const request = {
      json: vi.fn().mockResolvedValue({ email: "a@b.com", name: "John" }),
      ...makeRequest(),
    } as unknown as NextRequest;

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      { email: "a@b.com", name: "John" },
      request,
    );
  });

  it("should return 400 with details when body validation fails", async () => {
    const handler = vi.fn();

    const wrapped = withBodyValidation(userSchema, handler);
    const request = {
      json: vi.fn().mockResolvedValue({ email: "bad", name: "" }),
      ...makeRequest(),
    } as unknown as NextRequest;

    const response = await wrapped(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error", "Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should return 400 with field-specific error details", async () => {
    const handler = vi.fn();

    const wrapped = withBodyValidation(userSchema, handler);
    const request = {
      json: vi.fn().mockResolvedValue({ email: "not-an-email" }),
      ...makeRequest(),
    } as unknown as NextRequest;

    const response = await wrapped(request);
    const body = await response.json();

    expect(body.details[0]).toHaveProperty("field");
    expect(body.details[0]).toHaveProperty("message");
  });

  it("should re-throw non-ZodError exceptions", async () => {
    const handler = vi.fn();
    const wrapped = withBodyValidation(userSchema, handler);
    const request = {
      json: vi.fn().mockRejectedValue(new Error("network error")),
    } as unknown as NextRequest;

    await expect(wrapped(request)).rejects.toThrow("network error");
  });
});

// ---------------------------------------------------------------------------
// withQueryValidation
// ---------------------------------------------------------------------------
describe("withQueryValidation", () => {
  const paginationSchema = z.object({
    page: z.coerce.number().min(1),
    limit: z.coerce.number().min(1).max(100),
  });

  it("should call handler with validated params when query is valid", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }));

    const wrapped = withQueryValidation(paginationSchema, handler);
    const request = makeRequest({
      url: "http://localhost:3000/api/test?page=2&limit=20",
    });

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      { page: 2, limit: 20 },
      request,
    );
  });

  it("should return 400 when query params are invalid", async () => {
    const handler = vi.fn();

    const wrapped = withQueryValidation(paginationSchema, handler);
    const request = makeRequest({
      url: "http://localhost:3000/api/test?page=0&limit=999",
    });

    const response = await wrapped(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error", "Invalid query parameters");
    expect(body.details).toBeInstanceOf(Array);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should return 400 with field details on missing required query param", async () => {
    const requiredSchema = z.object({
      q: z.string().min(1),
    });
    const handler = vi.fn();
    const wrapped = withQueryValidation(requiredSchema, handler);
    const request = makeRequest({
      url: "http://localhost:3000/api/test",
    });

    const response = await wrapped(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details[0]).toHaveProperty("field");
  });

  it("should re-throw non-ZodError exceptions", async () => {
    // An invalid URL causes new URL() to throw a TypeError, not a ZodError
    const handler = vi.fn();
    const wrapped = withQueryValidation(paginationSchema, handler);
    const request = makeRequest({
      url: "not-a-valid-url",
    });

    await expect(wrapped(request)).rejects.toThrow(); // TypeError from new URL()
  });
});

// ---------------------------------------------------------------------------
// withPathValidation
// ---------------------------------------------------------------------------
describe("withPathValidation", () => {
  const idSchema = z.object({
    id: z.string().uuid(),
  });

  it("should call handler with validated params when path is valid", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }));

    const wrapped = withPathValidation(idSchema, handler);
    const request = makeRequest();
    const context = { params: { id: "550e8400-e29b-41d4-a716-446655440000" } };

    const response = await wrapped(request, context);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      { id: "550e8400-e29b-41d4-a716-446655440000" },
      request,
    );
  });

  it("should return 400 when path params are invalid", async () => {
    const handler = vi.fn();

    const wrapped = withPathValidation(idSchema, handler);
    const request = makeRequest();
    const context = { params: { id: "not-a-uuid" } };

    const response = await wrapped(request, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error", "Invalid path parameters");
    expect(body.details).toBeInstanceOf(Array);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should re-throw non-ZodError exceptions", async () => {
    const handler = vi.fn();
    const wrapped = withPathValidation(idSchema, handler);
    const request = makeRequest();

    // Omitting context entirely → context.params throws TypeError (not ZodError)
    await expect(wrapped(request, undefined as unknown as { params: Record<string, string | string[]> })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// withValidation (combined)
// ---------------------------------------------------------------------------
describe("withValidation", () => {
  const schemas = {
    body: z.object({ email: z.string().email() }),
    query: z.object({ page: z.coerce.number().min(1) }),
    path: z.object({ id: z.string().uuid() }),
  };

  it("should validate body, query, and path together", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }));

    const wrapped = withValidation(schemas, handler);
    const request = {
      url: "http://localhost:3000/api/test/550e8400-e29b-41d4-a716-446655440000?page=1",
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ email: "a@b.com" }),
    } as unknown as NextRequest;
    const context = {
      params: { id: "550e8400-e29b-41d4-a716-446655440000" },
    };

    const response = await wrapped(request, context);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      {
        body: { email: "a@b.com" },
        query: { page: 1 },
        path: { id: "550e8400-e29b-41d4-a716-446655440000" },
      },
      request,
    );
  });

  it("should return 400 when any validation fails", async () => {
    const handler = vi.fn();

    const wrapped = withValidation(schemas, handler);
    const request = {
      url: "http://localhost:3000/api/test",
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ email: "bad" }),
    } as unknown as NextRequest;

    const response = await wrapped(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error", "Validation failed");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should work with only body schema", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }));

    const wrapped = withValidation({ body: schemas.body }, handler);
    const request = {
      ...makeRequest(),
      json: vi.fn().mockResolvedValue({ email: "a@b.com" }),
    } as unknown as NextRequest;

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      { body: { email: "a@b.com" } },
      request,
    );
  });

  it("should work with only query schema", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }));

    const wrapped = withValidation({ query: schemas.query }, handler);
    const request = makeRequest({
      url: "http://localhost:3000/api/test?page=3",
    });

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith({ query: { page: 3 } }, request);
  });

  it("should re-throw non-ZodError exceptions", async () => {
    const handler = vi.fn();
    const wrapped = withValidation(
      { body: schemas.body },
      handler,
    );
    const request = {
      ...makeRequest(),
      json: vi.fn().mockRejectedValue(new Error("parse error")),
    } as unknown as NextRequest;

    await expect(wrapped(request)).rejects.toThrow("parse error");
  });
});
