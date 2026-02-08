/**
 * Comprehensive Error Handling System for Opttius SaaS
 *
 * This module provides standardized error handling patterns, error classes,
 * and utilities for consistent error management across the application.
 *
 * @module lib/errors/comprehensive-handler
 */

import { appLogger as logger } from "@/lib/logger";
import { randomUUID } from "crypto";

// =================================================================
// ERROR CLASSES
// =================================================================

/**
 * Base application error class
 */
export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    options: {
      code: string;
      statusCode?: number;
      isOperational?: boolean;
      details?: Record<string, any>;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode || 500;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;

    // Set cause if provided
    if (options.cause) {
      (this as any).cause = options.cause;
    }

    // Ensure proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
      details,
    });
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends ApplicationError {
  constructor(
    message: string = "Authentication required",
    details?: Record<string, any>,
  ) {
    super(message, {
      code: "AUTHENTICATION_ERROR",
      statusCode: 401,
      details,
    });
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends ApplicationError {
  constructor(
    message: string = "Insufficient permissions",
    details?: Record<string, any>,
  ) {
    super(message, {
      code: "AUTHORIZATION_ERROR",
      statusCode: 403,
      details,
    });
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends ApplicationError {
  constructor(
    message: string = "Resource not found",
    details?: Record<string, any>,
  ) {
    super(message, {
      code: "NOT_FOUND_ERROR",
      statusCode: 404,
      details,
    });
  }
}

/**
 * Conflict errors (duplicate resources, etc.)
 */
export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      code: "CONFLICT_ERROR",
      statusCode: 409,
      details,
    });
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends ApplicationError {
  constructor(
    message: string = "Rate limit exceeded",
    details?: Record<string, any>,
  ) {
    super(message, {
      code: "RATE_LIMIT_ERROR",
      statusCode: 429,
      details,
    });
  }
}

/**
 * Payment/Billing errors
 */
export class PaymentError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      code: "PAYMENT_ERROR",
      statusCode: 400,
      details,
    });
  }
}

/**
 * Database errors
 */
export class DatabaseError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super(message, {
      code: "DATABASE_ERROR",
      statusCode: 500,
      details,
      cause,
    });
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends ApplicationError {
  constructor(
    message: string,
    serviceName: string,
    details?: Record<string, any>,
    cause?: Error,
  ) {
    super(message, {
      code: "EXTERNAL_SERVICE_ERROR",
      statusCode: 502,
      details: {
        service: serviceName,
        ...details,
      },
      cause,
    });
  }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      code: "BUSINESS_LOGIC_ERROR",
      statusCode: 422,
      details,
    });
  }
}

// =================================================================
// ERROR HANDLING UTILITIES
// =================================================================

/**
 * Error response formatter
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId?: string;
  };
}

export function formatErrorResponse(
  error: ApplicationError,
  requestId?: string,
): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

/**
 * Safe error logging
 */
export function logError(error: Error, context?: Record<string, any>): void {
  // Don't log operational errors that are already handled
  if (error instanceof ApplicationError && error.isOperational) {
    logger.warn(`Operational error: ${error.code}`, {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      ...context,
    });
  } else {
    // Log unexpected errors
    logger.error("Unexpected application error", error, {
      errorName: error.name,
      errorMessage: error.message,
      ...context,
    });
  }
}

/**
 * Error handler for API routes
 */
export function handleApiError(
  error: unknown,
  requestId?: string,
): { response: ErrorResponse; statusCode: number } {
  // Convert unknown errors to ApplicationError
  let appError: ApplicationError;

  if (error instanceof ApplicationError) {
    appError = error;
  } else if (error instanceof Error) {
    // Wrap native errors
    appError = new ApplicationError(error.message, {
      code: "INTERNAL_ERROR",
      statusCode: 500,
      isOperational: false,
      cause: error,
    });
  } else {
    // Handle non-error objects
    appError = new ApplicationError(String(error), {
      code: "INTERNAL_ERROR",
      statusCode: 500,
      isOperational: false,
    });
  }

  // Log the error
  logError(appError, { requestId });

  // Return formatted response
  return {
    response: formatErrorResponse(appError, requestId),
    statusCode: appError.statusCode,
  };
}

