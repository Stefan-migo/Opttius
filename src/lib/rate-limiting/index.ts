/**
 * Rate Limiting Module Index
 *
 * Exports all rate limiting functionality for centralized access
 *
 * @module lib/rate-limiting
 */

export {
  RedisRateLimiter,
  getRateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
  type BlockConfig,
} from "./redis-rate-limiter";

export {
  GENERAL_RATE_LIMIT,
  AUTH_RATE_LIMIT,
  PAYMENT_RATE_LIMIT,
  SEARCH_RATE_LIMIT,
  PUBLIC_RATE_LIMIT,
  HIGH_VOLUME_RATE_LIMIT,
  SHORT_BLOCK_DURATION,
  MEDIUM_BLOCK_DURATION,
  LONG_BLOCK_DURATION,
  getClientIdentifier,
  getIPAddress,
  getRateLimitConfig,
  type RateLimitConfig as Config,
} from "./config";

export {
  withRateLimit,
  rateLimit,
  checkRateLimit,
  type NextRequest,
  type NextResponse,
} from "./middleware";
