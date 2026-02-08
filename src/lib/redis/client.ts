import Redis from "ioredis";
import { appLogger as logger } from "@/lib/logger";

/**
 * Redis Client Factory and Connection Management
 *
 * Provides centralized Redis connection management with:
 * - Connection pooling
 * - Automatic reconnection
 * - Graceful error handling
 * - Health checking
 *
 * @module lib/redis/client
 */

// Redis connection configuration
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  connectTimeout?: number;
  retryDelay?: number;
  maxRetriesPerRequest?: number | null;
}

// Singleton Redis client instance
let redisClient: Redis | null = null;

/**
 * Get Redis configuration from environment variables
 */
function getRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // Parse Redis URL (redis://[:password@]host[:port][/db])
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      db: url.pathname ? parseInt(url.pathname.slice(1)) || 0 : 0,
      tls: url.protocol === "rediss:",
      connectTimeout: 10000,
      retryDelay: 2000,
      maxRetriesPerRequest: null,
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0"),
    tls: process.env.REDIS_TLS_ENABLED === "true",
    connectTimeout: 10000,
    retryDelay: 2000,
    maxRetriesPerRequest: null,
  };
}

/**
 * Create Redis client instance with proper configuration
 */
function createRedisClient(): Redis {
  const config = getRedisConfig();

  logger.info("Creating Redis client", {
    host: config.host,
    port: config.port,
    db: config.db,
    tls: config.tls,
  });

  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    tls: config.tls ? {} : undefined,
    connectTimeout: config.connectTimeout,
    retryDelayOnFailover: config.retryDelay,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    lazyConnect: true,
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        // Only reconnect when the error contains "READONLY"
        return true;
      }
      return false;
    },
    // Connection event handlers
    retryStrategy: (times) => {
      logger.warn(`Redis connection retry attempt ${times}`);

      if (times > 10) {
        logger.error("Redis max retry attempts reached");
        return null; // Stop retrying
      }

      // Exponential backoff
      return Math.min(times * 100, 3000);
    },
  });

  // Event listeners
  client.on("connect", () => {
    logger.info("Redis client connected");
  });

  client.on("ready", () => {
    logger.info("Redis client ready");
  });

  client.on("error", (err) => {
    logger.error("Redis client error", err);
  });

  client.on("close", () => {
    logger.warn("Redis client connection closed");
  });

  client.on("reconnecting", () => {
    logger.info("Redis client reconnecting");
  });

  return client;
}

/**
 * Get singleton Redis client instance
 * Creates new instance if one doesn't exist
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Initialize Redis connection
 * Should be called during application startup
 */
export async function initializeRedis(): Promise<void> {
  try {
    const client = getRedisClient();
    await client.connect();
    logger.info("Redis initialized successfully");

    // Test connection
    await client.ping();
    logger.debug("Redis connection test successful");
  } catch (error) {
    logger.error("Failed to initialize Redis", error);
    throw error;
  }
}

/**
 * Close Redis connection gracefully
 * Should be called during application shutdown
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info("Redis connection closed");
    } catch (error) {
      logger.error("Error closing Redis connection", error);
    } finally {
      redisClient = null;
    }
  }
}

/**
 * Check if Redis is connected and responsive
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === "PONG";
  } catch (error) {
    logger.error("Redis health check failed", error);
    return false;
  }
}

/**
 * Get Redis connection info for monitoring
 */
export async function getRedisInfo(): Promise<Record<string, string>> {
  try {
    const client = getRedisClient();
    const info = await client.info();

    // Parse Redis INFO response
    const infoObj: Record<string, string> = {};
    info.split("\n").forEach((line) => {
      if (line && !line.startsWith("#")) {
        const [key, value] = line.split(":");
        if (key && value) {
          infoObj[key.trim()] = value.trim();
        }
      }
    });

    return infoObj;
  } catch (error) {
    logger.error("Failed to get Redis info", error);
    return {};
  }
}

// Export types
export type { RedisConfig };
export { Redis };
