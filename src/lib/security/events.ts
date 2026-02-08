/**
 * Security Event Types and Schemas
 *
 * Defines the structure and types for all security-related events
 * in the Opttius SaaS platform. These events are used for monitoring,
 * alerting, and security analytics.
 *
 * @module lib/security/events
 */

// ============================================================================
// SECURITY EVENT TYPES
// ============================================================================

/**
 * Security event severity levels
 */
export type SecuritySeverity = "low" | "medium" | "high" | "critical";

/**
 * Types of security events that can be monitored
 */
export type SecurityEventType =
  // Authentication events
  | "auth.login_attempt"
  | "auth.login_success"
  | "auth.login_failure"
  | "auth.logout"
  | "auth.session_expired"
  | "auth.password_reset"
  | "auth.account_locked"
  | "auth.mfa_required"
  | "auth.mfa_failed"

  // Authorization events
  | "authz.access_denied"
  | "authz.privilege_escalation"
  | "authz.role_changed"
  | "authz.permission_granted"
  | "authz.permission_revoked"

  // Data access events
  | "data.access_sensitive"
  | "data.export_initiated"
  | "data.unauthorized_access"
  | "data.query_pattern_suspicious"

  // Rate limiting events
  | "rate_limit.exceeded"
  | "rate_limit.ip_blocked"
  | "rate_limit.user_blocked"
  | "rate_limit.auto_unblocked"

  // Payment security events
  | "payment.fraud_suspected"
  | "payment.webhook_tampered"
  | "payment.signature_invalid"
  | "payment.amount_anomaly"
  | "payment.frequency_anomaly"

  // System security events
  | "system.config_changed"
  | "system.admin_action"
  | "system.suspicious_activity"
  | "system.malware_detected"
  | "system.vulnerability_found"

  // Network security events
  | "network.suspicious_ip"
  | "network.brute_force_attempt"
  | "network.port_scan_detected"
  | "network.ddos_attempt"

  // Behavioral analytics events
  | "behavior.user_anomaly"
  | "behavior.pattern_deviation"
  | "behavior.risk_threshold_exceeded";

/**
 * Base security event interface
 */
export interface SecurityEvent {
  /** Unique identifier for the event */
  id: string;

  /** ISO timestamp when the event occurred */
  timestamp: string;

  /** Type of security event */
  eventType: SecurityEventType;

  /** Severity level of the event */
  severity: SecuritySeverity;

  /** Source/component where the event originated */
  source: string;

  /** User ID associated with the event (if applicable) */
  userId?: string;

  /** IP address of the client */
  ipAddress?: string;

  /** User agent string */
  userAgent?: string;

  /** Additional event details */
  details: Record<string, any>;

  /** Correlation ID for linking related events */
  correlationId?: string;

  /** Request ID for tracing */
  requestId?: string;

  /** Organization ID for multi-tenant context */
  organizationId?: string;
}

/**
 * Authentication-related security events
 */
export interface AuthSecurityEvent extends SecurityEvent {
  eventType:
    | "auth.login_attempt"
    | "auth.login_success"
    | "auth.login_failure"
    | "auth.logout"
    | "auth.session_expired"
    | "auth.password_reset"
    | "auth.account_locked"
    | "auth.mfa_required"
    | "auth.mfa_failed";

  details: {
    /** Username or email used for authentication */
    username?: string;

    /** Reason for failure (for failed events) */
    failureReason?: string;

    /** Number of failed attempts */
    attemptCount?: number;

    /** Session ID */
    sessionId?: string;

    /** MFA method used */
    mfaMethod?: string;
  } & SecurityEvent["details"];
}

/**
 * Rate limiting security events
 */
export interface RateLimitSecurityEvent extends SecurityEvent {
  eventType:
    | "rate_limit.exceeded"
    | "rate_limit.ip_blocked"
    | "rate_limit.user_blocked"
    | "rate_limit.auto_unblocked";

  details: {
    /** Endpoint that was rate limited */
    endpoint?: string;

    /** Current request count */
    requestCount?: number;

    /** Configured limit */
    limit?: number;

    /** Time window in milliseconds */
    windowMs?: number;

    /** Block duration in milliseconds */
    blockDuration?: number;
  } & SecurityEvent["details"];
}

/**
 * Payment security events
 */
export interface PaymentSecurityEvent extends SecurityEvent {
  eventType:
    | "payment.fraud_suspected"
    | "payment.webhook_tampered"
    | "payment.signature_invalid"
    | "payment.amount_anomaly"
    | "payment.frequency_anomaly";

  details: {
    /** Payment gateway involved */
    gateway?: string;

    /** Transaction ID */
    transactionId?: string;

    /** Amount involved */
    amount?: number;

    /** Currency */
    currency?: string;

    /** Reason for suspicion */
    suspicionReason?: string;

    /** Expected signature */
    expectedSignature?: string;

    /** Received signature */
    receivedSignature?: string;
  } & SecurityEvent["details"];
}

// ============================================================================
// ALERT CONFIGURATION
// ============================================================================

/**
 * Alert channel types
 */
