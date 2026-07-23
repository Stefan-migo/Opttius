/**
 * Security Monitoring — Utility helpers.
 *
 * Standalone helper functions extracted from SecurityMonitor.
 *
 * @module lib/security/monitoring/helpers
 */

import { appLogger as logger } from "@/lib/logger";

import { SecurityEvent } from "../events";

/**
 * Log security event to application logger
 */
export function logToAppLogger(event: SecurityEvent): void {
  const logData = {
    securityEvent: {
      id: event.id,
      type: event.eventType,
      severity: event.severity,
      source: event.source,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      correlationId: event.correlationId,
      requestId: event.requestId,
      organizationId: event.organizationId,
      details: event.details,
    },
  };

  switch (event.severity) {
    case "critical":
      logger.error(`SECURITY CRITICAL: ${event.eventType}`, logData);
      break;
    case "high":
      logger.warn(`SECURITY HIGH: ${event.eventType}`, logData);
      break;
    case "medium":
      logger.info(`SECURITY MEDIUM: ${event.eventType}`, logData);
      break;
    case "low":
      logger.debug(`SECURITY LOW: ${event.eventType}`, logData);
      break;
  }
}

/**
 * Check for events that require immediate alerts
 */
export function checkImmediateAlerts(event: SecurityEvent): void {
  if (event.severity === "critical") {
    triggerImmediateAlert(event);
    return;
  }

  if (
    event.eventType === "auth.login_failure" &&
    (event.details?.attemptCount as number) > 5
  ) {
    triggerImmediateAlert(event, "Multiple failed login attempts detected");
    return;
  }

  if (event.eventType === "rate_limit.ip_blocked") {
    triggerImmediateAlert(event, "IP address blocked due to rate limiting");
    return;
  }

  if (event.eventType === "payment.fraud_suspected") {
    triggerImmediateAlert(event, "Potential payment fraud detected");
    return;
  }
}

/**
 * Trigger immediate alert for critical events
 */
function triggerImmediateAlert(
  event: SecurityEvent,
  customMessage?: string,
): void {
  const message = customMessage || `Security alert: ${event.eventType}`;

  logger.warn(`IMMEDIATE SECURITY ALERT: ${message}`, {
    eventId: event.id,
    eventType: event.eventType,
    severity: event.severity,
    userId: event.userId,
    ipAddress: event.ipAddress,
  });
}
