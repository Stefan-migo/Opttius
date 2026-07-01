/**
 * API Library - Centralized exports for API utilities
 * This file provides a single import point for all API-related functionality
 */

// Error classes and handlers
export {
  APIError,
  asyncHandler,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  createErrorResponse,
  NotFoundError,
  PaymentError,
  RateLimitError,
  ValidationError,
  withErrorHandler,
} from "./errors";

// Standardized response builders
export {
  ApiResponseBuilder,
  createApiErrorResponse,
  createApiSuccessResponse,
  createPaginatedResponse,
  extractPaginationParams,
  isErrorResponse,
  isSuccessResponse,
  withApiResponse,
} from "./response";

// Type exports
export type { ErrorResponse, SuccessResponse } from "./errors";
export type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "./response";

// Middleware exports
export {
  composeMiddleware,
  isHealthCheck,
  logAdminActivity,
  logRequest,
  requireAuth,
  requireRole,
  withCORS,
  withRequestId,
} from "./middleware";

// Branch middleware
export {
  addBranchFilter,
  getBranchContext,
  validateBranchAccess,
} from "./branch-middleware";

// Root middleware
export { isRootUser, requireRoot } from "./root-middleware";

// API Client and helpers
export {
  ApiClient,
  formatErrorForDisplay,
  getErrorMessage,
  getValidationErrors,
  handlePaginatedResponse,
  isError,
  isSuccess,
  isValidationError,
  queryFn,
  unwrapData,
} from "./client-helpers";

// API Services
export * from "./services";
