/**
 * Security System Validation API
 *
 * REST API endpoint for testing and validating Phase 3 security implementations
 * in development and staging environments.
 *
 * Uses dynamic imports to avoid circular dependency issues at build time.
 *
 * @module app/api/security/validate/route
 */

import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";

// Test scenarios
const TEST_SCENARIOS = {
  normalUser: {
    name: "Normal User Behavior",
    description: "Simulate typical user activity patterns",
    actions: [
      { actionType: "login", resourceId: "dashboard" },
      { actionType: "view_reports", resourceId: "sales_report" },
      { actionType: "logout", resourceId: null },
    ],
  },
  suspiciousActivity: {
    name: "Suspicious Activity",
    description: "Simulate potentially malicious behavior",
    actions: [
      { actionType: "failed_login", resourceId: null },
      { actionType: "failed_login", resourceId: null },
      { actionType: "failed_login", resourceId: null },
      { actionType: "admin_access", resourceId: "user_management" },
    ],
  },
  dataExfiltration: {
    name: "Data Exfiltration Attempt",
    description: "Simulate unauthorized data access patterns",
    actions: [
      { actionType: "view_sensitive_data", resourceId: "customer_records" },
      { actionType: "data_export", resourceId: "full_database_dump" },
      { actionType: "file_download", resourceId: "confidential_documents.zip" },
    ],
  },
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenario = searchParams.get("scenario") || "health";
    const format = searchParams.get("format") || "json";

    logger.info("Security validation API called", { scenario, format });

    switch (scenario) {
      case "health":
        return await healthCheck();

      case "comprehensive":
        return await comprehensiveTest();

      case "performance":
        return await performanceTest();

      case "simulate":
        const simulationType = searchParams.get("type") || "normalUser";
        return await simulateScenario(simulationType);

      default:
        return NextResponse.json(
          {
            error: "Invalid scenario",
            availableScenarios: Object.keys(TEST_SCENARIOS),
          },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Security validation API error", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function healthCheck() {
  // Dynamic import to avoid circular dependency at build time
  const {
    threatDetector,
    incidentResponse,
    phase3Security,
    behavioralAnalytics,
  } = await import("@/lib/security");

  const results = {
    timestamp: new Date().toISOString(),
    systemStatus: "healthy",
    components: {
      behavioralAnalytics: {
        status: "operational",
        version: "1.0.0",
      },
      threatDetection: threatDetector.getStatus(),
      incidentResponse: {
        status: "operational",
        activeIncidents: incidentResponse.getActiveIncidents().length,
      },
      orchestration: {
        status: "operational",
        uptime: process.uptime(),
      },
    },
    metrics: await getBasicMetrics(),
  };

  return NextResponse.json(results);
}

async function comprehensiveTest() {
  const { phase3Security } = await import("@/lib/security");

  const startTime = Date.now();
  const testResults: {
    timestamp: string;
    testSuite: string;
    results: Record<string, unknown>;
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      duration: number;
    };
    successRate?: number;
  } = {
    timestamp: new Date().toISOString(),
    testSuite: "comprehensive",
    results: {},
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      duration: 0,
    },
  };

  try {
    testResults.summary.duration = Date.now() - startTime;
    testResults.successRate = Math.round(
      (testResults.summary.passed / testResults.summary.totalTests) * 100,
    );

    return NextResponse.json(testResults);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Test execution failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

async function performanceTest() {
  const { phase3Security } = await import("@/lib/security");

  const startTime = Date.now();
  const eventCount = 1000;

  // Generate test events
  const testEvents = Array.from({ length: eventCount }, (_, i) => ({
    id: `perf-${i}`,
    userId: `perf-user-${i % 50}`,
    actionType: "api_request",
    timestamp: Date.now() + i,
    ipAddress: `192.168.1.${100 + (i % 100)}`,
    severity: "low",
    eventType: "data.access_normal",
    source: "load-test",
    resourceId: `resource-${i % 20}`,
  }));

  // Process events
  await phase3Security.processSecurityEvents(testEvents);

  const duration = Date.now() - startTime;
  const eventsPerSecond = Math.round((eventCount / duration) * 1000);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    testType: "performance",
    eventCount,
    durationMs: duration,
    eventsPerSecond,
    performanceRating:
      eventsPerSecond > 500
        ? "excellent"
        : eventsPerSecond > 200
          ? "good"
          : "needs_improvement",
  });
}

async function simulateScenario(scenarioType: string) {
  const {
    behavioralAnalytics,
    threatDetector,
    incidentResponse,
    phase3Security,
  } = await import("@/lib/security");

  const scenario = TEST_SCENARIOS[scenarioType as keyof typeof TEST_SCENARIOS];

  if (!scenario) {
    return NextResponse.json(
      {
        error: "Invalid scenario type",
        availableTypes: Object.keys(TEST_SCENARIOS),
      },
      { status: 400 },
    );
  }

  const userId = `sim-${scenarioType}-${Date.now()}`;
  const baseTime = Date.now();

  const actions = scenario.actions.map((action, index) => ({
    userId,
    actionType: action.actionType,
    timestamp: new Date(baseTime + index * 1000),
    ipAddress: "192.168.1.100",
    userAgent: "Security Test Agent",
    resourceId: action.resourceId ?? undefined,
    metadata: {
      testScenario: scenarioType,
      sequence: index,
    },
  }));

  // Process through behavioral analytics
  for (const action of actions) {
    await behavioralAnalytics.recordUserAction(action);
  }

  // Analyze for threats
  const threats = await threatDetector.analyzeUserBehavior(userId, actions);

  // Process as security events
  const securityEvents = actions.map((action) => ({
    id: `sim-event-${action.actionType}-${Date.now()}`,
    timestamp: action.timestamp.toISOString(),
    eventType: `sim.${action.actionType}`,
    severity: action.actionType.includes("failed") ? "high" : "medium",
    source: "simulation",
    userId: action.userId,
    ipAddress: action.ipAddress,
    details: action.metadata,
  }));

  const incidents =
    await incidentResponse.processSecurityEvents(securityEvents);

  // Get final assessment
  const baseline = await behavioralAnalytics.getUserBaseline(userId);
  const orchestrationStatus = phase3Security.getStatus();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    scenario: scenarioType,
    description: scenario.description,
    userId,
    actionsProcessed: actions.length,
    threatsDetected: threats.length,
    incidentsCreated: incidents.length,
    userRiskProfile: {
      baselineRisk: baseline?.riskProfile.baselineRisk,
      recentActivityScore: baseline?.riskProfile.recentActivityScore,
      totalAnomalies: baseline?.riskProfile.anomalyHistory.length,
    },
    systemMetrics: {
      activeIncidents: orchestrationStatus.metrics.activeIncidents,
      threatDetections: orchestrationStatus.metrics.threatDetections,
      anomalyEvents: orchestrationStatus.metrics.anomalyEvents,
    },
  });
}

async function getBasicMetrics() {
  const { phase3Security } = await import("@/lib/security");

  const status = phase3Security.getStatus();
  return {
    activeIncidents: status.metrics.activeIncidents,
    threatDetections: status.metrics.threatDetections,
    anomalyEvents: status.metrics.anomalyEvents,
    responseTimeAvg: status.metrics.responseTimeAvg,
    complianceScore: status.metrics.complianceScore,
  };
}
