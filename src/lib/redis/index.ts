/**
 * Redis Module Index
 *
 * Exports all Redis-related functionality for centralized access
 *
 * @module lib/redis
 */

export {
  closeRedis,
  getRedisClient,
  getRedisInfo,
  initializeRedis,
  isRedisHealthy,
  Redis,
  type RedisConfig,
} from "./client";
