/**
 * Centralized Error Handling Middleware for API Routes
 *
 * This middleware provides consistent error handling across all API endpoints,
 * including request ID generation, error logging, and response formatting.
 *
 * @module lib/middleware/error-handler
 */

import { NextRequest, NextResponse } from "next/server";
import {
  handleApiError,
  ApplicationError,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/errors/comprehensive-handler";
import { appLogger as logger } from "@/lib/logger";

// Simple UUID v4 generator
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${uuidv4().slice(0, 8)}`;
}

/**
 * Error handling middleware for API routes
 */
export async function withErrorHandling(
  handler: (
    request: NextRequest,
    context: { requestId: string },
  ) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    allowedRoles?: string[];
  },
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId();

    try {
      // Add request ID to logging context
      logger.debug("API request started", {
        requestId,
        method: request.method,
        url: request.url,
        userAgent: request.headers.get("user-agent"),
      });

      // Authentication check if required
      if (options?.requireAuth || options?.requireAdmin) {
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new AuthenticationError(
            "Missing or invalid authorization header",
          );
        }

        // Here you would typically validate the JWT token
        // For now, we'll just check if it exists
        const token = authHeader.substring(7);
        if (!token) {
          throw new AuthenticationError("Invalid authorization token");
        }

        // Role validation if required
        if (options?.requireAdmin) {
          // This would typically check user roles from the token
          // For demo purposes, we'll assume admin role is required
          const userRole = "user"; // Would come from token validation

          if (
            options?.allowedRoles &&
            !options.allowedRoles.includes(userRole)
          ) {
            throw new AuthorizationError("Insufficient permissions");
          }
        }
      }

      // Execute the handler
      const startTime = Date.now();
      const response = await handler(request, { requestId });
      const duration = Date.now() - startTime;

      // Log successful request
      logger.info("API request completed", {
        requestId,
        method: request.method,
        url: request.url,
        statusCode: response.status,
        durationMs: duration,
      });

      // Add request ID to response headers for tracing
      response.headers.set("X-Request-ID", requestId);

      return response;
    } catch (error: unknown) {
      // Handle the error
      const { response, statusCode } = handleApiError(error, requestId);

      // Log error response
      logger.error("API request failed", {
        requestId,
        method: request.method,
        url: request.url,
        statusCode,
        errorCode: response.error.code,
        errorMessage: response.error.message,
      });

      // Return error response
      const errorResponse = NextResponse.json(response, {
        status: statusCode,
        headers: {
          "X-Request-ID": requestId,
          "Content-Type": "application/json",
        },
      });

      return errorResponse;
    }
  };
}

/**
 * Wrapper for GET requests with error handling
 */
export function handleGet(
  handler: (
    request: NextRequest,
    context: { requestId: string },
  ) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    allowedRoles?: string[];
  },
) {
  return withErrorHandling(handler, options);
}

/**
 * Wrapper for POST requests with error handling
 */
export function handlePost(
  handler: (
    request: NextRequest,
    context: { requestId: string },
  ) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    allowedRoles?: string[];
  },
) {
  return withErrorHandling(handler, options);
}

/**
 * Wrapper for PUT requests with error handling
 */
export function handlePut(
  handler: (
    request: NextRequest,
    context: { requestId: string },
  ) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    allowedRoles?: string[];
  },
) {
  return withErrorHandling(handler, options);
}

/**
 * Wrapper for DELETE requests with error handling
 */
export function handleDelete(
  handler: (
    request: NextRequest,
    context: { requestId: string },
  ) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    allowedRoles?: string[];
  },
) {
  return withErrorHandling(handler, options);
}

/**
 * Validation middleware
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  validator: (data: any) => T,
): Promise<T> {
  try {
    const body = await request.json();
    return validator(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApplicationError("Invalid JSON in request body", {
        code: "INVALID_JSON",
        statusCode: 400,
      });
    }
    throw error;
  }
}

/**
 * Query parameter validation
 */
export function validateQueryParams(
  request: NextRequest,
  validators: Record<string, (value: string) => boolean>,
): Record<string, string> {
  const params: Record<string, string> = {};
  const errors: string[] = [];

  const url = new URL(request.url);

  for (const [param, validator] of Object.entries(validators)) {
    const value = url.searchParams.get(param);

    if (value === null) {
      errors.push(`Missing required parameter: ${param}`);
      continue;
    }

    if (!validator(value)) {
      errors.push(`Invalid value for parameter: ${param}`);
      continue;
    }

    params[param] = value;
  }

  if (errors.length > 0) {
    throw new ApplicationError("Invalid query parameters", {
      code: "INVALID_QUERY_PARAMS",
      statusCode: 400,
      details: { errors },
    });
  }

  return params;
}

/**
 * Pagination helper
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
  maxLimit: number;
}

export function parsePagination(
  request: NextRequest,
  options: PaginationOptions = {},
): PaginationResult {
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);
  const maxLimit = options.maxLimit || 100;

  if (isNaN(page) || page < 1) {
    throw new ApplicationError("Invalid page number", {
      code: "INVALID_PAGINATION",
      statusCode: 400,
      details: { page },
    });
  }

  if (isNaN(limit) || limit < 1 || limit > maxLimit) {
    throw new ApplicationError(
      `Invalid limit. Must be between 1 and ${maxLimit}`,
      {
        code: "INVALID_PAGINATION",
        statusCode: 400,
        details: { limit, maxLimit },
      },
    );
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    maxLimit,
  };
}

/**
 * Response helpers
 */
export function successResponse<T>(
  data: T,
  options?: {
    message?: string;
    meta?: Record<string, any>;
  },
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message: options?.message,
    meta: options?.meta,
  });
}

export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationResult,
  totalCount: number,
  options?: {
    message?: string;
  },
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message: options?.message,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pagination.limit),
    },
  });
}