/**
 * Async error handler wrapper
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    suppressLogs?: boolean;
    defaultValue?: T;
    transformError?: (error: unknown) => ApplicationError;
  },
): Promise<T> {
  return fn().catch((error: unknown) => {
    if (!options?.suppressLogs) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        context: "async operation",
      });
    }

    if (options?.defaultValue !== undefined) {
      return options.defaultValue;
    }

    if (options?.transformError) {
      throw options.transformError(error);
    }

    throw error;
  });
}

/**
 * Try-catch wrapper for synchronous operations
 */
export function safeExecute<T>(
  fn: () => T,
  options?: {
    suppressLogs?: boolean;
    defaultValue?: T;
    transformError?: (error: unknown) => ApplicationError;
  },
): T {
  try {
    return fn();
  } catch (error: unknown) {
    if (!options?.suppressLogs) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        context: "sync operation",
      });
    }

    if (options?.defaultValue !== undefined) {
      return options.defaultValue;
    }

    if (options?.transformError) {
      throw options.transformError(error);
    }

    throw error;
  }
}

// =================================================================
// DATABASE ERROR HANDLING
// =================================================================

/**
 * Handle Supabase database errors
 */
export function handleDatabaseError(
  error: any,
  context: string,
  details?: Record<string, any>,
): DatabaseError {
  const dbError = new DatabaseError(
    error.message || "Database operation failed",
    {
      context,
      hint: error.hint,
      details: error.details,
      ...details,
    },
    error,
  );

  return dbError;
}

/**
 * Map PostgreSQL error codes to application errors
 */
export function mapPostgresError(error: any): ApplicationError {
  const code = error.code;

  switch (code) {
    case "23505": // unique_violation
      return new ConflictError("Resource already exists", {
        constraint: error.constraint,
      });
    case "23503": // foreign_key_violation
      return new BusinessLogicError("Referenced resource does not exist", {
        constraint: error.constraint,
      });
    case "23502": // not_null_violation
      return new ValidationError("Required field is missing", {
        column: error.column,
      });
    case "23514": // check_violation
      return new ValidationError("Data validation failed", {
        constraint: error.constraint,
      });
    default:
      return handleDatabaseError(error, "PostgreSQL operation");
  }
}

// =================================================================
// VALIDATION HELPERS
// =================================================================

/**
 * Validate required fields
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[],
): void {
  const missingFields = requiredFields.filter(
    (field) =>
      data[field] === undefined || data[field] === null || data[field] === "",
  );

  if (missingFields.length > 0) {
    throw new ValidationError("Missing required fields", {
      missingFields,
    });
  }
}

/**
 * Validate data types
 */
export function validateTypes(
  data: Record<string, any>,
  typeMap: Record<string, "string" | "number" | "boolean" | "array" | "object">,
): void {
  const errors: string[] = [];

  for (const [field, expectedType] of Object.entries(typeMap)) {
    const value = data[field];
    const actualType = Array.isArray(value) ? "array" : typeof value;

    if (value !== undefined && actualType !== expectedType) {
      errors.push(
        `Field '${field}' must be of type ${expectedType}, got ${actualType}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new ValidationError("Type validation failed", { errors });
  }
}

/**
 * Sanitize and validate input data
 */
export function sanitizeInput<T extends Record<string, any>>(
  data: T,
  schema: {
    required?: string[];
    types?: Record<
      string,
      "string" | "number" | "boolean" | "array" | "object"
    >;
    maxLength?: Record<string, number>;
  },
): T {
  // Validate required fields
  if (schema.required) {
    validateRequiredFields(data, schema.required);
  }

  // Validate types
  if (schema.types) {
    validateTypes(data, schema.types);
  }

  // Validate max lengths
  if (schema.maxLength) {
    const errors: string[] = [];
    for (const [field, maxLength] of Object.entries(schema.maxLength)) {
      if (typeof data[field] === "string" && data[field].length > maxLength) {
        errors.push(`Field '${field}' exceeds maximum length of ${maxLength}`);
      }
    }
    if (errors.length > 0) {
      throw new ValidationError("Input validation failed", { errors });
    }
  }

  return data;
}

/**
 * Generate a unique request ID for tracking requests
 */
export function generateRequestId(): string {
  return randomUUID();
}
