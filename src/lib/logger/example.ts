/**
 * Example usage of the logger
 * This file demonstrates how to use the logger in different scenarios
 */

import { logger } from "./index";

// Example 1: Simple info log
export function logUserLogin(userId: string) {
  logger.info(
    { userId, timestamp: new Date().toISOString() },
    "User logged in",
  );
}

// Example 2: Debug log (only in development)
export function logDebugInfo(data: unknown) {
  logger.debug("Debug information", data);
}

// Example 3: Warning log
export function logLowStock(productId: string, currentStock: number) {
  logger.warn({ productId, currentStock, threshold: 10 }, "Low stock warning");
}

// Example 4: Error log with Error object
export function logError(message: string, error: Error, context?: unknown) {
  logger.error(message, error as unknown, context);
}

// Example 5: Error log with plain object
export function logApiError(message: string, errorData: unknown) {
  logger.error(message, errorData, undefined);
}
