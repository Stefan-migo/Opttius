/**
 * Redis Module Index
 *
 * Exports all Redis-related functionality for centralized access
 *
 * @module lib/redis
 */

export {
  getRedisClient,
  initializeRedis,
  closeRedis,
  isRedisHealthy,
  getRedisInfo,
  type RedisConfig,
  Redis,
} from "./client";
