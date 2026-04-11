/**
 * Rate Limiting Module Index
 *
 * Exports all rate limiting functionality for centralized access
 *
 * @module lib/rate-limiting
 */

export {
  AUTH_RATE_LIMIT,
  type RateLimitConfig as Config,
  GENERAL_RATE_LIMIT,
  getClientIdentifier,
  getIPAddress,
  getRateLimitConfig,
  HIGH_VOLUME_RATE_LIMIT,
  LONG_BLOCK_DURATION,
  MEDIUM_BLOCK_DURATION,
  PAYMENT_RATE_LIMIT,
  PUBLIC_RATE_LIMIT,
  SEARCH_RATE_LIMIT,
  SHORT_BLOCK_DURATION,
} from "./config";
export {
  checkRateLimit,
  type NextRequest,
  type NextResponse,
  rateLimit,
  withRateLimit,
} from "./middleware";
export {
  type BlockConfig,
  getRateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
  RedisRateLimiter,
} from "./redis-rate-limiter";
