/**
 * Client-side helpers for consuming standardized API responses
 * Provides type-safe utilities for frontend API calls
 */

import type { ApiResponse, ApiSuccessResponse, ApiErrorResponse, PaginationMeta } from "./response";

/**
 * Type-safe API client for making requests
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  /**
   * Make a GET request
   */
  async get<T = any>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * Make a POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }

  /**
   * Generic request method with standardized response handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      const data: ApiResponse<T> = await response.json();

      // The response structure already indicates success/failure
      return data;
    } catch (error) {
      // Network error or parsing error
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error occurred",
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

/**
 * Helper to check if an API response is successful
 */
export function isSuccess<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Helper to check if an API response is an error
 */
export function isError(
  response: ApiResponse<any>,
): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Extract data from a successful response
 * Throws if response is an error
 */
export function unwrapData<T>(response: ApiResponse<T>): T {
  if (isSuccess(response)) {
    return response.data;
  }
  throw new Error(response.error.message);
}

/**
 * Extract error message from an error response
 */
export function getErrorMessage(response: ApiResponse<any>): string {
  if (isError(response)) {
    return response.error.message;
  }
  return "Unknown error";
}

/**
 * React Query integration helper
 * Converts API response to React Query expected format
 */
export async function queryFn<T>(
  fetcher: () => Promise<ApiResponse<T>>,
): Promise<T> {
  const response = await fetcher();
  
  if (isSuccess(response)) {
    return response.data;
  }
  
  // React Query will catch this error
  throw new Error(response.error.message);
}

/**
 * Hook-friendly wrapper for paginated queries
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
  isSuccess: boolean;
  error?: string;
}

export function handlePaginatedResponse<T>(
  response: ApiResponse<T[]>,
): PaginatedResult<T> {
  if (isSuccess(response)) {
    return {
      data: response.data,
      pagination: response.meta?.pagination || {
        page: 1,
        limit: 10,
        total: response.data.length,
        totalPages: 1,
      },
      isSuccess: true,
    };
  }

  return {
    data: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
    isSuccess: false,
    error: response.error.message,
  };
}

/**
 * Example usage with customers API
 */
export async function fetchCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedResult<any>> {
  const client = new ApiClient();
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined) as [string, string][],
  ).toString();
  
  const response = await client.get(`/api/admin/customers?${queryString}`);
  return handlePaginatedResponse(response);
}

/**
 * Type guard for validation errors
 */
export function isValidationError(response: ApiResponse<any>): boolean {
  return isError(response) && response.error.code === "VALIDATION_ERROR";
}

/**
 * Extract validation error details
 */
export function getValidationErrors(
  response: ApiResponse<any>,
): Array<{ field: string; message: string }> | null {
  if (!isError(response)) {
    return null;
  }
  
  if (response.error.code === "VALIDATION_ERROR") {
    const details = response.error.details;
    if (Array.isArray(details)) {
      return details as Array<{ field: string; message: string }>;
    }
  }
  return null;
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(response: ApiResponse<any>): string {
  if (!isError(response)) {
    return "";
  }

  const validationErrors = getValidationErrors(response);
  if (validationErrors) {
    return validationErrors
      .map((err) => `${err.field}: ${err.message}`)
      .join(", ");
  }

  return response.error.message;
}
