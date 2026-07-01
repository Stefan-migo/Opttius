/**
 * Unified Rate Limiting Module
 *
 * Single `withRateLimit()` that tries Redis first with a cached health check,
 * then falls back to an in-memory Map when Redis is unavailable.
 *
 * @module lib/rate-limiting
 */

import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis/client";

import {
  AUTH_RATE_LIMIT,
  GENERAL_RATE_LIMIT,
  getIPAddress,
  HIGH_VOLUME_RATE_LIMIT,
  PAYMENT_RATE_LIMIT,
  PUBLIC_RATE_LIMIT,
  type RateLimitConfig,
  SEARCH_RATE_LIMIT,
} from "./config";
import { getRateLimiter } from "./redis-rate-limiter";

// Re-export the configs under the old name so existing route imports work
export const rateLimitConfigs: Record<
  string,
  { windowMs: number; maxRequests: number; [key: string]: unknown }
> = {
  general: {
    windowMs: GENERAL_RATE_LIMIT.windowMs,
    maxRequests: GENERAL_RATE_LIMIT.limit,
  },
  auth: {
    windowMs: AUTH_RATE_LIMIT.windowMs,
    maxRequests: AUTH_RATE_LIMIT.limit,
  },
  payment: {
    windowMs: PAYMENT_RATE_LIMIT.windowMs,
    maxRequests: PAYMENT_RATE_LIMIT.limit,
  },
  search: {
    windowMs: SEARCH_RATE_LIMIT.windowMs,
    maxRequests: SEARCH_RATE_LIMIT.limit,
  },
  public: {
    windowMs: PUBLIC_RATE_LIMIT.windowMs,
    maxRequests: PUBLIC_RATE_LIMIT.limit,
  },
  "high-volume": {
    windowMs: HIGH_VOLUME_RATE_LIMIT.windowMs,
    maxRequests: HIGH_VOLUME_RATE_LIMIT.limit,
  },
  // Extra keys used by existing route files
  modification: { windowMs: 60_000, maxRequests: 50 },
  pos: { windowMs: 5 * 60_000, maxRequests: 20 },
  agreements: { windowMs: 60_000, maxRequests: 30 },
  contact: { windowMs: 3_600_000, maxRequests: 3 },
};

// ── In-memory fallback store ────────────────────────────────────
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

// ── Cached Redis health ─────────────────────────────────────────
// ponytail: simple cached boolean, no circuit-breaker pattern
let redisAvailable: boolean | null = null;
let lastRedisCheck = 0;
const REDIS_CHECK_TTL = 30_000;

async function checkRedisAvailable(): Promise<boolean> {
  const now = Date.now();
  if (redisAvailable !== null && now - lastRedisCheck < REDIS_CHECK_TTL) {
    return redisAvailable;
  }

  try {
    const client = getRedisClient();
    await client.ping();
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }

  lastRedisCheck = Date.now();
  return redisAvailable;
}

/** @internal exposed for testing only */
export function __resetRedisHealth(): void {
  redisAvailable = null;
  lastRedisCheck = 0;
  inMemoryStore.clear();
}

// ── Helpers ─────────────────────────────────────────────────────
function build429Response(limit: number, windowMs: number): NextResponse {
  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": Math.ceil(windowMs / 1000).toString(),
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

/**
 * Resolve the effective limit from a config.
 * Accepts both the new `RateLimitConfig` shape (`.limit`)
 * and legacy configs (`.maxRequests`).
 */
function resolveLimit(config: Record<string, unknown>): number {
  return (config.maxRequests as number) ?? (config.limit as number) ?? 100;
}

// ── withRateLimit ──────────────────────────────────────────────

/**
 * Unified rate-limiting wrapper.
 *
 * Usage (current — config-first):
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return withRateLimit(rateLimitConfigs.general)(request, async () => {
 *     return NextResponse.json({ ok: true });
 *   });
 * }
 * ```
 */
export function withRateLimit(
  config: Record<string, unknown>,
): (
  request: NextRequest,
  handler: () => Promise<NextResponse>,
) => Promise<NextResponse> {
  return async (request, handler) => {
    // Skip rate limiting for health checks
    if (isHealthCheck(request)) {
      return handler();
    }

    // Determine the effective limit
    const limit = resolveLimit(config);

    // Determine identifier: org header > IP
    const orgId = request.headers.get("x-organization-id");
    const ip = getIPAddress(request as unknown as Request);
    const identifier = orgId || ip;
    const windowMs = (config.windowMs as number) ?? 60_000;
    const keyPrefix = (config.keyPrefix as string) || "rl";
    const key = `${keyPrefix}:${identifier}`;

    // ── Try Redis path ──────────────────────────────────────────
    try {
      if (await checkRedisAvailable()) {
        const redisConfig: RateLimitConfig = {
          limit,
          windowMs,
          keyPrefix,
        };

        const rateLimiter = getRateLimiter();
        const result = await rateLimiter.isRateLimited(key, redisConfig);

        if (result.limited) {
          logger.warn("Rate limit exceeded (Redis)", { identifier, limit });
          return build429Response(limit, windowMs);
        }

        const response = await handler();
        response.headers.set("X-RateLimit-Limit", limit.toString());
        response.headers.set(
          "X-RateLimit-Remaining",
          result.remaining.toString(),
        );
        response.headers.set(
          "X-RateLimit-Reset",
          Math.floor(result.resetTime / 1000).toString(),
        );
        return response;
      }
    } catch (error) {
      // Fail-open on infrastructure: Redis threw mid-flight
      logger.error(
        "Redis rate-limiter error, falling back to in-memory",
        error,
      );
    }

    // ── In-memory fallback ──────────────────────────────────────
    const now = Date.now();

    // Clean stale entries once in a while
    for (const [k, v] of inMemoryStore.entries()) {
      if (v.resetTime < now) inMemoryStore.delete(k);
    }

    const current = inMemoryStore.get(key);

    if (!current || current.resetTime < now) {
      // Fresh window
      inMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
    } else if (current.count >= limit) {
      logger.warn("Rate limit exceeded (in-memory)", { identifier, limit });
      return build429Response(limit, windowMs);
    } else {
      current.count++;
    }

    const response = await handler();
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      Math.max(0, limit - (inMemoryStore.get(key)?.count ?? 1)).toString(),
    );
    return response;
  };
}

// ── Health check ────────────────────────────────────────────────
function isHealthCheck(request: NextRequest): boolean {
  const pathname = request.nextUrl?.pathname ?? "";
  return pathname === "/api/health" || pathname === "/health";
}

// ── Backward-compatible re-exports ──────────────────────────────
export {
  getClientIdentifier,
  getIPAddress,
  getRateLimitConfig,
  LONG_BLOCK_DURATION,
  MEDIUM_BLOCK_DURATION,
  SHORT_BLOCK_DURATION,
} from "./config";
export { checkRateLimit, rateLimit } from "./middleware";
export {
  type BlockConfig,
  type RateLimitResult,
  RedisRateLimiter,
} from "./redis-rate-limiter";
export type { NextRequest, NextResponse } from "./types";
