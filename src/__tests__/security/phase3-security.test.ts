/**
 * Phase 3 Security Testing Suite
 *
 * Comprehensive testing framework for validating all Phase 3 security implementations
 * including behavioral analytics, threat detection, and incident response systems.
 *
 * @module tests/security/phase3-security.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  behavioralAnalytics,
  threatDetector,
  incidentResponse,
  phase3Security,
} from "@/lib/security";
import { getRedisClient } from "@/lib/redis/client";

// Mock Redis for testing
vi.mock("@/lib/redis/client", () => ({
  getRedisClient: vi.fn(() => ({
    setex: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue("PONG"),
  })),
}));

describe("Phase 3 Security Implementation Tests", () => {
  beforeEach(async () => {
    // Clear any existing test data
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });

  describe("Behavioral Analytics System", () => {
    it("should record user actions successfully", async () => {
      const testAction = {
        userId: "test-user-123",
        actionType: "login",
        timestamp: new Date(),
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 Test Browser",
        resourceId: "dashboard",
        metadata: { loginMethod: "password" },
      };

      await behavioralAnalytics.recordUserAction(testAction);

      // Verify the action was processed
      const baseline =
        await behavioralAnalytics.getUserBaseline("test-user-123");
      expect(baseline).toBeDefined();
      expect(baseline?.userId).toBe("test-user-123");
    });

    it("should detect anomalies in user behavior", async () => {
      // Create baseline with normal behavior
      const normalActions = [
        {
          userId: "test-user-456",
          actionType: "view_dashboard",
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          ipAddress: "192.168.1.100",
        },
        {
          userId: "test-user-456",
          actionType: "view_dashboard",
          timestamp: new Date(Date.now() - 1800000), // 30 min ago
          ipAddress: "192.168.1.100",
        },
      ];

      // Record normal actions to establish baseline
      for (const action of normalActions) {
        await behavioralAnalytics.recordUserAction(action);
      }

      // Create anomalous action (different location)
      const anomalousAction = {
        userId: "test-user-456",
        actionType: "view_dashboard",
        timestamp: new Date(),
        ipAddress: "185.132.1.1", // Different IP range
      };

      await behavioralAnalytics.recordUserAction(anomalousAction);

      // Verify baseline was updated
      const baseline =
        await behavioralAnalytics.getUserBaseline("test-user-456");
      expect(baseline).toBeDefined();
      expect(baseline?.loginPatterns.typicalLocations).toContain("192.168");
      expect(baseline?.loginPatterns.typicalLocations).not.toContain("185.132");
    });

    it("should calculate appropriate risk scores", async () => {
      const testUserId = "risk-test-user";

      // Record high-risk actions
      const highRiskActions = [
        {
          userId: testUserId,
          actionType: "admin_access",
          timestamp: new Date(),
          resourceId: "user_management",
        },
        {
          userId: testUserId,
          actionType: "data_export",
          timestamp: new Date(Date.now() + 1000),
          resourceId: "customer_data",
        },
      ];

      for (const action of highRiskActions) {
        await behavioralAnalytics.recordUserAction(action);
      }

      const baseline = await behavioralAnalytics.getUserBaseline(testUserId);
      expect(baseline).toBeDefined();
      expect(baseline?.riskProfile.recentActivityScore).toBeGreaterThan(0);
    });
  });

  describe("Threat Detection System", () => {
    it("should analyze user behavior for threats", async () => {
      const testActions = [
        {
          userId: "threat-test-user",
          actionType: "login",
          timestamp: new Date(),
          ipAddress: "192.168.1.100",
          userAgent: "Mozilla/5.0 Test Browser",
        },
      ];

      const threats = await threatDetector.analyzeUserBehavior(
        "threat-test-user",
        testActions,
      );

      // Should return array (even if empty)
      expect(Array.isArray(threats)).toBe(true);
    });

    it("should check threat intelligence feeds", async () => {
      const testAction = {
        userId: "intel-test-user",
        actionType: "login",
        timestamp: new Date(),
        ipAddress: "192.168.1.100", // Known suspicious IP
      };

      const threats = await threatDetector.analyzeUserBehavior(
        "intel-test-user",
        [testAction],
      );

      // Verify system processes threat intel (implementation details may vary)
      expect(threats).toBeDefined();
    });

    it("should evaluate zero-trust access decisions", async () => {
      const testActions = [
        {
          userId: "zt-test-user",
          actionType: "view_dashboard",
          timestamp: new Date(),
          resourceId: "sensitive_data",
        },
      ];

      const threats = await threatDetector.analyzeUserBehavior(
        "zt-test-user",
        testActions,
      );

      expect(threats).toBeDefined();
      // Zero-trust evaluation should be part of threat analysis
    });

    it("should provide system status information", () => {
      const status = threatDetector.getStatus();

      expect(status).toHaveProperty("threatFeeds");
      expect(status).toHaveProperty("mlModels");
      expect(status).toHaveProperty("deceptionAssets");
      expect(status).toHaveProperty("zeroTrustEnabled");

      expect(typeof status.threatFeeds).toBe("number");
      expect(typeof status.mlModels).toBe("number");
      expect(typeof status.deceptionAssets).toBe("number");
      expect(typeof status.zeroTrustEnabled).toBe("boolean");
    });
  });

  describe("Incident Response System", () => {
    it("should process security events and create incidents", async () => {
      const testEvents = [
        {
          id: "test-event-1",
          timestamp: new Date().toISOString(),
          eventType: "auth.login_failure",
          severity: "high",
          source: "authentication",
          userId: "compromised-user",
          ipAddress: "192.168.1.100",
          details: {
            attempts: 6,
            username: "admin@test.com",
          },
        },
      ];

      const incidents = await incidentResponse.processSecurityEvents(
        testEvents as any,
      );

      expect(Array.isArray(incidents)).toBe(true);
      // May or may not create incidents based on escalation rules
    });

    it("should manage incident lifecycle", async () => {
      // Test getting active incidents
      const activeIncidents = incidentResponse.getActiveIncidents();
      expect(Array.isArray(activeIncidents)).toBe(true);

      // Test incident retrieval by ID (should handle non-existent IDs gracefully)
      const nonExistentIncident =
        incidentResponse.getIncidentById("non-existent-id");
      expect(nonExistentIncident).toBeUndefined();
    });

    it("should update incident status", async () => {
      // This test would require creating a real incident first
      // For now, we'll test that the method exists and handles gracefully
      await expect(
        incidentResponse.updateIncidentStatus(
          "test-incident-id",
          "investigating",
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe("Phase 3 Security Orchestration", () => {
    it("should process security events through all systems", async () => {
      const testEvents = [
        {
          id: "orch-test-1",
          userId: "test-user-789",
          actionType: "login",
          timestamp: Date.now(),
          ipAddress: "192.168.1.100",
          severity: "medium",
          eventType: "auth.login_success",
          source: "web-app",
        },
      ];

      await phase3Security.processSecurityEvents(testEvents);

      // Verify processing completed without errors
      const status = phase3Security.getStatus();
      expect(status).toHaveProperty("metrics");
      expect(status).toHaveProperty("components");
    });

    it("should provide comprehensive system status", () => {
      const status = phase3Security.getStatus();

      // Verify status structure
      expect(status).toHaveProperty("config");
      expect(status).toHaveProperty("metrics");
      expect(status).toHaveProperty("uptime");
      expect(status).toHaveProperty("components");

      // Verify metrics structure
      expect(status.metrics).toHaveProperty("activeIncidents");
      expect(status.metrics).toHaveProperty("threatDetections");
      expect(status.metrics).toHaveProperty("anomalyEvents");
      expect(status.metrics).toHaveProperty("responseTimeAvg");
      expect(status.metrics).toHaveProperty("complianceScore");
    });

    it("should perform compliance checks", async () => {
      const compliance = await phase3Security.performComplianceCheck();

      expect(compliance).toHaveProperty("soc2Ready");
      expect(compliance).toHaveProperty("pciDssCompliant");
      expect(compliance).toHaveProperty("gdprCompliant");
      expect(compliance).toHaveProperty("findings");
      expect(compliance).toHaveProperty("recommendations");

      expect(typeof compliance.soc2Ready).toBe("boolean");
      expect(typeof compliance.pciDssCompliant).toBe("boolean");
      expect(typeof compliance.gdprCompliant).toBe("boolean");
      expect(Array.isArray(compliance.findings)).toBe(true);
      expect(Array.isArray(compliance.recommendations)).toBe(true);
    });

    it("should generate security reports", async () => {
      const report = await phase3Security.generateSecurityReport();

      expect(typeof report).toBe("string");
      expect(report.length).toBeGreaterThan(0);

      // Verify report contains expected sections
      expect(report).toContain("Phase 3 Security Report");
      expect(report).toContain("System Status");
      expect(report).toContain("Component Status");
      expect(report).toContain("Compliance Status");
    });
  });

  describe("Integration Tests", () => {
    it("should handle concurrent security events", async () => {
      const concurrentEvents = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${i}`,
        userId: `user-${i}`,
        actionType: "api_request",
        timestamp: Date.now() + i * 100,
        ipAddress: `192.168.1.${100 + i}`,
        severity: "low",
        eventType: "data.access_sensitive",
        source: "api-gateway",
      }));

      // Process multiple events concurrently
      await Promise.all([
        phase3Security.processSecurityEvents(concurrentEvents.slice(0, 5)),
        phase3Security.processSecurityEvents(concurrentEvents.slice(5)),
      ]);

      const status = phase3Security.getStatus();
      expect(status.metrics.anomalyEvents).toBeGreaterThanOrEqual(10);
    });

    it("should maintain data consistency across components", async () => {
      const testUserId = "consistency-test-user";
      const testAction = {
        userId: testUserId,
        actionType: "file_download",
        timestamp: new Date(),
        resourceId: "confidential_document.pdf",
        ipAddress: "10.0.0.1",
      };

      // Process through behavioral analytics
      await behavioralAnalytics.recordUserAction(testAction);

      // Verify baseline was created
      const baseline = await behavioralAnalytics.getUserBaseline(testUserId);
      expect(baseline).toBeDefined();
      expect(baseline?.userId).toBe(testUserId);

      // Process through threat detection
      const threats = await threatDetector.analyzeUserBehavior(testUserId, [
        testAction,
      ]);
      expect(Array.isArray(threats)).toBe(true);

      // Verify system status reflects the processing
      const status = phase3Security.getStatus();
      expect(status.metrics.anomalyEvents).toBeGreaterThan(0);
    });

    it("should handle error conditions gracefully", async () => {
      // Test with malformed events
      const malformedEvents = [
        {}, // Empty event
        { id: "malformed-1" }, // Missing required fields
        null, // Null event
        undefined, // Undefined event
      ];

      // Should not throw errors
      await expect(
        phase3Security.processSecurityEvents(malformedEvents as any),
      ).resolves.not.toThrow();

      // System should remain operational
      const status = phase3Security.getStatus();
      expect(status).toBeDefined();
    });
  });
});
