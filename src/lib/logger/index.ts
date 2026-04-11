import pino from "pino";

/**
 * Logger configuration
 * Uses pino for structured logging
 *
 * Note: pino-pretty is NOT used because it uses worker threads that conflict with Next.js
 * In development: Simple JSON format (can be piped to pino-pretty manually if needed)
 * In production: JSON format for log aggregation
 */

const isDevelopment = process.env.NODE_ENV === "development";

// Create logger instance
// pino-pretty is disabled because it causes "worker has exited" errors in Next.js
// The logs will be in JSON format, which is still readable and works perfectly
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // No transport - pino-pretty causes worker thread issues in Next.js
  // Logs will be in JSON format which is fine for development and production
});

/**
 * Logger interface for application-wide use
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *
 *   logger.debug('Debug message', { data })
 *   logger.info('Info message', { data })
 *   logger.warn('Warning message', { data })
 *   logger.error('Error message', { error, data })
 */
export const appLogger = {
  /**
   * Debug level - detailed information for debugging
   * Only shown in development
   */
  debug: (message: string, data?: unknown) => {
    if (data) {
      logger.debug(data, message);
    } else {
      logger.debug(message);
    }
  },

  /**
   * Info level - general informational messages
   */
  info: (message: string, data?: unknown) => {
    if (data) {
      logger.info(data, message);
    } else {
      logger.info(message);
    }
  },

  /**
   * Warn level - warning messages
   */
  warn: (message: string, data?: unknown) => {
    if (data) {
      logger.warn(data, message);
    } else {
      logger.warn(message);
    }
  },

  /**
   * Error level - error messages
   * Accepts Error objects or plain messages
   */
  error: (message: string, errorOrData?: unknown, data?: unknown) => {
    // Handle case where error is passed as second argument
    const error = errorOrData instanceof Error ? errorOrData : undefined;
    const errorData = errorOrData instanceof Error ? data : errorOrData;
    if (error instanceof Error) {
      logger.error(
        {
          err: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          ...data,
        },
        message,
      );
    } else if (error) {
      const errorObj = typeof error === "object" && error !== null ? error : {};
      logger.error({ ...errorObj, ...(data || {}) }, message);
    } else if (data) {
      logger.error(data, message);
    } else {
      logger.error(message);
    }
  },
};

// Export default logger for convenience
export default appLogger;

// Export pino logger for advanced use cases
export { logger };
