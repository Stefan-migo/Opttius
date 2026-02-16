/**
 * API Response Helpers
 *
 * Helper functions to extract data from API responses that may be in either
 * legacy format or standardized format.
 *
 * Legacy format: { customers: [...], pagination: {...} }
 * Standardized format: { success: true, data: [...], meta: { pagination: {...} } }
 */

/**
 * Extract data from API response (handles both legacy and standardized formats)
 *
 * @param response - The API response object
 * @returns Array of data items
 *
 * @example
 * // Standardized format
 * const response = { success: true, data: [{ id: 1 }], meta: {...} };
 * const data = extractDataFromResponse(response); // [{ id: 1 }]
 *
 * // Legacy format
 * const legacyResponse = { customers: [{ id: 1 }], pagination: {...} };
 * const data = extractDataFromResponse(legacyResponse); // [{ id: 1 }]
 */
export function extractDataFromResponse<T>(response: any): T[] {
  // Handle null/undefined
  if (!response) {
    return [];
  }

  // Standardized format: { success: true, data: [...], meta: {...} }
  if (response.success === true && Array.isArray(response.data)) {
    return response.data;
  }

  // Legacy format: { customers: [...] } or { products: [...] } etc.
  const dataKeys = [
    "customers",
    "products",
    "orders",
    "quotes",
    "workOrders",
    "work_orders",
    "appointments",
    "users",
    "tickets",
    "messages",
    "adminUsers",
    "branches",
    "inventory",
    "categories",
    "families",
  ];
  for (const key of dataKeys) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }

  // Fallback: return empty array
  return [];
}

/**
 * Extract pagination from API response (handles both legacy and standardized formats)
 *
 * @param response - The API response object
 * @returns Pagination metadata
 *
 * @example
 * // Standardized format
 * const response = { success: true, data: [...], meta: { pagination: {...} } };
 * const pagination = extractPaginationFromResponse(response);
 *
 * // Legacy format
 * const legacyResponse = { customers: [...], pagination: {...} };
 * const pagination = extractPaginationFromResponse(legacyResponse);
 */
export function extractPaginationFromResponse(response: any): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
} {
  // Handle null/undefined
  if (!response) {
    return {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    };
  }

  // Standardized format: { success: true, data: [...], meta: { pagination: {...} } }
  if (response.success === true && response.meta?.pagination) {
    return response.meta.pagination;
  }

  // Legacy format: { pagination: {...} }
  if (response.pagination) {
    return response.pagination;
  }

  // Fallback: return default pagination
  return {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  };
}

/**
 * Extract total count from API response (handles both legacy and standardized formats)
 *
 * @param response - The API response object
 * @returns Total count of items
 *
 * @example
 * // Standardized format
 * const response = { success: true, data: [...], meta: { pagination: { total: 100 } } };
 * const total = extractTotalFromResponse(response); // 100
 *
 * // Legacy format
 * const legacyResponse = { customers: [...], total: 100 };
 * const total = extractTotalFromResponse(legacyResponse); // 100
 */
export function extractTotalFromResponse(response: any): number {
  // Handle null/undefined
  if (!response) {
    return 0;
  }

  // Standardized format: { success: true, data: [...], meta: { pagination: { total: ... } } }
  if (
    response.success === true &&
    response.meta?.pagination?.total !== undefined
  ) {
    return response.meta.pagination.total;
  }

  // Legacy format: { total: ... }
  if (response.total !== undefined) {
    return response.total;
  }

  // Legacy format: { pagination: { total: ... } }
  if (response.pagination?.total !== undefined) {
    return response.pagination.total;
  }

  // Fallback: return 0
  return 0;
}

/**
 * Check if response is successful (handles both legacy and standardized formats)
 *
 * @param response - The API response object
 * @returns True if response is successful
 *
 * @example
 * // Standardized format
 * const response = { success: true, data: [...], meta: {...} };
 * const isSuccess = isResponseSuccessful(response); // true
 *
 * // Legacy format (no success field, assume successful if no error)
 * const legacyResponse = { customers: [...], pagination: {...} };
 * const isSuccess = isResponseSuccessful(legacyResponse); // true
 */
export function isResponseSuccessful(response: any): boolean {
  // Handle null/undefined
  if (!response) {
    return false;
  }

  // Standardized format: { success: true/false }
  if (response.success !== undefined) {
    return response.success === true;
  }

  // Legacy format: assume successful if no error field
  return !response.error;
}

/**
 * Extract error from API response (handles both legacy and standardized formats)
 *
 * @param response - The API response object
 * @returns Error message or null if no error
 *
 * @example
 * // Standardized format
 * const response = { success: false, error: { code: 'ERROR', message: 'Something went wrong' } };
 * const error = extractErrorFromResponse(response); // 'Something went wrong'
 *
 * // Legacy format
 * const legacyResponse = { error: 'Something went wrong' };
 * const error = extractErrorFromResponse(legacyResponse); // 'Something went wrong'
 */
export function extractErrorFromResponse(response: any): string | null {
  // Handle null/undefined
  if (!response) {
    return null;
  }

  // Standardized format: { success: false, error: { message: '...' } }
  if (response.success === false && response.error?.message) {
    return response.error.message;
  }

  // Legacy format: { error: '...' }
  if (response.error) {
    return typeof response.error === "string"
      ? response.error
      : response.error.message || "Unknown error";
  }

  // No error
  return null;
}
