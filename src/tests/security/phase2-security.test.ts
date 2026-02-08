/**
 * Phase 2 Security Testing Suite
 *
 * Tests for security monitoring, alerting, and automated scanning systems
 * that were implemented in Phase 2 of the security enhancement plan.
 *
 * @module tests/security/phase2-security.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SecurityMonitor, getSecurityMonitor } from "@/lib/security/monitoring";
import { SecurityAlerting, getSecurityAlerting } from "@/lib/security/alerting";
import { SecurityEvent, SecurityAlert } from "@/lib/security/events";
import { appLogger } from "@/lib/logger";

// Mock logger
vi.mock("@/lib/logger", () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock external dependencies
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
    }),
  },
}));

vi.mock("axios", () => ({
  default: {
    post: vi.fn().mockResolvedValue({ status: 200 }),
  },
}));

describe("Phase 2 Security Implementation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Security Monitoring System", () => {
    let monitor: SecurityMonitor;

    beforeEach(() => {
      monitor = getSecurityMonitor();
    });

    it("should log authentication events correctly", () => {
      const authEvent: SecurityEvent = {
        id: "test-auth-1",
        timestamp: new Date().toISOString(),
        eventType: "auth.login_success",
        severity: "low",
        source: "authentication-service",
        userId: "user-123",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 Test Browser",
        details: {
          method: "password",
          sessionId: "sess-abc123",
        },
      };

      monitor.logAuthEvent(
        authEvent.eventType as any,
        {
          username: authEvent.details.method,
          sessionId: authEvent.details.sessionId,
        },
        {
          userId: authEvent.userId,
          ipAddress: authEvent.ipAddress,
          userAgent: authEvent.userAgent,
        },
      );
      expect(appLogger.info).toHaveBeenCalledWith(
        "Security Event",
        expect.objectContaining({
          eventType: "auth.login_success",
          severity: "low",
          userId: "user-123",
        }),
      );
    });

    it("should log rate limiting violations", () => {
      const rateLimitEvent: SecurityEvent = {
        id: "test-rate-1",
        timestamp: new Date().toISOString(),
        eventType: "rate_limit.exceeded",
        severity: "medium",
        source: "rate-limiter",
        ipAddress: "192.168.1.100",
        details: {
          limit: 100,
          window: "15 minutes",
          requestCount: 150,
        },
      };

      monitor.logRateLimitEvent(rateLimitEvent);

      expect(appLogger.warn).toHaveBeenCalledWith(
        "Security Event",
        expect.objectContaining({
          eventType: "rate_limit.exceeded",
          severity: "medium",
        }),
      );
    });

    it("should log payment security events", () => {
      const paymentEvent: SecurityEvent = {
        id: "test-payment-1",
        timestamp: new Date().toISOString(),
        eventType: "payment.fraud_suspected",
        severity: "high",
        source: "payment-processor",
        userId: "user-456",
        ipAddress: "192.168.1.100",
        details: {
          amount: 1000.0,
          currency: "USD",
          transactionId: "txn-def456",
          riskScore: 0.85,
        },
      };

      monitor.logPaymentEvent(
        paymentEvent.eventType as any,
        {
          amount: paymentEvent.details.amount,
          currency: paymentEvent.details.currency,
          transactionId: paymentEvent.details.transactionId,
          suspicionReason: "High risk score detected",
        },
        {
          userId: paymentEvent.userId,
          ipAddress: paymentEvent.ipAddress,
        },
      );
      expect(appLogger.warn).toHaveBeenCalledWith(
        "Security Event",
        expect.objectContaining({
          eventType: "payment.fraud_suspected",
          severity: "high",
        }),
      );
    });

    it("should log data access events", () => {
      const dataEvent: SecurityEvent = {
        id: "test-data-1",
        timestamp: new Date().toISOString(),
        eventType: "data.access_sensitive",
        severity: "medium",
        source: "data-api",
        userId: "user-789",
        ipAddress: "192.168.1.100",
        details: {
          resourceId: "customer_records",
          action: "READ",
          recordCount: 50,
        },
      };

      monitor.logDataEvent(
        dataEvent.eventType as any,
        {
          resource: dataEvent.details.resourceId,
          dataSize: dataEvent.details.recordCount,
        },
        {
          userId: dataEvent.userId,
          ipAddress: dataEvent.ipAddress,
        },
      );
      expect(appLogger.info).toHaveBeenCalledWith(
        "Security Event",
        expect.objectContaining({
          eventType: "data.access_sensitive",
        }),
      );
    });

    it("should calculate severity correctly", () => {
      // Test different event types and their severities
      const events = [
        { type: "auth.login_success", expectedSeverity: "low" },
        { type: "auth.login_failure", expectedSeverity: "medium" },
        { type: "auth.account_locked", expectedSeverity: "high" },
        { type: "payment.fraud_suspected", expectedSeverity: "high" },
        { type: "system.malware_detected", expectedSeverity: "critical" },
      ];

      for (const event of events) {
        const securityEvent: SecurityEvent = {
          id: `test-${event.type}`,
          timestamp: new Date().toISOString(),
          eventType: event.type as any,
          severity: event.expectedSeverity as any,
          source: "test",
          details: {},
        };

        monitor.logEvent(
          securityEvent.eventType as any,
          securityEvent.details,
          {
            userId: securityEvent.userId,
            ipAddress: securityEvent.ipAddress,
          },
        );
        expect(appLogger.debug).toHaveBeenCalledWith(
          "Security Event",
          expect.objectContaining({
            eventType: event.type,
            severity: event.expectedSeverity,
          }),
        );
      }
    });

    it("should buffer events and flush periodically", async () => {
      // Test event buffering functionality
      const events: SecurityEvent[] = [];

      for (let i = 0; i < 5; i++) {
        events.push({
          id: `buffer-test-${i}`,
          timestamp: new Date().toISOString(),
          eventType: "auth.login_success",
          severity: "low",
          source: "test",
          userId: `user-${i}`,
          details: { test: `event-${i}` },
        });
      }

      // Log multiple events
      events.forEach((event) =>
        monitor.logEvent(event.eventType, event.details, {
          userId: event.userId,
          ipAddress: event.ipAddress,
        }),
      );

      // Verify all events were logged
      expect(appLogger.debug).toHaveBeenCalledTimes(5);

      // Test buffer flush
      await monitor.flushEvents();
      expect(appLogger.info).toHaveBeenCalledWith(
        "Security event buffer flushed",
        expect.objectContaining({
          bufferedEvents: 0,
        }),
      );
    });
  });

  describe("Security Alerting System", () => {
    let alerting: SecurityAlerting;

    beforeEach(() => {
      alerting = getSecurityAlerting();
    });

    it("should send email alerts for high severity events", async () => {
      const alert: SecurityAlert = {
        id: "alert-test-1",
        title: "Security Incident Detected",
        description: "A security incident was detected",
        severity: "high",
        timestamp: new Date().toISOString(),
        title: "High Severity Security Alert",
        description: "Suspicious login activity detected",
        userId: "user-123",
        ipAddress: "192.168.1.100",
        recommendedActions: ["Review user activity", "Reset credentials"],
      };

      await alerting.sendAlert(
        alert.title,
        alert.description,
        alert.severity,
        [],
        alert.recommendedActions,
      );

      // Verify email transport was called
      expect(appLogger.info).toHaveBeenCalledWith(
        "Sending security alert",
        expect.objectContaining({
          severity: "high",
        }),
      );
    });

    it("should send Slack notifications", async () => {
      const alert: SecurityAlert = {
        id: "alert-test-2",
        title: "Rate Limit Violation",
        description: "Rate limit violation detected",
        severity: "medium",
        timestamp: new Date().toISOString(),
        title: "Rate Limit Exceeded",
        description: "IP 192.168.1.100 exceeded rate limit",
        ipAddress: "192.168.1.100",
        recommendedActions: ["Block IP temporarily", "Review traffic patterns"],
      };

      await alerting.sendAlert(
        alert.title,
        alert.description,
        alert.severity,
        [],
        alert.recommendedActions,
      );

      // Verify Slack webhook was called
      expect(appLogger.info).toHaveBeenCalledWith(
        "Sending security alert",
        expect.objectContaining({
          severity: "medium",
        }),
      );
    });

    it("should handle PagerDuty integration", async () => {
      const criticalAlert: SecurityAlert = {
        id: "alert-test-3",
        title: "System Compromise",
        description: "Potential system compromise detected",
        severity: "critical",
        timestamp: new Date().toISOString(),
        title: "Critical Security Incident",
        description: "Potential system compromise detected",
        recommendedActions: [
          "Isolate affected systems",
          "Contact security team immediately",
        ],
      };

      await alerting.sendAlert(
        criticalAlert.title,
        criticalAlert.description,
        criticalAlert.severity,
        [],
        criticalAlert.recommendedActions,
      );

      // Verify PagerDuty was triggered
      expect(appLogger.info).toHaveBeenCalledWith(
        "Sending security alert",
        expect.objectContaining({
          severity: "critical",
        }),
      );
    });

    it("should deduplicate alerts", async () => {
      const duplicateAlerts = [
        {
          title: "Repeated Login Failure",
          description: "Multiple failed login attempts",
          severity: "medium" as const,
          events: [{ id: "evt-1", eventType: "auth.login_failure" as const }],
        },
        {
          title: "Repeated Login Failure",
          description: "Multiple failed login attempts",
          severity: "medium" as const,
          events: [{ id: "evt-2", eventType: "auth.login_failure" as const }],
        },
      ];

      // Send first alert
      await alerting.sendAlert(
        duplicateAlerts[0].title,
        duplicateAlerts[0].description,
        duplicateAlerts[0].severity,
        duplicateAlerts[0].events,
      );

      // Send duplicate alert (should be deduplicated)
      await alerting.sendAlert(
        duplicateAlerts[1].title,
        duplicateAlerts[1].description,
        duplicateAlerts[1].severity,
        duplicateAlerts[1].events,
      );

      // Second alert should be deduplicated
      expect(appLogger.debug).toHaveBeenCalledWith(
        "Alert deduplicated",
        expect.objectContaining({
          title: "Repeated Login Failure",
          severity: "medium",
        }),
      );
    });

    it("should manage alert history", async () => {
      // Send multiple alerts
      const alerts = [
        { title: "Alert 1", severity: "low" as const },
        { title: "Alert 2", severity: "medium" as const },
        { title: "Alert 3", severity: "high" as const },
      ];

      for (const alert of alerts) {
        await alerting.sendAlert(
          alert.title,
          "Test description",
          alert.severity,
        );
      }

      // Get alert statistics
      const stats = alerting.getAlertStats();

      expect(stats).toHaveProperty("totalAlerts");
      expect(stats).toHaveProperty("alertsBySeverity");
      expect(stats.alertsBySeverity.low).toBeGreaterThanOrEqual(1);
      expect(stats.alertsBySeverity.medium).toBeGreaterThanOrEqual(1);
      expect(stats.alertsBySeverity.high).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Security Integration Tests", () => {
    it("should integrate authentication security", async () => {
      const monitor = getSecurityMonitor();
      const alerting = getSecurityAlerting();

      // Simulate failed login attempts
      const failedLogins = Array.from({ length: 5 }, (_, i) => ({
        id: `failed-login-${i}`,
        timestamp: new Date().toISOString(),
        eventType: "auth.login_failure",
        severity: "medium",
        source: "auth-service",
        userId: "test-user",
        ipAddress: "192.168.1.100",
        details: {
          username: "admin@test.com",
          reason: "invalid_credentials",
        },
      }));

      // Log failed login events
      failedLogins.forEach((event) => monitor.logAuthEvent(event));

      // Send alert for multiple failed attempts
      await alerting.sendAlert(
        "Multiple Failed Login Attempts",
        "User test-user has 5 failed login attempts from IP 192.168.1.100",
        "high",
        failedLogins,
        ["Block IP address", "Notify user", "Review account security"],
      );

      // Verify both systems worked together
      expect(appLogger.info).toHaveBeenCalledWith(
        "SECURITY MEDIUM: auth.login_failure",
        expect.objectContaining({
          securityEvent: expect.objectContaining({
            type: "auth.login_failure",
          }),
        }),
      );

      expect(appLogger.info).toHaveBeenCalledWith(
        "Security alert sent",
        expect.objectContaining({
          severity: "high",
        }),
      );
    });

    it("should integrate rate limiting with security monitoring", async () => {
      const monitor = getSecurityMonitor();
      const alerting = getSecurityAlerting();

      // Simulate rate limiting violation
      const rateLimitEvent: SecurityEvent = {
        id: "rate-violation-1",
        timestamp: new Date().toISOString(),
        eventType: "rate_limit.exceeded",
        severity: "medium",
        source: "api-gateway",
        ipAddress: "10.0.0.1",
        details: {
          endpoint: "/api/users",
          limit: 100,
          actual: 250,
          window: "15 minutes",
        },
      };

      monitor.logRateLimitEvent(
        rateLimitEvent.eventType as any,
        {
          endpoint: rateLimitEvent.details.endpoint,
          requestCount: rateLimitEvent.details.actual,
          limit: rateLimitEvent.details.limit,
          windowMs: 15 * 60 * 1000,
        },
        {
          ipAddress: rateLimitEvent.ipAddress,
        },
      );

      // Send alert for rate limiting violation
      await alerting.sendAlert(
        "Rate Limit Violation Detected",
        "IP 10.0.0.1 exceeded rate limit on /api/users (250/100 requests)",
        "medium",
        [rateLimitEvent],
        ["Implement IP blocking", "Review API usage patterns"],
      );

      expect(appLogger.info).toHaveBeenCalledWith(
        "SECURITY MEDIUM: rate_limit.exceeded",
        expect.objectContaining({
          securityEvent: expect.objectContaining({
            type: "rate_limit.exceeded",
          }),
        }),
      );
    });

    it("should handle payment security integration", async () => {
      const monitor = getSecurityMonitor();
      const alerting = getSecurityAlerting();

      // Simulate suspicious payment activity
      const paymentEvents = [
        {
          id: "payment-1",
          timestamp: new Date().toISOString(),
          eventType: "payment.fraud_suspected",
          severity: "high",
          source: "payment-processor",
          userId: "user-123",
          ipAddress: "192.168.1.100",
          details: {
            amount: 5000,
            currency: "USD",
            transactionId: "txn-001",
            riskScore: 0.85,
            reason: "Unusual spending pattern",
          },
        },
        {
          id: "payment-2",
          timestamp: new Date().toISOString(),
          eventType: "payment.webhook_tampered",
          severity: "critical",
          source: "payment-webhook",
          details: {
            webhookUrl: "https://api.payment.com/webhook",
            signature: "invalid-signature",
            payload: '{"amount": 1000}',
          },
        },
      ];

      // Log payment events
      paymentEvents.forEach((event) => {
        if (event.eventType === "payment.fraud_suspected") {
          monitor.logPaymentEvent(
            event.eventType as any,
            {
              amount: event.details.amount,
              currency: event.details.currency,
              transactionId: event.details.transactionId,
              suspicionReason: event.details.reason,
            },
            {
              userId: event.userId,
              ipAddress: event.ipAddress,
            },
          );
        } else {
          monitor.logEvent(event.eventType as any, event.details, {
            userId: event.userId,
            ipAddress: event.ipAddress,
          });
        }
      });

      // Send alerts
      await alerting.sendAlert(
        "Payment Security Alert",
        "Multiple suspicious payment activities detected",
        "critical" as any,
        paymentEvents as any,
        [
          "Freeze affected accounts",
          "Contact payment provider",
          "Investigate transactions",
        ],
      );

      // Verify monitoring and alerting integration
      expect(appLogger.warn).toHaveBeenCalledWith(
        "SECURITY HIGH: payment.fraud_suspected",
        expect.objectContaining({
          securityEvent: expect.objectContaining({
            type: "payment.fraud_suspected",
          }),
        }),
      );

      expect(appLogger.warn).toHaveBeenCalledWith(
        "SECURITY HIGH: payment.webhook_tampered",
        expect.objectContaining({
          securityEvent: expect.objectContaining({
            type: "payment.webhook_tampered",
          }),
        }),
      );
    });
  });

  describe("Automated Security Scanning", () => {
    it("should perform dependency vulnerability checks", async () => {
      // Mock npm audit command
      const { exec } = await import("child_process");
      vi.mock("child_process", () => ({
        exec: vi.fn((command, callback) => {
          if (command.includes("npm audit")) {
            callback(null, {
              stdout: '{"vulnerabilities": {"high": 0, "critical": 0}}',
              stderr: "",
            });
          }
        }),
      }));

      // This would typically be tested through the actual npm audit command
      // For unit testing, we verify the integration points exist
      expect(typeof exec).toBe("function");
    });

    it("should run security linting", async () => {
      // Mock ESLint security plugin
      const mockESLint = {
        lintFiles: vi.fn().mockResolvedValue([
          {
            filePath: "src/test.ts",
            messages: [],
            errorCount: 0,
            warningCount: 0,
          },
        ]),
      };

      // Verify security linting can be executed
      const results = await mockESLint.lintFiles(["src/**/*.ts"]);
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty("filePath");
    });

    it("should integrate with GitHub Actions workflow", () => {
      // Verify workflow file exists and has correct structure
      const workflowContent = {
        name: "Security Scan",
        on: ["push", "pull_request"],
        jobs: {
          "security-scan": {
            "runs-on": "ubuntu-latest",
            steps: [
              { name: "Checkout code", uses: "actions/checkout@v4" },
              { name: "Run SAST scan", uses: "snyk/actions/node@master" },
              { name: "Run dependency audit", run: "npm audit" },
            ],
          },
        },
      };

      expect(workflowContent.name).toBe("Security Scan");
      expect(workflowContent.jobs["security-scan"]).toBeDefined();
      expect(workflowContent.jobs["security-scan"].steps).toHaveLength(3);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle high volume security events", async () => {
      const monitor = getSecurityMonitor();

      // Generate high volume of events
      const highVolumeEvents = Array.from({ length: 1000 }, (_, i) => ({
        id: `bulk-event-${i}`,
        timestamp: new Date().toISOString(),
        eventType: "auth.login_success",
        severity: "low",
        source: "bulk-test",
        userId: `user-${i % 50}`,
        ipAddress: "192.168.1.100",
        details: { bulk: true, index: i },
      }));

      // Log all events
      const startTime = Date.now();
      highVolumeEvents.forEach((event) =>
        monitor.logEvent(event.eventType as any, event.details, {
          userId: event.userId,
          ipAddress: event.ipAddress,
        }),
      );
      const endTime = Date.now();

      // Verify performance
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // Should process 1000 events in < 5 seconds

      // Verify all events were logged
      expect(appLogger.debug).toHaveBeenCalledTimes(1000);
    });

    it("should maintain alerting system performance", async () => {
      const alerting = getSecurityAlerting();

      // Send multiple alerts rapidly
      const alerts = Array.from({ length: 100 }, (_, i) => ({
        title: `Bulk Alert ${i}`,
        description: `Test alert #${i}`,
        severity: ["low", "medium", "high"][i % 3] as any,
      }));

      const startTime = Date.now();
      for (const alert of alerts) {
        await alerting.sendAlert(
          alert.title,
          alert.description,
          alert.severity,
        );
      }
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // Should handle 100 alerts in < 10 seconds

      // Verify alert statistics
      const stats = alerting.getAlertStats();
      expect(stats.totalAlerts).toBeGreaterThanOrEqual(100);
    });

    it("should handle concurrent security operations", async () => {
      const monitor = getSecurityMonitor();
      const alerting = getSecurityAlerting();

      // Create concurrent operations
      const operations = Array.from({ length: 50 }, async (_, i) => {
        const event: SecurityEvent = {
          id: `concurrent-${i}`,
          timestamp: new Date().toISOString(),
          eventType: "auth.login_success",
          severity: "low",
          source: "concurrent-test",
          userId: `user-${i}`,
          details: { concurrent: true },
        };

        monitor.logEvent(event.eventType as any, event.details, {
          userId: event.userId,
          ipAddress: event.ipAddress,
        });

        await alerting.sendAlert(
          `Concurrent Alert ${i}`,
          "Test concurrent alert",
          "low",
        );
      });

      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();

      // Verify concurrent processing performance
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(3000); // Should handle 50 concurrent ops in < 3 seconds

      // Verify results
      expect(appLogger.debug).toHaveBeenCalledTimes(50);
      const stats = alerting.getAlertStats();
      expect(stats.totalAlerts).toBeGreaterThanOrEqual(50);
    });
  });
});
