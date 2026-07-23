import { randomUUID } from "crypto";

export class ApplicationError extends Error {
  public readonly code: string; public readonly statusCode: number; public readonly isOperational: boolean; public readonly details?: Record<string, unknown>;
  constructor(message: string, options: { code: string; statusCode?: number; isOperational?: boolean; details?: Record<string, unknown>; cause?: Error }) {
    super(message);
    this.name = this.constructor.name; this.code = options.code; this.statusCode = options.statusCode || 500; this.isOperational = options.isOperational ?? true; this.details = options.details;
    if (options.cause) (this as unknown).cause = options.cause;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApplicationError { constructor(message: string, details?: Record<string, unknown>) { super(message, { code: "VALIDATION_ERROR", statusCode: 400, details }); } }
export class AuthenticationError extends ApplicationError { constructor(message: string = "Authentication required", details?: Record<string, unknown>) { super(message, { code: "AUTHENTICATION_ERROR", statusCode: 401, details }); } }
export class AuthorizationError extends ApplicationError { constructor(message: string = "Insufficient permissions", details?: Record<string, unknown>) { super(message, { code: "AUTHORIZATION_ERROR", statusCode: 403, details }); } }
export class NotFoundError extends ApplicationError { constructor(message: string = "Resource not found", details?: Record<string, unknown>) { super(message, { code: "NOT_FOUND_ERROR", statusCode: 404, details }); } }
export class ConflictError extends ApplicationError { constructor(message: string, details?: Record<string, unknown>) { super(message, { code: "CONFLICT_ERROR", statusCode: 409, details }); } }
export class RateLimitError extends ApplicationError { constructor(message: string = "Rate limit exceeded", details?: Record<string, unknown>) { super(message, { code: "RATE_LIMIT_ERROR", statusCode: 429, details }); } }
export class PaymentError extends ApplicationError { constructor(message: string, details?: Record<string, unknown>) { super(message, { code: "PAYMENT_ERROR", statusCode: 400, details }); } }
export class DatabaseError extends ApplicationError { constructor(message: string, details?: Record<string, unknown>, cause?: Error) { super(message, { code: "DATABASE_ERROR", statusCode: 500, details, cause }); } }
export class ExternalServiceError extends ApplicationError { constructor(message: string, serviceName: string, details?: Record<string, unknown>, cause?: Error) { super(message, { code: "EXTERNAL_SERVICE_ERROR", statusCode: 502, details: { service: serviceName, ...details }, cause }); } }
export class BusinessLogicError extends ApplicationError { constructor(message: string, details?: Record<string, unknown>) { super(message, { code: "BUSINESS_LOGIC_ERROR", statusCode: 422, details }); } }

export function generateRequestId(): string { return randomUUID(); }
