import { NextResponse } from "next/server";

// Custom error classes for different types of API errors
export class APIError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = "APIError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends APIError {
  public details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    details?: Array<{ field: string; message: string }> | string,
  ) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";

    // Si details es un string (compatibilidad con código antiguo), convertirlo
    if (typeof details === "string") {
      this.details = [{ field: details, message }];
    } else {
      this.details = details;
    }
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super(message, 409, "CONFLICT_ERROR");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMIT_ERROR");
    this.name = "RateLimitError";
  }
}

export class PaymentError extends APIError {
  constructor(message: string) {
    super(message, 402, "PAYMENT_ERROR");
    this.name = "PaymentError";
  }
}

// Standard error response format
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    timestamp: string;
    requestId?: string;
    details?: any;
  };
}

// Error response builder
export function createErrorResponse(
  error: APIError | Error,
  requestId?: string,
): NextResponse<ErrorResponse> {
  const isAPIError = error instanceof APIError;

  const statusCode = isAPIError ? error.statusCode : 500;
  const code = isAPIError ? error.code : "INTERNAL_ERROR";

  // Don't expose internal errors in production
  const message =
    process.env.NODE_ENV === "production" && !isAPIError
      ? "Internal server error"
      : error.message;

  const errorResponse: ErrorResponse = {
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };

  // Log error for monitoring
  console.error("API Error:", {
    message: error.message,
    code,
    statusCode,
    stack: error.stack,
    requestId,
  });

  return NextResponse.json(errorResponse, { status: statusCode });
}

// Error handler middleware wrapper
export function withErrorHandler(
  handler: (request: any, context?: any) => Promise<NextResponse>,
) {
  return async (request: any, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Generate request ID for tracking
      const requestId = crypto.randomUUID();

      return createErrorResponse(
        error instanceof Error ? error : new Error("Unknown error"),
        requestId,
      );
    }
  };
}

// Success response builder
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
}

export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  requestId?: string,
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  };

  return NextResponse.json(response, { status: statusCode });
}

// Async handler wrapper with error handling
export function asyncHandler(
  fn: (request: any, context?: any) => Promise<NextResponse>,
) {
  return (request: any, context?: any) => {
    return Promise.resolve(fn(request, context)).catch((error) => {
      const requestId = crypto.randomUUID();
      return createErrorResponse(error, requestId);
    });
  };
}
