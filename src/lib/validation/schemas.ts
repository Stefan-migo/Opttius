import { z } from "zod";

/**
 * Common Validation Schemas
 *
 * Centralized collection of reusable validation schemas for consistent input validation
 * across the entire application. These schemas should be used as building blocks
 * for more specific validation requirements.
 *
 * @module lib/validation/schemas
 */

// ============================================================================
// PRIMITIVE TYPE SCHEMAS
// ============================================================================

/**
 * Email validation schema
 * Validates email format and applies common transformations
 */
export const emailSchema = z
  .string()
  .email("Must be a valid email address")
  .max(255, "Email is too long")
  .toLowerCase()
  .trim();

/**
 * Optional email schema
 * Allows null, undefined, or empty string values
 */
export const emailOptionalSchema = z
  .union([
    z.string().email("Must be a valid email address").toLowerCase().trim(),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val === "") return null;
    return val;
  });

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid("Must be a valid UUID");

/**
 * Optional UUID schema
 */
export const uuidOptionalSchema = z
  .string()
  .uuid("Must be a valid UUID")
  .optional()
  .nullable();

/**
 * Phone number validation schema
 * Supports international format with optional country code
 */
export const phoneNumberSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Must be a valid phone number")
  .trim();

/**
 * Optional phone number schema
 */
export const phoneNumberOptionalSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Must be a valid phone number")
  .optional()
  .nullable()
  .transform((val) => val || null);

// ============================================================================
// NUMERIC SCHEMAS
// ============================================================================

/**
 * Positive integer schema
 */
export const positiveIntegerSchema = z
  .number()
  .int("Must be a whole number")
  .positive("Must be greater than 0");

/**
 * Non-negative integer schema (allows 0)
 */
export const nonNegativeIntegerSchema = z
  .number()
  .int("Must be a whole number")
  .nonnegative("Must be 0 or greater");

/**
 * Percentage schema (0-100)
 */
export const percentageSchema = z
  .number()
  .min(0, "Percentage cannot be negative")
  .max(100, "Percentage cannot exceed 100");

/**
 * Price/currency amount schema
 */
export const priceSchema = z
  .number()
  .nonnegative("Price cannot be negative")
  .multipleOf(0.01, "Price must be in cents (two decimal places)");

// ============================================================================
// TEXT SCHEMAS
// ============================================================================

/**
 * Name validation schema
 */
export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name is too long")
  .trim();

/**
 * Description validation schema
 */
export const descriptionSchema = z
  .string()
  .max(1000, "Description is too long")
  .optional()
  .nullable()
  .transform((val) => val || null);

/**
 * Slug validation schema
 * For URL-friendly identifiers
 */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be a valid slug format")
  .min(1, "Slug is required")
  .max(50, "Slug is too long")
  .toLowerCase();

// ============================================================================
// DATE AND TIME SCHEMAS
// ============================================================================

/**
 * ISO date string validation
 */
export const isoDateStringSchema = z
  .string()
  .datetime("Must be a valid ISO date string")
  .or(z.date());

/**
 * Optional ISO date string
 */
export const isoDateStringOptionalSchema = z
  .string()
  .datetime("Must be a valid ISO date string")
  .optional()
  .nullable()
  .or(z.date().optional().nullable())
  .transform((val) => {
    if (!val) return null;
    return val instanceof Date ? val.toISOString() : val;
  });

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z
    .number()
    .int("Page must be a whole number")
    .min(1, "Page must be 1 or greater")
    .default(1),
  limit: z
    .number()
    .int("Limit must be a whole number")
    .min(1, "Limit must be 1 or greater")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});

/**
 * Sort parameters schema
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

/**
 * Search query schema
 */
export const searchQuerySchema = z
  .string()
  .min(1, "Search query is required")
  .max(100, "Search query is too long")
  .trim();

/**
 * Optional search query schema
 */
export const searchQueryOptionalSchema = z
  .string()
  .max(100, "Search query is too long")
  .optional()
  .nullable()
  .transform((val) => (val ? val.trim() : null));

// ============================================================================
// STATUS SCHEMAS
// ============================================================================

/**
 * Generic status schema
 */
export const statusSchema = z.enum([
  "active",
  "inactive",
  "pending",
  "completed",
  "cancelled",
  "draft",
]);

/**
 * Boolean-like string schema
 */
export const booleanStringSchema = z
  .union([z.literal("true"), z.literal("false"), z.boolean()])
  .transform((val) => {
    if (typeof val === "boolean") return val;
    return val === "true";
  });

// ============================================================================
// COLLECTION SCHEMAS
// ============================================================================

/**
 * Array of UUIDs schema
 */
export const uuidArraySchema = z
  .array(uuidSchema)
  .min(1, "At least one ID is required");

/**
 * Optional array of UUIDs schema
 */
export const uuidArrayOptionalSchema = z
  .array(uuidSchema)
  .optional()
  .nullable()
  .transform((val) => val || []);

// Export all schemas as a grouped object for easy access
export const commonSchemas = {
  // Primitive types
  email: emailSchema,
  emailOptional: emailOptionalSchema,
  uuid: uuidSchema,
  uuidOptional: uuidOptionalSchema,
  phoneNumber: phoneNumberSchema,
  phoneNumberOptional: phoneNumberOptionalSchema,

  // Numeric types
  positiveInteger: positiveIntegerSchema,
  nonNegativeInteger: nonNegativeIntegerSchema,
  percentage: percentageSchema,
  price: priceSchema,

  // Text types
  name: nameSchema,
  description: descriptionSchema,
  slug: slugSchema,

  // Date/time types
  isoDateString: isoDateStringSchema,
  isoDateStringOptional: isoDateStringOptionalSchema,

  // Utility schemas
  pagination: paginationSchema,
  sort: sortSchema,
  searchQuery: searchQuerySchema,
  searchQueryOptional: searchQueryOptionalSchema,
  status: statusSchema,
  booleanString: booleanStringSchema,
  uuidArray: uuidArraySchema,
  uuidArrayOptional: uuidArrayOptionalSchema,
};
