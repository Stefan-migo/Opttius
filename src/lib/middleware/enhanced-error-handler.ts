/**
 * Enhanced Error Handling Middleware
 * Integrates with the error reporting system for comprehensive error management
 */

import { NextRequest, NextResponse } from "next/server";
import { appLogger as logger } from "@/lib/logger";
import { reportApiError } from "@/lib/error-reporting";
import {
  ApplicationError,
  ValidationError,
  AuthorizationError,
  AuthenticationError,
  handleApiError,
  generateRequestId,
} from "@/lib/errors/comprehensive-handler";
import { z } from "zod";

interface EnhancedErrorHandlerOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  allowedRoles?: string[];
  enableReporting?: boolean;
  reportThreshold?: number; // Minimum status code to trigger reporting (default: 500)
}

export function withEnhancedErrorHandling(
  handler: (
    request: NextRequest,
    context: { requestId: string },
  ) => Promise<NextResponse>,
  options: EnhancedErrorHandlerOptions = {},
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // Add request ID to logging context
      logger.debug("API request started", {
        requestId,
        method: request.method,
        url: request.url,
        userAgent: request.headers.get("user-agent"),
        enableReporting: options.enableReporting,
      });

      // Authentication check if required
      if (options.requireAuth || options.requireAdmin) {
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new AuthenticationError(
            "Missing or invalid authorization header",
          );
        }

        const token = authHeader.substring(7);
        if (!token) {
          throw new AuthenticationError("Invalid authorization token");
        }

        // Role validation if required
        if (options.requireAdmin) {
          const userRole = "user"; // Would come from token validation

          if (
            options.allowedRoles &&
            !options.allowedRoles.includes(userRole)
          ) {
            throw new AuthorizationError("Insufficient permissions");
          }
        }
      }

      // Execute the handler
      const response = await handler(request, { requestId });
      const duration = Date.now() - startTime;

      // Log successful request
      logger.info("API request completed", {
        requestId,
        method: request.method,
        url: request.url,
        statusCode: response.status,
        durationMs: duration,
      });

      // Add request ID to response headers for tracing
      response.headers.set("X-Request-ID", requestId);

      return response;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      // Handle the error using existing error handler
      const { response: errorResponse, statusCode } = handleApiError(
        error,
        requestId,
      );

      // Enhanced error reporting
      if (options.enableReporting !== false) {
        const shouldReport = statusCode >= (options.reportThreshold || 500);

        if (shouldReport) {
          // Extract user info if available
          const userId = extractUserIdFromRequest(request);

          // Report error with context
          reportApiError(
            error instanceof Error ? error : new Error(String(error)),
            {
              userId,
              requestId,
              endpoint: request.url,
              method: request.method,
              statusCode,
              // durationMs: duration, // Not supported in current error reporting
              // userAgent: request.headers.get("user-agent"), // Not supported in current error reporting
            },
          ).catch((reportError) => {
            logger.warn("Failed to report error", reportError);
          });
        }
      }

      // Log error response
      logger.error("API request failed", {
        requestId,
        method: request.method,
        url: request.url,
        statusCode,
        durationMs: duration,
        errorCode: errorResponse.error.code,
        errorMessage: errorResponse.error.message,
        errorDetails: errorResponse.error.details,
      });

      // Return error response
      const finalResponse = NextResponse.json(errorResponse, {
        status: statusCode,
        headers: {
          "X-Request-ID": requestId,
          "Content-Type": "application/json",
        },
      });

      return finalResponse;
    }
  };
}

// Helper function to extract user ID from request
function extractUserIdFromRequest(request: NextRequest): string | undefined {
  try {
    // Try to extract from authorization header
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // In real implementation, you'd decode the JWT to get user ID
      // For now, return a placeholder
      return "user-from-token";
    }

    // Try to extract from cookies
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const userIdMatch = cookieHeader.match(/user_id=([^;]+)/);
      if (userIdMatch) {
        return userIdMatch[1];
      }
    }

    return undefined;
  } catch (error) {
    logger.debug("Failed to extract user ID from request", error);
    return undefined;
  }
}

// Enhanced validation wrapper with error reporting
export function withEnhancedValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (
    validatedData: z.infer<T>,
    request: NextRequest,
    context: { requestId: string },
  ) => Promise<NextResponse>,
  options: EnhancedErrorHandlerOptions = {},
) {
  return withEnhancedErrorHandling(
    async (request: NextRequest, context) => {
      try {
        // Parse and validate request body
        const body = await request.json();
        const validatedData = schema.parse(body);

        return await handler(validatedData, request, context);
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          throw new ValidationError("Invalid request data", {
            details: error.flatten(),
          });
        }
        throw error;
      }
    },
    {
      ...options,
      enableReporting: options.enableReporting ?? false, // Validation errors typically don't need reporting
    },
  );
}

// Rate limiting error handler
export class RateLimitError extends ApplicationError {
  constructor(
    message: string = "Too many requests",
    options: { retryAfter?: number } = {},
  ) {
    super(message, {
      code: "RATE_LIMIT_EXCEEDED",
      statusCode: 429,
      details: options.retryAfter
        ? { retryAfter: options.retryAfter }
        : undefined,
    });
  }
}

// Timeout error handler
export class TimeoutError extends ApplicationError {
  constructor(
    message: string = "Request timeout",
    options: { timeoutMs?: number } = {},
  ) {
    super(message, {
      code: "REQUEST_TIMEOUT",
      statusCode: 408,
      details: options.timeoutMs ? { timeoutMs: options.timeoutMs } : undefined,
    });
  }
}

// Export enhanced error classes
export {
  ApplicationError,
  ValidationError,
  AuthorizationError,
  AuthenticationError,
};
