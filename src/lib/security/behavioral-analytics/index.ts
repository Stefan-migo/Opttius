/**
 * Behavioral Analytics Engine
 *
 * Implements user behavior analytics (UBA) for detecting anomalous activities
 * and potential security threats through pattern analysis.
 *
 * @module lib/security/behavioral-analytics
 */

import { appLogger as logger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis/client";

import { SecurityEvent } from "../events";
import { AnomalyDetector, DeviceFingerprintDetector, FrequencyAnomalyDetector, LocationAnomalyDetector, ResourceAccessAnomalyDetector, TimingAnomalyDetector } from "./analyzers";
import { createInitialBaseline, updateActionPatterns, updateLoginPatterns, updateRiskProfile } from "./baseline";
import {
  ANOMALY_THRESHOLD,
  AnomalyRecord,
  BASELINE_EXPIRY,
  BEHAVIOR_REDIS_PREFIX,
  BehaviorBaseline,
  HIGH_RISK_THRESHOLD,
  ThreatAssessment,
  UserAction,
} from "./types";

// Re-export all types and utilities
export { AnomalyDetector, DeviceFingerprintDetector, FrequencyAnomalyDetector, LocationAnomalyDetector, ResourceAccessAnomalyDetector, TimingAnomalyDetector } from "./analyzers";
export type { AnomalyRecord, BehaviorBaseline, ThreatAssessment, UserAction } from "./types";

/**
 * Behavioral Analytics Engine
 */
export class BehavioralAnalytics {
  private baselines: Map<string, BehaviorBaseline> = new Map();
  private anomalyDetectors: AnomalyDetector[] = [];

  constructor() {
    this.initializeDetectors();
  }

  private initializeDetectors(): void {
    this.anomalyDetectors = [
      new FrequencyAnomalyDetector(),
      new TimingAnomalyDetector(),
      new LocationAnomalyDetector(),
      new ResourceAccessAnomalyDetector(),
      new DeviceFingerprintDetector(),
    ];
  }

  /**
   * Record user action for behavioral analysis
   */
  async recordUserAction(action: UserAction): Promise<void> {
    try {
      const actionKey = `${BEHAVIOR_REDIS_PREFIX}actions:${action.userId}:${Date.now()}`;
      await getRedisClient().setex(
        actionKey,
        60 * 60 * 24,
        JSON.stringify(action),
      );

      await this.updateUserBaseline(action);

      const anomalies = await this.detectAnomalies(action);

      if (anomalies.length > 0) {
        const threatAssessment = await this.assessThreat(
          action.userId,
          anomalies,
        );
        await this.handleAnomalies(threatAssessment);
      }

      logger.debug("User action recorded for behavioral analysis", {
        userId: action.userId,
        actionType: action.actionType,
        anomaliesDetected: anomalies.length,
      });
    } catch (error) {
      logger.error("Failed to record user action", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: action.userId,
        actionType: action.actionType,
      });
    }
  }

  /**
   * Update user behavior baseline
   */
  private async updateUserBaseline(action: UserAction): Promise<void> {
    const baselineKey = `${BEHAVIOR_REDIS_PREFIX}baseline:${action.userId}`;
    let baseline: BehaviorBaseline;

    try {
      const existingBaseline = await getRedisClient().get(baselineKey);
      if (existingBaseline) {
        baseline = JSON.parse(existingBaseline);
      } else {
        baseline = createInitialBaseline(action.userId);
      }

      updateActionPatterns(baseline, action);

      if (action.actionType === "login") {
        updateLoginPatterns(baseline, action);
      }

      updateRiskProfile(baseline, action);

      await getRedisClient().setex(
        baselineKey,
        BASELINE_EXPIRY,
        JSON.stringify(baseline),
      );

      this.baselines.set(action.userId, baseline);
    } catch (error) {
      logger.error("Failed to update user baseline", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: action.userId,
      });
    }
  }

  /**
   * Detect anomalies in user behavior
   */
  private async detectAnomalies(action: UserAction): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];

    for (const detector of this.anomalyDetectors) {
      const detectorAnomalies = await detector.detect(
        action,
        this.baselines.get(action.userId),
      );
      anomalies.push(...detectorAnomalies);
    }

    return anomalies;
  }

  /**
   * Assess overall threat level for user
   */
  private async assessThreat(
    userId: string,
    anomalies: AnomalyRecord[],
  ): Promise<ThreatAssessment> {
    const baseline =
      this.baselines.get(userId) || createInitialBaseline(userId);

    let riskScore =
      baseline.riskProfile.baselineRisk +
      baseline.riskProfile.recentActivityScore;

    for (const anomaly of anomalies) {
      riskScore +=
        anomaly.confidence * this.getSeverityWeight(anomaly.severity);
    }

    riskScore = Math.min(riskScore, 1.0);

    const recommendedActions: string[] = [];
    const immediateActions: string[] = [];

    if (riskScore > HIGH_RISK_THRESHOLD) {
      immediateActions.push("Require additional authentication");
      immediateActions.push("Temporarily suspend account access");
      immediateActions.push("Notify security team immediately");
      recommendedActions.push("Conduct security interview with user");
    } else if (riskScore > ANOMALY_THRESHOLD) {
      recommendedActions.push("Increase monitoring frequency");
      recommendedActions.push("Send security notification to user");
      recommendedActions.push("Review recent account activity");
    }

    return {
      userId,
      riskScore,
      anomalies,
      recommendedActions,
      immediateActions,
    };
  }

  /**
   * Handle detected anomalies
   */
  private async handleAnomalies(assessment: ThreatAssessment): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      eventType: "behavior.user_anomaly",
      severity: assessment.riskScore > HIGH_RISK_THRESHOLD ? "high" : "medium",
      source: "behavioral-analytics",
      userId: assessment.userId,
      details: {
        riskScore: assessment.riskScore,
        anomalies: assessment.anomalies,
        recommendedActions: assessment.recommendedActions,
        immediateActions: assessment.immediateActions,
      },
    };

    if (assessment.riskScore > ANOMALY_THRESHOLD) {
      logger.warn("Behavioral anomaly detected", {
        userId: assessment.userId,
        riskScore: assessment.riskScore,
        anomalyCount: assessment.anomalies.length,
      });
    }

    const assessmentKey = `${BEHAVIOR_REDIS_PREFIX}assessments:${assessment.userId}:${Date.now()}`;
    await getRedisClient().setex(
      assessmentKey,
      60 * 60 * 24 * 7,
      JSON.stringify(assessment),
    );
  }

  private getSeverityWeight(severity: string): number {
    const weights: Record<string, number> = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      critical: 1.0,
    };
    return weights[severity] || 0.1;
  }

  /**
   * Get user behavior baseline
   */
  async getUserBaseline(userId: string): Promise<BehaviorBaseline | null> {
    if (this.baselines.has(userId)) {
      return this.baselines.get(userId)!;
    }

    const baselineKey = `${BEHAVIOR_REDIS_PREFIX}baseline:${userId}`;
    try {
      const baselineData = await getRedisClient().get(baselineKey);
      if (baselineData) {
        const baseline = JSON.parse(baselineData);
        this.baselines.set(userId, baseline);
        return baseline;
      }
    } catch (error) {
      logger.error("Failed to retrieve user baseline", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
    }

    return null;
  }
}

// Export singleton instance
export const behavioralAnalytics = new BehavioralAnalytics();
