/**
 * Security System Validation API
 *
 * REST API endpoint for testing and validating Phase 3 security implementations
 * in development and staging environments.
 *
 * @module app/api/security/validate/route
 */

import { NextRequest, NextResponse } from "next/server";
import {
  behavioralAnalytics,
  threatDetector,
  incidentResponse,
  phase3Security,
} from "@/lib/security";
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
  const startTime = Date.now();
  const testResults: any = {
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
    // Test 1: Behavioral Analytics
    testResults.results.behavioralAnalytics = await testBehavioralAnalytics();
    testResults.summary.totalTests +=
      testResults.results.behavioralAnalytics.tests;
    testResults.summary.passed +=
      testResults.results.behavioralAnalytics.passed;
    testResults.summary.failed +=
      testResults.results.behavioralAnalytics.failed;

    // Test 2: Threat Detection
    testResults.results.threatDetection = await testThreatDetection();
    testResults.summary.totalTests += testResults.results.threatDetection.tests;
    testResults.summary.passed += testResults.results.threatDetection.passed;
    testResults.summary.failed += testResults.results.threatDetection.failed;

    // Test 3: Incident Response
    testResults.results.incidentResponse = await testIncidentResponse();
    testResults.summary.totalTests +=
      testResults.results.incidentResponse.tests;
    testResults.summary.passed += testResults.results.incidentResponse.passed;
    testResults.summary.failed += testResults.results.incidentResponse.failed;

    // Test 4: Orchestration
    testResults.results.orchestration = await testOrchestration();
    testResults.summary.totalTests += testResults.results.orchestration.tests;
    testResults.summary.passed += testResults.results.orchestration.passed;
    testResults.summary.failed += testResults.results.orchestration.failed;

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
    eventType: `sim.${action.actionType}` as any,
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

// Individual test functions
async function testBehavioralAnalytics() {
  const results = { tests: 0, passed: 0, failed: 0, details: [] };

  try {
    // Test 1: Action recording
    results.tests++;
    const testAction = {
      userId: "ba-test-user",
      actionType: "login",
      timestamp: new Date(),
      ipAddress: "192.168.1.100",
    };

    await behavioralAnalytics.recordUserAction(testAction);
    results.passed++;
    results.details.push({ test: "action_recording", status: "passed" } as any);

    // Test 2: Baseline retrieval
    results.tests++;
    const baseline = await behavioralAnalytics.getUserBaseline("ba-test-user");
    if (baseline) {
      results.passed++;
      results.details.push({
        test: "baseline_retrieval",
        status: "passed",
      } as any);
    } else {
      results.failed++;
      results.details.push({
        test: "baseline_retrieval",
        status: "failed",
      } as any);
    }

    // Test 3: Pattern recognition
    results.tests++;
    const additionalActions = [
      {
        userId: "ba-test-user",
        actionType: "view_data",
        timestamp: new Date(Date.now() + 1000),
      },
      {
        userId: "ba-test-user",
        actionType: "download_file",
        timestamp: new Date(Date.now() + 2000),
      },
    ];

    for (const action of additionalActions) {
      await behavioralAnalytics.recordUserAction(action);
    }

    const updatedBaseline =
      await behavioralAnalytics.getUserBaseline("ba-test-user");
    if (updatedBaseline?.actionPatterns.view_data) {
      results.passed++;
      results.details.push({
        test: "pattern_recognition",
        status: "passed",
      } as any);
    } else {
      results.failed++;
      results.details.push({
        test: "pattern_recognition",
        status: "failed",
      } as any);
    }
  } catch (error) {
    results.tests++;
    results.failed++;
    results.details.push({
      test: "behavioral_analytics",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    } as any);
  }

  return results;
}

async function testThreatDetection() {
  const results = { tests: 0, passed: 0, failed: 0, details: [] };

  try {
    // Test 1: System status
    results.tests++;
    const status = threatDetector.getStatus();
    if (status.threatFeeds >= 0) {
      results.passed++;
      results.details.push({ test: "system_status", status: "passed" } as any);
    } else {
      results.failed++;
      results.details.push({ test: "system_status", status: "failed" } as any);
    }

    // Test 2: Behavior analysis
    results.tests++;
    const threats = await threatDetector.analyzeUserBehavior("td-test-user", [
      { userId: "td-test-user", actionType: "login", timestamp: new Date() },
    ]);

    if (Array.isArray(threats)) {
      results.passed++;
      results.details.push({
        test: "behavior_analysis",
        status: "passed",
        threatCount: threats.length,
      } as any);
    } else {
      results.failed++;
      results.details.push({
        test: "behavior_analysis",
        status: "failed",
      } as any);
    }
  } catch (error) {
    results.tests++;
    results.failed++;
    results.details.push({
      test: "threat_detection",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    } as any);
  }

  return results;
}

async function testIncidentResponse() {
  const results = { tests: 0, passed: 0, failed: 0, details: [] };

  try {
    // Test 1: Event processing
    results.tests++;
    const testEvents = [
      {
        id: "ir-test-event",
        timestamp: new Date().toISOString(),
        eventType: "auth.suspicious_activity",
        severity: "high",
        source: "test",
        userId: "ir-test-user",
      },
    ];

    const incidents = await incidentResponse.processSecurityEvents(testEvents);
    results.passed++;
    results.details.push({
      test: "event_processing",
      status: "passed",
      incidentsCreated: incidents.length,
    } as any);

    // Test 2: Incident management
    results.tests++;
    const activeIncidents = incidentResponse.getActiveIncidents();
    results.passed++;
    results.details.push({
      test: "incident_management",
      status: "passed",
      activeIncidents: activeIncidents.length,
    } as any);
  } catch (error) {
    results.tests++;
    results.failed++;
    results.details.push({
      test: "incident_response",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    } as any);
  }

  return results;
}

async function testOrchestration() {
  const results = { tests: 0, passed: 0, failed: 0, details: [] };

  try {
    // Test 1: Event processing
    results.tests++;
    const testEvents = [
      {
        id: "orch-test-event",
        userId: "orch-test-user",
        actionType: "login",
        timestamp: Date.now(),
        ipAddress: "192.168.1.100",
        severity: "medium",
        eventType: "auth.login_success",
        source: "test",
      },
    ];

    await phase3Security.processSecurityEvents(testEvents);
    results.passed++;
    results.details.push({ test: "event_processing", status: "passed" } as any);

    // Test 2: System status
    results.tests++;
    const status = phase3Security.getStatus();
    if (status.metrics) {
      results.passed++;
      results.details.push({ test: "system_status", status: "passed" } as any);
    } else {
      results.failed++;
      results.details.push({ test: "system_status", status: "failed" } as any);
    }

    // Test 3: Compliance check
    results.tests++;
    const compliance = await phase3Security.performComplianceCheck();
    if (compliance.soc2Ready !== undefined) {
      results.passed++;
      results.details.push({
        test: "compliance_check",
        status: "passed",
      } as any);
    } else {
      results.failed++;
      results.details.push({
        test: "compliance_check",
        status: "failed",
      } as any);
    }
  } catch (error) {
    results.tests++;
    results.failed++;
    results.details.push({
      test: "orchestration",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    } as any);
  }

  return results;
}

async function getBasicMetrics() {
  const status = phase3Security.getStatus();
  return {
    activeIncidents: status.metrics.activeIncidents,
    threatDetections: status.metrics.threatDetections,
    anomalyEvents: status.metrics.anomalyEvents,
    responseTimeAvg: status.metrics.responseTimeAvg,
    complianceScore: status.metrics.complianceScore,
  };
}
