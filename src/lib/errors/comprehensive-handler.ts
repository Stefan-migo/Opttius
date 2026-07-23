/**
 * Comprehensive Error Handling System — standardized error handling patterns.
 */
import { appLogger as logger } from "@/lib/logger";

import { ApplicationError, BusinessLogicError, ConflictError, DatabaseError, ValidationError } from "./error-classes";
export { ApplicationError, AuthenticationError, AuthorizationError, BusinessLogicError, ConflictError, DatabaseError, ExternalServiceError, generateRequestId,NotFoundError, PaymentError, RateLimitError, ValidationError } from "./error-classes";

interface ErrorResponse { error: { code: string; message: string; details?: Record<string, unknown>; timestamp: string; requestId?: string }; }

export function formatErrorResponse(error: ApplicationError, requestId?: string): ErrorResponse {
  return { error: { code: error.code, message: error.message, details: error.details, timestamp: new Date().toISOString(), requestId } };
}

export function logError(error: Error, context?: Record<string, unknown>): void {
  if (error instanceof ApplicationError && error.isOperational) logger.warn(`Operational error: ${error.code}`, { message: error.message, code: error.code, statusCode: error.statusCode, details: error.details, ...context });
  else logger.error("Unexpected application error", error, { errorName: error.name, errorMessage: error.message, ...context });
}

export function handleApiError(error: unknown, requestId?: string): { response: ErrorResponse; statusCode: number } {
  let appError: ApplicationError;
  if (error instanceof ApplicationError) appError = error;
  else if (error instanceof Error) appError = new ApplicationError(error.message, { code: "INTERNAL_ERROR", statusCode: 500, isOperational: false, cause: error });
  else appError = new ApplicationError(String(error), { code: "INTERNAL_ERROR", statusCode: 500, isOperational: false });
  logError(appError, { requestId });
  return { response: formatErrorResponse(appError, requestId), statusCode: appError.statusCode };
}

export function withErrorHandling<T>(fn: () => Promise<T>, options?: { suppressLogs?: boolean; defaultValue?: T; transformError?: (error: unknown) => ApplicationError }): Promise<T> {
  return fn().catch((error: unknown) => {
    if (!options?.suppressLogs) logError(error instanceof Error ? error : new Error(String(error)), { context: "async operation" });
    if (options?.defaultValue !== undefined) return options.defaultValue;
    if (options?.transformError) throw options.transformError(error);
    throw error;
  });
}

export function safeExecute<T>(fn: () => T, options?: { suppressLogs?: boolean; defaultValue?: T; transformError?: (error: unknown) => ApplicationError }): T {
  try { return fn(); } catch (error: unknown) {
    if (!options?.suppressLogs) logError(error instanceof Error ? error : new Error(String(error)), { context: "sync operation" });
    if (options?.defaultValue !== undefined) return options.defaultValue;
    if (options?.transformError) throw options.transformError(error);
    throw error;
  }
}

export function handleDatabaseError(error: unknown, context: string, details?: Record<string, unknown>): DatabaseError {
  return new DatabaseError(error.message || "Database operation failed", { context, hint: error.hint, details: error.details, ...details }, error);
}

export function mapPostgresError(error: unknown): ApplicationError {
  switch (error.code) {
    case "23505": return new ConflictError("Resource already exists", { constraint: error.constraint });
    case "23503": return new BusinessLogicError("Referenced resource does not exist", { constraint: error.constraint });
    case "23502": return new ValidationError("Required field is missing", { column: error.column });
    case "23514": return new ValidationError("Data validation failed", { constraint: error.constraint });
    default: return handleDatabaseError(error, "PostgreSQL operation");
  }
}

export function validateRequiredFields(data: Record<string, unknown>, requiredFields: string[]): void {
  const missing = requiredFields.filter((f) => data[f] === undefined || data[f] === null || data[f] === "");
  if (missing.length > 0) throw new ValidationError("Missing required fields", { missingFields: missing });
}

export function validateTypes(data: Record<string, unknown>, typeMap: Record<string, "string" | "number" | "boolean" | "array" | "object">): void {
  const errors: string[] = [];
  for (const [field, expectedType] of Object.entries(typeMap)) {
    const value = data[field];
    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (value !== undefined && actualType !== expectedType) errors.push(`Field '${field}' must be of type ${expectedType}, got ${actualType}`);
  }
  if (errors.length > 0) throw new ValidationError("Type validation failed", { errors });
}

export function sanitizeInput<T extends Record<string, unknown>>(data: T, schema: { required?: string[]; types?: Record<string, "string" | "number" | "boolean" | "array" | "object">; maxLength?: Record<string, number> }): T {
  if (schema.required) validateRequiredFields(data, schema.required);
  if (schema.types) validateTypes(data, schema.types);
  if (schema.maxLength) {
    const errors: string[] = [];
    for (const [field, maxLength] of Object.entries(schema.maxLength)) {
      if (typeof data[field] === "string" && (data[field] as string).length > maxLength) errors.push(`Field '${field}' exceeds maximum length of ${maxLength}`);
    }
    if (errors.length > 0) throw new ValidationError("Input validation failed", { errors });
  }
  return data;
}
