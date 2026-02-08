/**
 * Centralized Validation Framework
 *
 * Provides unified access to all validation schemas and utilities
 * Consolidates existing validation logic for consistent usage across the application
 *
 * @module lib/validation
 */

// Export common schemas
export * from "./schemas";

// Export organization-specific schemas
export * from "./organization-schemas";

// Export validation helpers (excluding conflicting names)
export {
  validateBody,
  parseAndValidateBody,
  parseAndValidateParams,
  validationErrorResponse,
  ValidationError,
} from "./zod-helpers";

// Export middleware (excluding conflicting names)
export {
  withBodyValidation,
  withQueryValidation,
  withPathValidation,
  withValidation as withCombinedValidation,
} from "./middleware";

// Export types
export type { z } from "./middleware";
