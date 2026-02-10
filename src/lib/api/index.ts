/**
 * API Library - Centralized exports for API utilities
 * This file provides a single import point for all API-related functionality
 */

// Error classes and handlers
export {
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  PaymentError,
  createErrorResponse,
  withErrorHandler,
  asyncHandler,
} from "./errors";

// Standardized response builders
export {
  createApiSuccessResponse,
  createApiErrorResponse,
  createPaginatedResponse,
  ApiResponseBuilder,
  withApiResponse,
  extractPaginationParams,
  isSuccessResponse,
  isErrorResponse,
} from "./response";

// Type exports
export type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginationMeta,
} from "./response";

export type {
  ErrorResponse,
  SuccessResponse,
} from "./errors";

// Middleware exports
export {
  withRateLimit,
  rateLimitConfigs,
  requireAuth,
  requireRole,
  logAdminActivity,
  withSecurityHeaders,
  withCORS,
  logRequest,
  composeMiddleware,
  withRequestId,
  isHealthCheck,
} from "./middleware";

// Branch middleware
export {
  getBranchContext,
  validateBranchAccess,
  addBranchFilter,
} from "./branch-middleware";

// Root middleware
export {
  requireRoot,
  isRootUser,
} from "./root-middleware";
