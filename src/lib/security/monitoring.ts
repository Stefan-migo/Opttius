import { appLogger as logger } from "@/lib/logger";
import {
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
  generateSecurityEventId,
  getSeverityForEventType,
  SecurityMonitoringConfig,
  DEFAULT_SECURITY_CONFIG,
} from "./events";

/**
 * Security Monitoring System
 *
 * Centralized security event collection, classification, and monitoring system.
 * Provides structured logging of security events with automatic severity classification
 * and integration with existing application logging.
 *
 * @module lib/security/monitoring
 */

export class SecurityMonitor {
  private config: SecurityMonitoringConfig;
  private eventBuffer: SecurityEvent[] = [];
  private readonly BUFFER_FLUSH_INTERVAL = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<SecurityMonitoringConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    this.startBufferFlushProcess();
  }

  /**
   * Log a security event
   *
   * @param eventType - Type of security event
   * @param details - Event details and context
   * @param options - Additional event options
   */
  logEvent(
    eventType: SecurityEventType,
    details: Record<string, any> = {},
    options: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      source?: string;
      severity?: SecuritySeverity;
      correlationId?: string;
      requestId?: string;
      organizationId?: string;
    } = {},
  ): SecurityEvent {
    const event: SecurityEvent = {
      id: generateSecurityEventId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity: options.severity || getSeverityForEventType(eventType),
      source: options.source || "application",
      userId: options.userId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      details,
      correlationId: options.correlationId,
      requestId: options.requestId,
      organizationId: options.organizationId,
    };

    // Add to buffer for batch processing
    this.eventBuffer.push(event);

    // Log to application logger
    this.logToAppLogger(event);

    // Check for immediate alert conditions
    this.checkImmediateAlerts(event);

    return event;
  }

  /**
   * Log authentication events
   */
  logAuthEvent(
    eventType:
      | "auth.login_attempt"
      | "auth.login_success"
      | "auth.login_failure"
      | "auth.logout"
      | "auth.account_locked",
    details: {
      username?: string;
      failureReason?: string;
      attemptCount?: number;
      sessionId?: string;
      mfaMethod?: string;
    },
    options: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    } = {},
  ): SecurityEvent {
    return this.logEvent(eventType, details, {
      ...options,
      source: "auth",
    });
  }

  /**
   * Log rate limiting events
   */
  logRateLimitEvent(
    eventType:
      | "rate_limit.exceeded"
      | "rate_limit.ip_blocked"
      | "rate_limit.user_blocked",
    details: {
      endpoint?: string;
      requestCount?: number;
      limit?: number;
      windowMs?: number;
      blockDuration?: number;
    },
    options: {
      userId?: string;
      ipAddress?: string;
      requestId?: string;
    } = {},
  ): SecurityEvent {
    return this.logEvent(eventType, details, {
      ...options,
      source: "rate-limiting",
    });
  }

  /**
   * Log payment security events
   */
  logPaymentEvent(
    eventType:
      | "payment.fraud_suspected"
      | "payment.webhook_tampered"
      | "payment.signature_invalid",
    details: {
      gateway?: string;
      transactionId?: string;
      amount?: number;
      currency?: string;
      suspicionReason?: string;
      expectedSignature?: string;
      receivedSignature?: string;
    },
    options: {
      userId?: string;
      ipAddress?: string;
      requestId?: string;
    } = {},
  ): SecurityEvent {
    return this.logEvent(eventType, details, {
      ...options,
      source: "payments",
      severity: "high", // Payment events are typically high severity
    });
  }

  /**
   * Log authorization events
   */
  logAuthzEvent(
    eventType: "authz.access_denied" | "authz.privilege_escalation",
    details: {
      resource?: string;
      action?: string;
      requiredPermission?: string;
      userPermissions?: string[];
    },
    options: {
      userId?: string;
      ipAddress?: string;
      requestId?: string;
    } = {},
  ): SecurityEvent {
    return this.logEvent(eventType, details, {
      ...options,
      source: "authorization",
    });
  }

  /**
   * Log data access events
   */
  logDataEvent(
    eventType: "data.access_sensitive" | "data.unauthorized_access",
    details: {
      resource?: string;
      query?: string;
      dataSize?: number;
      accessType?: string;
    },
    options: {
      userId?: string;
      ipAddress?: string;
      requestId?: string;
      organizationId?: string;
    } = {},
  ): SecurityEvent {
    return this.logEvent(eventType, details, {
      ...options,
      source: "data-access",
    });
  }

  /**
   * Get recent security events
   */
  getRecentEvents(
    limit: number = 100,
    filter?: {
      severity?: SecuritySeverity;
      eventType?: SecurityEventType;
      userId?: string;
      timeframe?: number; // milliseconds
    },
  ): SecurityEvent[] {
    let events = [...this.eventBuffer].reverse(); // Most recent first

    if (filter) {
      if (filter.severity) {
        events = events.filter((e) => e.severity === filter.severity);
      }
      if (filter.eventType) {
        events = events.filter((e) => e.eventType === filter.eventType);
      }
      if (filter.userId) {
        events = events.filter((e) => e.userId === filter.userId);
      }
      if (filter.timeframe) {
        const cutoffTime = Date.now() - filter.timeframe;
        events = events.filter(
          (e) => new Date(e.timestamp).getTime() > cutoffTime,
        );
      }
    }

    return events.slice(0, limit);
  }

  /**
   * Get security statistics
   */
  getStatistics(timeframe: number = 24 * 60 * 60 * 1000): {
    totalEvents: number;
    eventsBySeverity: Record<SecuritySeverity, number>;
    eventsByType: Record<SecurityEventType, number>;
    uniqueUsers: number;
    uniqueIPs: number;
  } {
    const cutoffTime = Date.now() - timeframe;
    const recentEvents = this.eventBuffer.filter(
      (e) => new Date(e.timestamp).getTime() > cutoffTime,
    );

    const stats = {
      totalEvents: recentEvents.length,
      eventsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      } as Record<SecuritySeverity, number>,
      eventsByType: {} as Record<SecurityEventType, number>,
      uniqueUsers: new Set(recentEvents.map((e) => e.userId).filter(Boolean))
        .size,
      uniqueIPs: new Set(recentEvents.map((e) => e.ipAddress).filter(Boolean))
        .size,
    };

    for (const event of recentEvents) {
      stats.eventsBySeverity[event.severity]++;
      stats.eventsByType[event.eventType] =
        (stats.eventsByType[event.eventType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Flush event buffer to persistent storage
   * In production, this would save to database or external logging system
   */
  async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      // In a real implementation, this would:
      // 1. Save events to database
      // 2. Send to external logging system (ELK, Splunk, etc.)
      // 3. Archive old events based on retention policy

      logger.debug("Security events flushed", {
        eventCount: this.eventBuffer.length,
        retentionDays: this.config.retentionDays,
      });

      // Clear buffer after successful flush
      this.eventBuffer = [];
    } catch (error) {
      logger.error("Failed to flush security events", error);
    }
  }

  /**
   * Clean up old events based on retention policy
   */
  cleanupOldEvents(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    const cutoffTimestamp = cutoffDate.getTime();

    const initialLength = this.eventBuffer.length;
    this.eventBuffer = this.eventBuffer.filter(
      (event) => new Date(event.timestamp).getTime() > cutoffTimestamp,
    );

    if (initialLength > this.eventBuffer.length) {
      logger.info("Cleaned up old security events", {
        removedCount: initialLength - this.eventBuffer.length,
        retentionDays: this.config.retentionDays,
      });
    }
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<SecurityMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info("Security monitoring configuration updated", newConfig);
  }

  /**
   * Shutdown monitoring system
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushEvents();
    logger.info("Security monitoring system shut down");
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Log security event to application logger
   */
  private logToAppLogger(event: SecurityEvent): void {
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
  private checkImmediateAlerts(event: SecurityEvent): void {
    // Critical events always trigger immediate attention
    if (event.severity === "critical") {
      this.triggerImmediateAlert(event);
      return;
    }

    // High severity authentication failures
    if (
      event.eventType === "auth.login_failure" &&
      event.details.attemptCount > 5
    ) {
      this.triggerImmediateAlert(
        event,
        "Multiple failed login attempts detected",
      );
      return;
    }

    // Rate limit blocking
    if (event.eventType === "rate_limit.ip_blocked") {
      this.triggerImmediateAlert(
        event,
        "IP address blocked due to rate limiting",
      );
      return;
    }

    // Payment fraud
    if (event.eventType === "payment.fraud_suspected") {
      this.triggerImmediateAlert(event, "Potential payment fraud detected");
      return;
    }
  }

  /**
   * Trigger immediate alert for critical events
   */
  private triggerImmediateAlert(
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

    // In a real implementation, this would:
    // 1. Send to alerting system
    // 2. Notify security team
    // 3. Trigger incident response procedures
  }

  /**
   * Start automatic buffer flushing process
   */
  private startBufferFlushProcess(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents().catch((err) => {
        logger.error("Error during security event flush", err);
      });

      this.cleanupOldEvents();
    }, this.BUFFER_FLUSH_INTERVAL);
  }
}

// Export singleton instance
let securityMonitor: SecurityMonitor | null = null;

export function getSecurityMonitor(): SecurityMonitor {
  if (!securityMonitor) {
    securityMonitor = new SecurityMonitor();
  }
  return securityMonitor;
}

// Export types
export type { SecurityMonitor };