export type AlertChannelType =
  | "email"
  | "slack"
  | "pagerduty"
  | "webhook"
  | "discord";

/**
 * Configuration for alert channels
 */
export interface AlertChannel {
  /** Unique identifier for the channel */
  id: string;

  /** Type of alert channel */
  type: AlertChannelType;

  /** Minimum severity level to trigger alerts */
  severityThreshold: SecuritySeverity;

  /** Whether the channel is enabled */
  enabled: boolean;

  /** Channel-specific configuration */
  config: Record<string, any>;

  /** Human-readable name for the channel */
  name: string;

  /** Description of the channel purpose */
  description?: string;
}

/**
 * Email alert configuration
 */
export interface EmailAlertConfig {
  /** Recipient email addresses */
  recipients: string[];

  /** SMTP server configuration */
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

/**
 * Slack alert configuration
 */
export interface SlackAlertConfig {
  /** Slack webhook URL */
  webhookUrl: string;

  /** Channel to post alerts to */
  channel?: string;

  /** Username for the bot */
  username?: string;

  /** Emoji icon for the bot */
  iconEmoji?: string;
}

/**
 * PagerDuty alert configuration
 */
export interface PagerDutyAlertConfig {
  /** PagerDuty integration key */
  integrationKey: string;

  /** Service name */
  serviceName?: string;
}

/**
 * Webhook alert configuration
 */
export interface WebhookAlertConfig {
  /** Webhook URL */
  url: string;

  /** HTTP method */
  method: "POST" | "PUT";

  /** Additional headers */
  headers?: Record<string, string>;
}

// ============================================================================
// ALERT DEFINITIONS
// ============================================================================

/**
 * Security alert interface
 */
export interface SecurityAlert {
  /** Unique alert identifier */
  id: string;

  /** Alert title */
  title: string;

  /** Alert description */
  description: string;

  /** Severity level */
  severity: SecuritySeverity;

  /** Timestamp when alert was created */
  timestamp: string;

  /** Related security events */
  relatedEvents: SecurityEvent[];

  /** Recommended actions */
  recommendedActions: string[];

  /** Alert status */
  status: "active" | "acknowledged" | "resolved" | "dismissed";

  /** Who acknowledged the alert */
  acknowledgedBy?: string;

  /** When the alert was acknowledged */
  acknowledgedAt?: string;

  /** Resolution notes */
  resolutionNotes?: string;
}

// ============================================================================
// MONITORING CONFIGURATION
// ============================================================================

/**
 * Security monitoring configuration
 */
export interface SecurityMonitoringConfig {
  /** Whether security monitoring is enabled */
  enabled: boolean;

  /** Event retention period in days */
  retentionDays: number;

  /** Alert deduplication settings */
  deduplication: {
    /** Time window for deduplication in milliseconds */
    windowMs: number;

    /** Fields to consider for deduplication */
    keyFields: string[];
  };

  /** Rate limiting for alerts */
  alertRateLimit: {
    /** Maximum alerts per time window */
    maxAlerts: number;

    /** Time window in milliseconds */
    windowMs: number;
  };

  /** Correlation settings */
  correlation: {
    /** Enable event correlation */
    enabled: boolean;

    /** Correlation time window in milliseconds */
    windowMs: number;
  };
}

/**
 * Default security monitoring configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityMonitoringConfig = {
  enabled: true,
  retentionDays: 90,
  deduplication: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyFields: ["eventType", "userId", "ipAddress"],
  },
  alertRateLimit: {
    maxAlerts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  correlation: {
    enabled: true,
    windowMs: 30 * 60 * 1000, // 30 minutes
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique security event ID
 */
export function generateSecurityEventId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique alert ID
 */
export function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get severity level from event type
 */
export function getSeverityForEventType(
  eventType: SecurityEventType,
): SecuritySeverity {
  const criticalEvents: SecurityEventType[] = [
    "auth.account_locked",
    "payment.fraud_suspected",
    "payment.webhook_tampered",
    "system.malware_detected",
    "system.vulnerability_found",
  ];

  const highEvents: SecurityEventType[] = [
    "auth.login_failure",
    "authz.access_denied",
    "authz.privilege_escalation",
    "data.unauthorized_access",
    "rate_limit.ip_blocked",
    "payment.signature_invalid",
  ];

  const mediumEvents: SecurityEventType[] = [
    "auth.mfa_failed",
    "rate_limit.exceeded",
    "payment.amount_anomaly",
    "network.suspicious_ip",
  ];

  if (criticalEvents.includes(eventType)) return "critical";
  if (highEvents.includes(eventType)) return "high";
  if (mediumEvents.includes(eventType)) return "medium";
  return "low";
}

// Export all types and interfaces
export type {
  SecuritySeverity,
  SecurityEventType,
  SecurityEvent,
  AuthSecurityEvent,
  RateLimitSecurityEvent,
  PaymentSecurityEvent,
  AlertChannelType,
  AlertChannel,
  EmailAlertConfig,
  SlackAlertConfig,
  PagerDutyAlertConfig,
  WebhookAlertConfig,
  SecurityAlert,
  SecurityMonitoringConfig,
};
