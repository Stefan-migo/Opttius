/**
 * Security Monitoring System
 *
 * Centralized security event collection, classification, and monitoring system.
 * Provides structured logging of security events with automatic severity classification
 * and integration with existing application logging.
 *
 * @module lib/security/monitoring
 */

import { appLogger as logger } from "@/lib/logger";

import {
  DEFAULT_SECURITY_CONFIG,
  generateSecurityEventId,
  getSeverityForEventType,
  SecurityEvent,
  SecurityEventType,
  SecurityMonitoringConfig,
  SecuritySeverity,
} from "../events";
import { checkImmediateAlerts, logToAppLogger } from "./helpers";

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
   */
  logEvent(
    eventType: SecurityEventType,
    details: Record<string, unknown> = {},
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

    this.eventBuffer.push(event);
    logToAppLogger(event);
    checkImmediateAlerts(event);

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
    return this.logEvent(eventType, details, { ...options, source: "auth" });
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
      | "payment.signature_invalid"
      | "payment.amount_anomaly"
      | "payment.frequency_anomaly",
    details: {
      gateway?: string;
      transactionId?: string;
      amount?: number;
      currency?: string;
      suspicionReason?: string;
      expectedSignature?: string;
      receivedSignature?: string;
    } & Record<string, unknown>,
    options: {
      userId?: string;
      ipAddress?: string;
      requestId?: string;
      severity?: SecuritySeverity;
    } = {},
  ): SecurityEvent {
    return this.logEvent(eventType, details, {
      ...options,
      source: "payments",
      severity: "high",
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
      timeframe?: number;
    },
  ): SecurityEvent[] {
    let events = [...this.eventBuffer].reverse();
    if (filter) {
      if (filter.severity)
        events = events.filter((e) => e.severity === filter.severity);
      if (filter.eventType)
        events = events.filter((e) => e.eventType === filter.eventType);
      if (filter.userId)
        events = events.filter((e) => e.userId === filter.userId);
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
   */
  async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    try {
      logger.debug("Security events flushed", {
        eventCount: this.eventBuffer.length,
        retentionDays: this.config.retentionDays,
      });
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
