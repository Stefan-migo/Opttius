/**
 * Rate Limiting Configuration
 *
 * Centralized configuration for rate limiting across the application.
 * Defines different rate limit tiers for various endpoint categories.
 *
 * @module lib/rate-limiting/config
 */

import { RateLimitConfig } from "./redis-rate-limiter";

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

/**
 * General API endpoints rate limit
 * Used for most administrative endpoints
 */
const GENERAL_RATE_LIMIT: RateLimitConfig = {
  limit: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: "general",
};

/**
 * Authentication endpoints rate limit
 * More restrictive to prevent brute force attacks
 */
const AUTH_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: "auth",
};

/**
 * Payment endpoints rate limit
 * Very restrictive due to financial sensitivity
 */
const PAYMENT_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowMs: 5 * 60 * 1000, // 5 minutes
  keyPrefix: "payment",
};

/**
 * Search endpoints rate limit
 * Higher limit to accommodate search functionality
 */
const SEARCH_RATE_LIMIT: RateLimitConfig = {
  limit: 30,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: "search",
};

/**
 * Public API endpoints rate limit
 * For externally accessible endpoints
 */
const PUBLIC_RATE_LIMIT: RateLimitConfig = {
  limit: 50,
  windowMs: 10 * 60 * 1000, // 10 minutes
  keyPrefix: "public",
};

/**
 * High-volume endpoints rate limit
 * For endpoints that expect higher traffic
 */
const HIGH_VOLUME_RATE_LIMIT: RateLimitConfig = {
  limit: 200,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: "high-volume",
};

// ============================================================================
// BLOCK CONFIGURATIONS
// ============================================================================

/**
 * Short-term block duration
 * For temporary rate limit violations
 */
export const SHORT_BLOCK_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Medium-term block duration
 * For repeated violations
 */
export const MEDIUM_BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Long-term block duration
 * For severe abuse
 */
export const LONG_BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// CLIENT IDENTIFICATION
// ============================================================================

/**
 * Get client identifier for rate limiting
 * Combines IP address with user agent for more precise identification
 */
export function getClientIdentifier(request: Request): string {
  // Get real IP from headers (for reverse proxies)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const xRealIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const clientIp =
    cfConnectingIp ||
    xForwardedFor?.split(",")[0]?.trim() ||
    xRealIp ||
    "unknown";

  // Include user agent for additional specificity (but truncate for privacy)
  const userAgent = request.headers.get("user-agent") || "unknown";
  const truncatedUA = userAgent.substring(0, 50);

  return `${clientIp}:${truncatedUA}`;
}

/**
 * Get IP address only (for blocking purposes)
 */
export function getIPAddress(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const xRealIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  return (
    cfConnectingIp ||
    xForwardedFor?.split(",")[0]?.trim() ||
    xRealIp ||
    "unknown"
  );
}

// ============================================================================
// ENDPOINT CATEGORIZATION
// ============================================================================

/**
 * Map endpoint paths to appropriate rate limit configurations
 */
export const RATE_LIMIT_CATEGORIES: Record<string, RateLimitConfig> = {
  // Authentication endpoints
  "^/api/admin/(login|logout|signup)": AUTH_RATE_LIMIT,
  "^/api/auth/": AUTH_RATE_LIMIT,

  // Payment endpoints
  "^/api/admin/payments/": PAYMENT_RATE_LIMIT,
  "^/api/webhooks/": PAYMENT_RATE_LIMIT,
  "^/api/checkout/": PAYMENT_RATE_LIMIT,

  // Search endpoints
  search$: SEARCH_RATE_LIMIT,
  "/search": SEARCH_RATE_LIMIT,

  // Public endpoints
  "^/api/support/": PUBLIC_RATE_LIMIT,
  "^/api/landing/": PUBLIC_RATE_LIMIT,
  "^/api/categories/": PUBLIC_RATE_LIMIT,

  // High-volume endpoints
  "^/api/admin/dashboard": HIGH_VOLUME_RATE_LIMIT,
  "^/api/admin/analytics/": HIGH_VOLUME_RATE_LIMIT,

  // Everything else uses general rate limit
  default: GENERAL_RATE_LIMIT,
};

/**
 * Get appropriate rate limit configuration for an endpoint
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const [pattern, config] of Object.entries(RATE_LIMIT_CATEGORIES)) {
    if (pattern === "default") continue;

    const regex = new RegExp(pattern);
    if (regex.test(pathname)) {
      return config;
    }
  }

  return RATE_LIMIT_CATEGORIES.default;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GENERAL_RATE_LIMIT,
  AUTH_RATE_LIMIT,
  PAYMENT_RATE_LIMIT,
  SEARCH_RATE_LIMIT,
  PUBLIC_RATE_LIMIT,
  HIGH_VOLUME_RATE_LIMIT,
};

export type { RateLimitConfig };
