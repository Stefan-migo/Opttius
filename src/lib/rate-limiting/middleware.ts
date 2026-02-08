import { NextRequest, NextResponse } from "next/server";
import {
  getRateLimiter,
  getRateLimitConfig,
  getIPAddress,
} from "@/lib/rate-limiting";
import { appLogger as logger } from "@/lib/logger";

/**
 * Redis-based Rate Limiting Middleware
 *
 * Integrates Redis rate limiting with Next.js middleware system.
 * Provides automatic rate limiting for API routes with configurable policies.
 *
 * @module lib/rate-limiting/middleware
 */

/**
 * Rate limiting middleware for Next.js API routes
 *
 * Automatically applies rate limiting based on endpoint category.
 * Blocks requests that exceed rate limits and adds appropriate headers.
 *
 * @param request - NextRequest object
 * @param handler - Original route handler
 * @returns NextResponse with rate limiting applied
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withRateLimit(request, async () => {
 *     // Your route logic here
 *     return NextResponse.json({ data: 'success' });
 *   });
 * }
 * ```
 */
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    // Skip rate limiting for health checks and internal routes
    if (isHealthCheck(request) || isInternalRoute(request)) {
      return await handler();
    }

    // Get client IP for identification and blocking check
    const ipAddress = getIPAddress(request);

    // Check if IP is blocked
    const rateLimiter = getRateLimiter();
    const blockInfo = await rateLimiter.getBlockInfo(ipAddress);

    if (blockInfo?.blocked) {
      logger.warn("Blocked request from IP", {
        ip: ipAddress,
        reason: blockInfo.reason,
        expires: blockInfo.expires,
      });

      return new NextResponse(
        JSON.stringify({
          error: "IP blocked",
          reason: blockInfo.reason,
          retryAfter: blockInfo.expires
            ? Math.ceil((blockInfo.expires - Date.now()) / 1000)
            : undefined,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": blockInfo.expires
              ? Math.ceil((blockInfo.expires - Date.now()) / 1000).toString()
              : "3600",
          },
        },
      );
    }

    // Get appropriate rate limit configuration for this endpoint
    const config = getRateLimitConfig(request.nextUrl.pathname);
    const clientKey = `${ipAddress}:${request.nextUrl.pathname}`;

    // Check rate limit
    const result = await rateLimiter.isRateLimited(clientKey, config);

    // Add rate limit headers to response
    const headers = rateLimiter.getRateLimitHeaders(result);

    // If rate limited, return 429 response
    if (result.limited) {
      logger.warn("Rate limit exceeded", {
        ip: ipAddress,
        path: request.nextUrl.pathname,
        current: result.current,
        limit: config.limit,
      });

      // Optionally block IP for repeated violations
      if (result.current > config.limit * 2) {
        await rateLimiter.blockIP(ipAddress, {
          durationMs: 5 * 60 * 1000, // 5 minutes
          reason: "Repeated rate limit violations",
        });
      }

      return new NextResponse(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Execute the original handler
    const response = await handler();

    // Add rate limit headers to successful responses
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    logger.error("Rate limiting middleware error", error);

    // Graceful fallback - allow request through on error
    return await handler();
  }
}

/**
 * Rate limiting decorator for API route handlers
 *
 * Wraps route handlers with automatic rate limiting.
 * Can be used as a higher-order function or decorator.
 *
 * @param handler - Original route handler function
 * @returns Wrapped handler with rate limiting
 *
 * @example
 * ```typescript
 * // As a wrapper function
 * export const GET = rateLimit(async (request) => {
 *   return NextResponse.json({ data: 'protected' });
 * });
 *
 * // Or apply to existing handlers
 * export const POST = rateLimit(myExistingHandler);
 * ```
 */
export function rateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    return withRateLimit(request, () => handler(request));
  };
}

/**
 * Check if request is a health check endpoint
 */
function isHealthCheck(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  return pathname === "/api/health" || pathname === "/health";
}

/**
 * Check if request is for internal/admin routes that might need different handling
 */
function isInternalRoute(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/internal/") ||
    pathname.includes("__webpack")
  );
}

/**
 * Manual rate limit check utility
 *
 * Use this for custom rate limiting logic or conditional rate limiting.
 *
 * @param request - NextRequest object
 * @param config - Optional custom rate limit configuration
 * @returns Rate limit result and helper functions
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const { check, headers } = await checkRateLimit(request);
 *
 *   if (check.limited) {
 *     return new NextResponse(
 *       JSON.stringify({ error: 'Rate limited' }),
 *       { status: 429, headers }
 *     );
 *   }
 *
 *   // Continue with your logic
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export async function checkRateLimit(
  request: NextRequest,
  config?: import("./config").RateLimitConfig,
) {
  const rateLimiter = getRateLimiter();
  const ipAddress = getIPAddress(request);
  const finalConfig = config || getRateLimitConfig(request.nextUrl.pathname);
  const clientKey = `${ipAddress}:${request.nextUrl.pathname}`;

  const result = await rateLimiter.isRateLimited(clientKey, finalConfig);
  const headers = rateLimiter.getRateLimitHeaders(result);

  return {
    check: result,
    headers,
    blockIP: (durationMs: number, reason?: string) =>
      rateLimiter.blockIP(ipAddress, { durationMs, reason }),
    isBlocked: () => rateLimiter.isIPBlocked(ipAddress),
  };
}

// Export types
export type { NextRequest, NextResponse };
