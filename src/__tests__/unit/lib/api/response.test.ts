import { describe, expect, it } from "vitest";

import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from "@/lib/api/errors";
import {
  ApiResponseBuilder,
  createApiErrorResponse,
  createApiSuccessResponse,
  createPaginatedResponse,
  extractPaginationParams,
  isErrorResponse,
  isSuccessResponse,
} from "@/lib/api/response";

describe("API Response Standardization", () => {
  describe("createApiSuccessResponse", () => {
    it("should create a basic success response", async () => {
      const data = { id: 1, name: "Test" };
      const response = createApiSuccessResponse(data);
      const json = await response.json();

      expect(json).toMatchObject({
        success: true,
        data: { id: 1, name: "Test" },
        meta: {
          timestamp: expect.any(String),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should include requestId when provided", async () => {
      const data = { id: 1 };
      const requestId = "test-request-id";
      const response = createApiSuccessResponse(data, { requestId });
      const json = await response.json();

      expect(json.meta?.requestId).toBe(requestId);
    });

    it("should include custom status code", () => {
      const data = { id: 1 };
      const response = createApiSuccessResponse(data, { statusCode: 201 });

      expect(response.status).toBe(201);
    });

    it("should include custom metadata", async () => {
      const data = { id: 1 };
      const response = createApiSuccessResponse(data, {
        meta: { customField: "customValue" },
      });
      const json = await response.json();

      expect(json.meta?.customField).toBe("customValue");
    });
  });

  describe("createApiErrorResponse", () => {
    it("should create error response from APIError", async () => {
      const error = new ValidationError("Invalid input");
      const response = createApiErrorResponse(error);
      const json = await response.json();

      expect(json).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          timestamp: expect.any(String),
        },
      });
      expect(response.status).toBe(400);
    });

    it("should create error response from generic Error", async () => {
      const error = new Error("Something went wrong");
      const response = createApiErrorResponse(error);
      const json = await response.json();

      expect(json).toMatchObject({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong",
        },
      });
      expect(response.status).toBe(500);
    });

    it("should include requestId when provided", async () => {
      const error = new Error("Test error");
      const requestId = "test-request-id";
      const response = createApiErrorResponse(error, { requestId });
      const json = await response.json();

      expect(json.error.requestId).toBe(requestId);
    });

    it("should handle AuthenticationError correctly", async () => {
      const error = new AuthenticationError("Not authenticated");
      const response = createApiErrorResponse(error);
      const json = await response.json();

      expect(json.error.code).toBe("AUTHENTICATION_ERROR");
      expect(response.status).toBe(401);
    });

    it("should handle AuthorizationError correctly", async () => {
      const error = new AuthorizationError("Insufficient permissions");
      const response = createApiErrorResponse(error);
      const json = await response.json();

      expect(json.error.code).toBe("AUTHORIZATION_ERROR");
      expect(response.status).toBe(403);
    });
  });

  describe("createPaginatedResponse", () => {
    it("should create paginated response with correct metadata", async () => {
      const data = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];
      const response = createPaginatedResponse(data, {
        page: 1,
        limit: 10,
        total: 25,
      });
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
      expect(json.meta?.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it("should calculate hasNextPage correctly", async () => {
      const data = [{ id: 1 }];
      const response = createPaginatedResponse(data, {
        page: 3,
        limit: 10,
        total: 25,
      });
      const json = await response.json();

      expect(json.meta?.pagination?.hasNextPage).toBe(false);
    });

    it("should calculate hasPreviousPage correctly", async () => {
      const data = [{ id: 1 }];
      const response = createPaginatedResponse(data, {
        page: 2,
        limit: 10,
        total: 25,
      });
      const json = await response.json();

      expect(json.meta?.pagination?.hasPreviousPage).toBe(true);
    });
  });

  describe("ApiResponseBuilder", () => {
    it("should build success response", async () => {
      const builder = new ApiResponseBuilder();
      const data = { id: 1, name: "Test" };

      const response = builder
        .setData(data)
        .setStatusCode(200)
        .setRequestId("test-id")
        .build();

      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
      expect(json.meta?.requestId).toBe("test-id");
      expect(response.status).toBe(200);
    });

    it("should build error response", async () => {
      const builder = new ApiResponseBuilder();
      const error = new ValidationError("Invalid data");

      const response = builder.setError(error).setRequestId("test-id").build();

      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.message).toBe("Invalid data");
    });

    it("should add custom metadata", async () => {
      const builder = new ApiResponseBuilder();

      const response = builder
        .setData({ id: 1 })
        .addMeta("customKey", "customValue")
        .addMeta("anotherKey", 123)
        .build();

      const json = await response.json();

      expect(json.meta?.customKey).toBe("customValue");
      expect(json.meta?.anotherKey).toBe(123);
    });

    it("should include pagination metadata", async () => {
      const builder = new ApiResponseBuilder();

      const response = builder
        .setData([{ id: 1 }])
        .setPagination({
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10,
          hasNextPage: true,
          hasPreviousPage: false,
        })
        .build();

      const json = await response.json();

      expect(json.meta?.pagination).toBeDefined();
      expect(json.meta?.pagination?.total).toBe(100);
    });
  });

  describe("extractPaginationParams", () => {
    it("should extract pagination params from URL", () => {
      const url = "http://example.com/api/customers?page=2&limit=20";
      const params = extractPaginationParams(url);

      expect(params).toEqual({
        page: 2,
        limit: 20,
      });
    });

    it("should use default values when params are missing", () => {
      const url = "http://example.com/api/customers";
      const params = extractPaginationParams(url);

      expect(params).toEqual({
        page: 1,
        limit: 10,
      });
    });

    it("should sanitize invalid page numbers", () => {
      const url = "http://example.com/api/customers?page=-5&limit=0";
      const params = extractPaginationParams(url);

      expect(params.page).toBeGreaterThanOrEqual(1);
      expect(params.limit).toBeGreaterThanOrEqual(1);
    });

    it("should enforce maximum limit", () => {
      const url = "http://example.com/api/customers?limit=1000";
      const params = extractPaginationParams(url);

      expect(params.limit).toBeLessThanOrEqual(100);
    });
  });

  describe("Type guards", () => {
    it("isSuccessResponse should correctly identify success responses", () => {
      const successResponse = {
        success: true as const,
        data: { id: 1 },
        meta: { timestamp: new Date().toISOString() },
      };

      expect(isSuccessResponse(successResponse)).toBe(true);
    });

    it("isSuccessResponse should reject error responses", () => {
      const errorResponse = {
        success: false as const,
        error: {
          code: "ERROR",
          message: "Error message",
          timestamp: new Date().toISOString(),
        },
      };

      expect(isSuccessResponse(errorResponse)).toBe(false);
    });

    it("isErrorResponse should correctly identify error responses", () => {
      const errorResponse = {
        success: false as const,
        error: {
          code: "ERROR",
          message: "Error message",
          timestamp: new Date().toISOString(),
        },
      };

      expect(isErrorResponse(errorResponse)).toBe(true);
    });

    it("isErrorResponse should reject success responses", () => {
      const successResponse = {
        success: true as const,
        data: { id: 1 },
        meta: { timestamp: new Date().toISOString() },
      };

      expect(isErrorResponse(successResponse)).toBe(false);
    });
  });
});
