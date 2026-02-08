import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "@/lib/errors/comprehensive-handler";
import { appLogger as logger } from "@/lib/logger";

/**
 * Validation Middleware Utilities
 *
 * Provides middleware wrappers for consistent validation handling in API routes.
 * These utilities automatically handle validation errors and return appropriate
 * HTTP responses.
 *
 * @module lib/validation/middleware
 */

/**
 * Middleware wrapper for validating request bodies
 *
 * Automatically parses and validates request body against provided schema.
 * Handles validation errors and returns appropriate HTTP responses.
 *
 * @template T - Zod schema type
 * @param schema - Zod schema to validate against
 * @param handler - Handler function that receives validated data
 * @returns Next.js API route handler
 *
 * @example
 * ```typescript
 * export const POST = withBodyValidation(
 *   z.object({
 *     email: z.string().email(),
 *     name: z.string().min(1)
 *   }),
 *   async (validatedData, request) => {
 *     // validatedData is typed and guaranteed to match schema
 *     const user = await createUser(validatedData);
 *     return NextResponse.json(user);
 *   }
 * );
 * ```
 */
export function withBodyValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (
    validatedData: z.infer<T>,
    request: NextRequest,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      return await handler(validatedData, request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn("Body validation failed", {
          errors: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });

        return NextResponse.json(
          {
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }

      // Re-throw non-validation errors
      throw error;
    }
  };
}

/**
 * Middleware wrapper for validating query parameters
 *
 * Automatically validates URL search parameters against provided schema.
 *
 * @template T - Zod schema type
 * @param schema - Zod schema to validate against
 * @param handler - Handler function that receives validated data
 * @returns Next.js API route handler
 *
 * @example
 * ```typescript
 * export const GET = withQueryValidation(
 *   z.object({
 *     page: z.number().min(1).default(1),
 *     limit: z.number().min(1).max(100).default(10)
 *   }),
 *   async (validatedParams, request) => {
 *     const { page, limit } = validatedParams;
 *     const users = await getUsers(page, limit);
 *     return NextResponse.json(users);
 *   }
 * );
 * ```
 */
export function withQueryValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (
    validatedParams: z.infer<T>,
    request: NextRequest,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const url = new URL(request.url);
      const params: Record<string, string> = {};

      // Extract all search parameters
      for (const [key, value] of url.searchParams.entries()) {
        params[key] = value;
      }

      // Convert string values to appropriate types for validation
      const parsedParams = convertSearchParams(params);
      const validatedParams = schema.parse(parsedParams);

      return await handler(validatedParams, request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn("Query parameter validation failed", {
          errors: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });

        return NextResponse.json(
          {
            error: "Invalid query parameters",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }

      // Re-throw non-validation errors
      throw error;
    }
  };
}

/**
 * Middleware wrapper for validating path parameters
 *
 * Automatically validates dynamic route parameters against provided schema.
 *
 * @template T - Zod schema type
 * @param schema - Zod schema to validate against
 * @param handler - Handler function that receives validated data
 * @returns Next.js API route handler
 *
 * @example
 * ```typescript
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: { id: string } }
 * ) {
 *   return withPathValidation(
 *     z.object({
 *       id: z.string().uuid()
 *     }),
 *     async (validatedParams, request) => {
 *       const { id } = validatedParams;
 *       const user = await getUserById(id);
 *       return NextResponse.json(user);
 *     }
 *   )(request, { params });
 * }
 * ```
 */
export function withPathValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (
    validatedParams: z.infer<T>,
    request: NextRequest,
  ) => Promise<NextResponse>,
) {
  return async (
    request: NextRequest,
    context: { params: Record<string, string | string[]> },
  ): Promise<NextResponse> => {
    try {
      const validatedParams = schema.parse(context.params);
      return await handler(validatedParams, request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn("Path parameter validation failed", {
          errors: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });

        return NextResponse.json(
          {
            error: "Invalid path parameters",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }

      // Re-throw non-validation errors
      throw error;
    }
  };
}

/**
 * Combined validation middleware
 *
 * Validates body, query parameters, and path parameters in one wrapper.
 *
 * @template B - Body schema type
 * @template Q - Query schema type
 * @template P - Path schema type
 */
export function withValidation<
  B extends z.ZodTypeAny,
  Q extends z.ZodTypeAny,
  P extends z.ZodTypeAny,
>(
  schemas: {
    body?: B;
    query?: Q;
    path?: P;
  },
  handler: (
    validatedData: {
      body?: z.infer<B>;
      query?: z.infer<Q>;
      path?: z.infer<P>;
    },
    request: NextRequest,
  ) => Promise<NextResponse>,
) {
  return async (
    request: NextRequest,
    context?: { params: Record<string, string | string[]> },
  ): Promise<NextResponse> => {
    try {
      const validatedData: any = {};

      // Validate body if schema provided
      if (schemas.body) {
        const body = await request.json();
        validatedData.body = schemas.body.parse(body);
      }

      // Validate query if schema provided
      if (schemas.query) {
        const url = new URL(request.url);
        const params: Record<string, string> = {};
        for (const [key, value] of url.searchParams.entries()) {
          params[key] = value;
        }
        const parsedParams = convertSearchParams(params);
        validatedData.query = schemas.query.parse(parsedParams);
      }

      // Validate path if schema provided
      if (schemas.path && context?.params) {
        validatedData.path = schemas.path.parse(context.params);
      }

      return await handler(validatedData, request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn("Combined validation failed", {
          errors: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });

        return NextResponse.json(
          {
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }

      // Re-throw non-validation errors
      throw error;
    }
  };
}

/**
 * Helper function to convert search parameters to appropriate types
 *
 * Attempts to convert string values to numbers, booleans, etc. for better validation
 */
function convertSearchParams(
  params: Record<string, string>,
): Record<string, any> {
  const converted: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Try to convert to number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      const num = parseFloat(value);
      converted[key] = Number.isInteger(num) ? parseInt(value, 10) : num;
      continue;
    }

    // Try to convert to boolean
    if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
      converted[key] = value.toLowerCase() === "true";
      continue;
    }

    // Keep as string
    converted[key] = value;
  }

  return converted;
}

// Export types
export type { z };
