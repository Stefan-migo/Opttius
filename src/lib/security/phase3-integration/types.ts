/**
 * Phase 3 Security — types.
 *
 * @module lib/security/phase3-integration/types
 */

export interface SecurityOrchestrationConfig {
  behavioralAnalytics: {
    enabled: boolean;
    anomalyThreshold: number;
    baselinePeriodDays: number;
  };
  threatDetection: {
    enabled: boolean;
    intelFeeds: string[];
    mlModels: string[];
  };
  incidentResponse: {
    enabled: boolean;
    autoContainment: boolean;
    notificationChannels: string[];
  };
  zeroTrust: {
    enabled: boolean;
    verificationMethods: string[];
    trustScoring: boolean;
  };
}

export interface SecurityMetrics {
  activeIncidents: number;
  threatDetections: number;
  anomalyEvents: number;
  responseTimeAvg: number;
  falsePositiveRate: number;
  complianceScore: number;
}
