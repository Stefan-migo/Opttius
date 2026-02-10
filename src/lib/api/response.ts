import { NextResponse } from "next/server";
import { APIError } from "./errors";
import { appLogger as logger } from "@/lib/logger";

/**
 * Standardized API Response Types
 * Following the API Response Standardization plan from TECHNICAL_RECOMMENDATIONS.md
 */

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

// Standard success response
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

// Standard error response
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | Array<{ field: string; message: string }>;
    timestamp: string;
    requestId?: string;
    stack?: string; // Only in development
  };
}

// Union type for all API responses
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a standardized success response
 */
export function createApiSuccessResponse<T>(
  data: T,
  options?: {
    statusCode?: number;
    requestId?: string;
    pagination?: PaginationMeta;
    meta?: Record<string, any>;
  },
): NextResponse<ApiSuccessResponse<T>> {
  const { statusCode = 200, requestId, pagination, meta = {} } = options || {};

  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
      ...(pagination && { pagination }),
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Create a standardized error response
 */
export function createApiErrorResponse(
  error: APIError | Error,
  options?: {
    requestId?: string;
    details?: Record<string, unknown> | Array<{ field: string; message: string }>;
  },
): NextResponse<ApiErrorResponse> {
  const { requestId, details } = options || {};

  const isAPIError = error instanceof APIError;
  const statusCode = isAPIError ? error.statusCode : 500;
  const code = isAPIError ? error.code : "INTERNAL_ERROR";

  // Don't expose internal errors in production
  const message =
    process.env.NODE_ENV === "production" && !isAPIError
      ? "Internal server error"
      : error.message;

  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
      ...(details && { details }),
      ...(process.env.NODE_ENV === "development" && error.stack && { stack: error.stack }),
    },
  };

  // Log error for monitoring
  logger.error("API Error Response", {
    code,
    message: error.message,
    statusCode,
    requestId,
    stack: error.stack,
  });

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Create a paginated success response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  options?: {
    requestId?: string;
    meta?: Record<string, any>;
  },
): NextResponse<ApiSuccessResponse<T[]>> {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const paginationMeta: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };

  return createApiSuccessResponse(data, {
    ...options,
    pagination: paginationMeta,
  });
}

/**
 * API Response wrapper for consistent handling
 */
export class ApiResponseBuilder<T = any> {
  private data?: T;
  private error?: APIError | Error;
  private statusCode: number = 200;
  private requestId?: string;
  private pagination?: PaginationMeta;
  private meta: Record<string, any> = {};

  /**
   * Set success data
   */
  setData(data: T): this {
    this.data = data;
    return this;
  }

  /**
   * Set error
   */
  setError(error: APIError | Error, statusCode?: number): this {
    this.error = error;
    if (statusCode) {
      this.statusCode = statusCode;
    } else if (error instanceof APIError) {
      this.statusCode = error.statusCode;
    }
    return this;
  }

  /**
   * Set status code
   */
  setStatusCode(statusCode: number): this {
    this.statusCode = statusCode;
    return this;
  }

  /**
   * Set request ID
   */
  setRequestId(requestId: string): this {
    this.requestId = requestId;
    return this;
  }

  /**
   * Set pagination metadata
   */
  setPagination(pagination: PaginationMeta): this {
    this.pagination = pagination;
    return this;
  }

  /**
   * Add custom metadata
   */
  addMeta(key: string, value: any): this {
    this.meta[key] = value;
    return this;
  }

  /**
   * Build the response
   */
  build(): NextResponse<ApiResponse<T>> {
    if (this.error) {
      return createApiErrorResponse(this.error, {
        requestId: this.requestId,
      });
    }

    return createApiSuccessResponse(this.data!, {
      statusCode: this.statusCode,
      requestId: this.requestId,
      pagination: this.pagination,
      meta: this.meta,
    });
  }
}

/**
 * Async handler with standardized response format
 */
export function withApiResponse<T = any>(
  handler: (request: Request, context?: any) => Promise<T>,
): (request: Request, context?: any) => Promise<NextResponse<ApiResponse<T>>> {
  return async (request: Request, context?: any): Promise<NextResponse<ApiResponse<T>>> => {
    const requestId = crypto.randomUUID();

    try {
      const data = await handler(request, context);
      return createApiSuccessResponse(data, { requestId });
    } catch (error) {
      return createApiErrorResponse(
        error instanceof Error ? error : new Error("Unknown error"),
        { requestId },
      );
    }
  };
}

/**
 * Helper function to extract pagination params from URL
 */
export function extractPaginationParams(url: string): {
  page: number;
  limit: number;
} {
  const searchParams = new URL(url).searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  // Validate and sanitize
  return {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), 100), // Max 100 items per page
  };
}

/**
 * Helper to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Helper to check if response is an error
 */
export function isErrorResponse(
  response: ApiResponse<any>,
): response is ApiErrorResponse {
  return response.success === false;
}
