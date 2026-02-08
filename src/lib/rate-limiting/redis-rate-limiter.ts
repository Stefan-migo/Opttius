import { Redis } from "ioredis";
import { getRedisClient } from "@/lib/redis";
import { appLogger as logger } from "@/lib/logger";

/**
 * Redis-based Rate Limiter Implementation
 *
 * Provides production-ready rate limiting with:
 * - Sliding window algorithm
 * - IP-based client identification
 * - Configurable rate limits
 * - Automatic cleanup of expired keys
 * - Graceful fallback for Redis connectivity issues
 *
 * @module lib/rate-limiting/redis-rate-limiter
 */

// Rate limiting configuration
export interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional custom key prefix */
  keyPrefix?: string;
  /** Whether to skip counting successful requests */
  skipSuccessfulRequests?: boolean;
  /** Whether to skip counting failed requests */
  skipFailedRequests?: boolean;
}

// Rate limiting result
export interface RateLimitResult {
  /** Whether the request is rate limited */
  limited: boolean;
  /** Number of requests remaining in current window */
  remaining: number;
  /** Unix timestamp when limit resets */
  resetTime: number;
  /** Total requests made in current window */
  current: number;
}

// IP blocking configuration
export interface BlockConfig {
  /** Duration to block IP in milliseconds */
  durationMs: number;
  /** Reason for blocking */
  reason?: string;
}

/**
 * Redis-based Rate Limiter Class
 *
 * Implements sliding window rate limiting using Redis for production scalability.
 * Provides automatic cleanup and graceful degradation.
 */
export class RedisRateLimiter {
  private redis: Redis;
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(redis?: Redis) {
    this.redis = redis || getRedisClient();
    this.startCleanupProcess();
  }

  /**
   * Check if a client is rate limited
   */
  async isRateLimited(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    try {
      const fullKey = this.getKey(config.keyPrefix, key);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Clean up old entries in the sorted set
      await this.redis.zremrangebyscore(fullKey, 0, windowStart);

      // Add current request timestamp
      await this.redis.zadd(fullKey, now.toString(), now.toString());

      // Set expiration for automatic cleanup
      await this.redis.pexpire(fullKey, config.windowMs);

      // Get current count and remaining requests
      const current = await this.redis.zcard(fullKey);
      const remaining = Math.max(0, config.limit - current);

      return {
        limited: current > config.limit,
        remaining,
        resetTime: now + config.windowMs,
        current,
      };
    } catch (error) {
      logger.error("Rate limiting check failed", error);

      // Graceful fallback - allow request through
      return {
        limited: false,
        remaining: config.limit,
        resetTime: Date.now() + config.windowMs,
        current: 0,
      };
    }
  }

  /**
   * Block an IP address
   */
  async blockIP(ip: string, config: BlockConfig): Promise<void> {
    try {
      const key = `blocked:${ip}`;
      const value = config.reason || "Rate limit exceeded";

      await this.redis.setex(key, Math.floor(config.durationMs / 1000), value);
      logger.warn("IP blocked", {
        ip,
        duration: config.durationMs,
        reason: config.reason,
      });
    } catch (error) {
      logger.error("Failed to block IP", error);
    }
  }

  /**
   * Check if an IP is blocked
   */
  async isIPBlocked(ip: string): Promise<boolean> {
    try {
      const key = `blocked:${ip}`;
      const result = await this.redis.get(key);
      return result !== null;
    } catch (error) {
      logger.error("Failed to check IP block status", error);
      return false;
    }
  }

  /**
   * Get block information for an IP
   */
  async getBlockInfo(
    ip: string,
  ): Promise<{ blocked: boolean; reason?: string; expires?: number } | null> {
    try {
      const key = `blocked:${ip}`;
      const [reason, ttl] = await Promise.all([
        this.redis.get(key),
        this.redis.ttl(key),
      ]);

      if (reason === null) {
        return null;
      }

      return {
        blocked: true,
        reason,
        expires: ttl > 0 ? Date.now() + ttl * 1000 : undefined,
      };
    } catch (error) {
      logger.error("Failed to get IP block info", error);
      return null;
    }
  }

  /**
   * Unblock an IP address
   */
  async unblockIP(ip: string): Promise<void> {
    try {
      const key = `blocked:${ip}`;
      await this.redis.del(key);
      logger.info("IP unblocked", { ip });
    } catch (error) {
      logger.error("Failed to unblock IP", error);
    }
  }

  /**
   * Get rate limit headers for HTTP responses
   */
  getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
      "X-RateLimit-Limit": result.current.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": Math.floor(result.resetTime / 1000).toString(),
      "Retry-After": result.limited
        ? Math.ceil((result.resetTime - Date.now()) / 1000).toString()
        : "0",
    };
  }

  /**
   * Clean up expired rate limit keys
   * This helps prevent memory buildup in Redis
   */
  private async cleanupExpiredKeys(): Promise<void> {
    try {
      // Find and remove keys that have expired
      const pattern = "rl:*";
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          // No expiration set
          await this.redis.del(key);
        }
      }
    } catch (error) {
      logger.error("Rate limit cleanup failed", error);
    }
  }

  /**
   * Start the automatic cleanup process
   */
  private startCleanupProcess(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredKeys().catch((err) => {
        logger.error("Cleanup process error", err);
      });
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop the cleanup process
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Generate Redis key with optional prefix
   */
  private getKey(prefix: string | undefined, key: string): string {
    return prefix ? `rl:${prefix}:${key}` : `rl:${key}`;
  }
}

// Export singleton instance
let rateLimiter: RedisRateLimiter | null = null;

export function getRateLimiter(): RedisRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RedisRateLimiter();
  }
  return rateLimiter;
}

// Types are already exported via the interface declarations above
