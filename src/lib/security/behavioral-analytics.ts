/**
 * Behavioral Analytics System
 *
 * Implements user behavior analytics (UBA) for detecting anomalous activities
 * and potential security threats through pattern analysis and machine learning.
 *
 * @module lib/security/behavioral-analytics
 */

import { appLogger as logger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis/client";
import { SecurityEvent, SecuritySeverity } from "./events";

// Types for behavioral analytics
export interface UserAction {
  userId: string;
  actionType: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface BehaviorBaseline {
  userId: string;
  actionPatterns: Record<
    string,
    {
      frequency: number;
      timeOfDay: number[];
      typicalResources: string[];
      averageDuration: number;
    }
  >;
  loginPatterns: {
    typicalTimes: number[];
    typicalLocations: string[];
    deviceFingerprints: string[];
  };
  riskProfile: {
    baselineRisk: number;
    recentActivityScore: number;
    anomalyHistory: AnomalyRecord[];
  };
}

export interface AnomalyRecord {
  timestamp: Date;
  anomalyType: string;
  severity: SecuritySeverity;
  confidence: number;
  details: Record<string, any>;
}

export interface ThreatAssessment {
  userId: string;
  riskScore: number;
  anomalies: AnomalyRecord[];
  recommendedActions: string[];
  immediateActions?: string[];
}

// Constants
const BEHAVIOR_REDIS_PREFIX = "behavior:";
const BASELINE_EXPIRY = 30 * 24 * 60 * 60; // 30 days
const ANOMALY_THRESHOLD = 0.7;
const HIGH_RISK_THRESHOLD = 0.85;

/**
 * Behavioral Analytics Engine
 */
export class BehavioralAnalytics {
  private baselines: Map<string, BehaviorBaseline> = new Map();
  private anomalyDetectors: AnomalyDetector[] = [];

  constructor() {
    this.initializeDetectors();
  }

  /**
   * Initialize anomaly detection algorithms
   */
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
      // Store action in Redis for real-time analysis
      const actionKey = `${BEHAVIOR_REDIS_PREFIX}actions:${action.userId}:${Date.now()}`;
      await getRedisClient().setex(
        actionKey,
        60 * 60 * 24, // 24 hours
        JSON.stringify(action),
      );

      // Update user baseline
      await this.updateUserBaseline(action);

      // Perform real-time anomaly detection
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
        baseline = this.createInitialBaseline(action.userId);
      }

      // Update action patterns
      this.updateActionPatterns(baseline, action);

      // Update login patterns if this is a login action
      if (action.actionType === "login") {
        this.updateLoginPatterns(baseline, action);
      }

      // Update risk profile
      this.updateRiskProfile(baseline, action);

      // Save updated baseline
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
   * Create initial behavior baseline for user
   */
  private createInitialBaseline(userId: string): BehaviorBaseline {
    return {
      userId,
      actionPatterns: {},
      loginPatterns: {
        typicalTimes: [],
        typicalLocations: [],
        deviceFingerprints: [],
      },
      riskProfile: {
        baselineRisk: 0.1,
        recentActivityScore: 0,
        anomalyHistory: [],
      },
    };
  }

  /**
   * Update action patterns in baseline
   */
  private updateActionPatterns(
    baseline: BehaviorBaseline,
    action: UserAction,
  ): void {
    if (!baseline.actionPatterns[action.actionType]) {
      baseline.actionPatterns[action.actionType] = {
        frequency: 0,
        timeOfDay: [],
        typicalResources: [],
        averageDuration: 0,
      };
    }

    const pattern = baseline.actionPatterns[action.actionType];
    pattern.frequency += 1;

    // Track time of day (0-23)
    const hour = action.timestamp.getHours();
    if (!pattern.timeOfDay.includes(hour)) {
      pattern.timeOfDay.push(hour);
    }

    // Track accessed resources
    if (action.resourceId) {
      if (!pattern.typicalResources.includes(action.resourceId)) {
        pattern.typicalResources.push(action.resourceId);
      }
    }
  }

  /**
   * Update login patterns in baseline
   */
  private updateLoginPatterns(
    baseline: BehaviorBaseline,
    action: UserAction,
  ): void {
    // Track login times
    const hour = action.timestamp.getHours();
    if (!baseline.loginPatterns.typicalTimes.includes(hour)) {
      baseline.loginPatterns.typicalTimes.push(hour);
    }

    // Track locations/IP addresses
    if (action.ipAddress) {
      const location = this.ipToLocation(action.ipAddress);
      if (!baseline.loginPatterns.typicalLocations.includes(location)) {
        baseline.loginPatterns.typicalLocations.push(location);
      }
    }

    // Track device fingerprints
    if (action.userAgent) {
      const fingerprint = this.generateDeviceFingerprint(action.userAgent);
      if (!baseline.loginPatterns.deviceFingerprints.includes(fingerprint)) {
        baseline.loginPatterns.deviceFingerprints.push(fingerprint);
      }
    }
  }

  /**
   * Update user risk profile
   */
  private updateRiskProfile(
    baseline: BehaviorBaseline,
    action: UserAction,
  ): void {
    // Simple risk scoring based on action type
    const actionRiskWeights: Record<string, number> = {
      login: 0.1,
      password_reset: 0.3,
      admin_access: 0.4,
      data_export: 0.5,
      user_management: 0.6,
      payment_processing: 0.7,
    };

    const actionRisk = actionRiskWeights[action.actionType] || 0.1;
    baseline.riskProfile.recentActivityScore += actionRisk;

    // Decay recent activity score over time
    baseline.riskProfile.recentActivityScore *= 0.95;
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
      this.baselines.get(userId) || this.createInitialBaseline(userId);

    // Calculate risk score based on anomalies
    let riskScore =
      baseline.riskProfile.baselineRisk +
      baseline.riskProfile.recentActivityScore;

    for (const anomaly of anomalies) {
      riskScore +=
        anomaly.confidence * this.getSeverityWeight(anomaly.severity);
    }

    // Cap risk score at 1.0
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
    // Log security event
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

    // Trigger security alerts if needed
    if (assessment.riskScore > ANOMALY_THRESHOLD) {
      // This would integrate with the existing alerting system
      logger.warn("Behavioral anomaly detected", {
        userId: assessment.userId,
        riskScore: assessment.riskScore,
        anomalyCount: assessment.anomalies.length,
      });
    }

    // Store assessment for future reference
    const assessmentKey = `${BEHAVIOR_REDIS_PREFIX}assessments:${assessment.userId}:${Date.now()}`;
    await getRedisClient().setex(
      assessmentKey,
      60 * 60 * 24 * 7, // 7 days
      JSON.stringify(assessment),
    );
  }

  /**
   * Get severity weight for risk calculation
   */
  private getSeverityWeight(severity: SecuritySeverity): number {
    const weights: Record<SecuritySeverity, number> = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      critical: 1.0,
    };
    return weights[severity];
  }

  /**
   * Convert IP to approximate location
   */
  private ipToLocation(ip: string): string {
    // Simplified IP geolocation - in production, use proper IP geolocation service
    // This is a placeholder that groups IPs by class
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.0.0`;
    }
    return "unknown";
  }

  /**
   * Generate device fingerprint from user agent
   */
  private generateDeviceFingerprint(userAgent: string): string {
    // Simplified fingerprinting - in production, use more sophisticated methods
    return require("crypto")
      .createHash("md5")
      .update(userAgent)
      .digest("hex")
      .substring(0, 16);
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

/**
 * Abstract base class for anomaly detectors
 */
abstract class AnomalyDetector {
  abstract detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]>;
}

/**
 * Detects unusual frequency of actions
 */
class FrequencyAnomalyDetector extends AnomalyDetector {
  async detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];

    if (!baseline) return anomalies;

    const pattern = baseline.actionPatterns[action.actionType];
    if (!pattern) return anomalies;

    // Check if this action is unusually frequent
    const expectedFrequency = pattern.frequency / 100; // Normalize
    const currentFrequency = 1; // This is a single action

    if (currentFrequency > expectedFrequency * 3) {
      // 3x normal frequency
      anomalies.push({
        timestamp: action.timestamp,
        anomalyType: "HIGH_FREQUENCY_ACTION",
        severity: "medium",
        confidence: 0.7,
        details: {
          actionType: action.actionType,
          currentFrequency,
          expectedFrequency,
        },
      });
    }

    return anomalies;
  }
}

/**
 * Detects unusual timing of actions
 */
class TimingAnomalyDetector extends AnomalyDetector {
  async detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];

    if (!baseline) return anomalies;

    const hour = action.timestamp.getHours();

    // Check if login occurs at unusual time
    if (action.actionType === "login") {
      const typicalTimes = baseline.loginPatterns.typicalTimes;
      if (typicalTimes.length > 0 && !typicalTimes.includes(hour)) {
        anomalies.push({
          timestamp: action.timestamp,
          anomalyType: "UNUSUAL_LOGIN_TIME",
          severity: "medium",
          confidence: 0.6,
          details: {
            loginHour: hour,
            typicalHours: typicalTimes,
          },
        });
      }
    }

    return anomalies;
  }
}

/**
 * Detects unusual geographic locations
 */
class LocationAnomalyDetector extends AnomalyDetector {
  async detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];

    if (!baseline || !action.ipAddress) return anomalies;

    const location = action.ipAddress.split(".").slice(0, 2).join(".");
    const typicalLocations = baseline.loginPatterns.typicalLocations;

    if (typicalLocations.length > 0 && !typicalLocations.includes(location)) {
      anomalies.push({
        timestamp: action.timestamp,
        anomalyType: "UNUSUAL_LOCATION",
        severity: "high",
        confidence: 0.8,
        details: {
          currentLocation: location,
          typicalLocations,
          ipAddress: action.ipAddress,
        },
      });
    }

    return anomalies;
  }
}

/**
 * Detects unusual resource access patterns
 */
class ResourceAccessAnomalyDetector extends AnomalyDetector {
  async detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];

    if (!baseline || !action.resourceId) return anomalies;

    const pattern = baseline.actionPatterns[action.actionType];
    if (!pattern) return anomalies;

    // Check if accessing unusual resources
    if (!pattern.typicalResources.includes(action.resourceId)) {
      anomalies.push({
        timestamp: action.timestamp,
        anomalyType: "UNUSUAL_RESOURCE_ACCESS",
        severity: "medium",
        confidence: 0.5,
        details: {
          resourceId: action.resourceId,
          typicalResources: pattern.typicalResources.slice(0, 5), // Limit for brevity
        },
      });
    }

    return anomalies;
  }
}

/**
 * Detects unusual device fingerprints
 */
class DeviceFingerprintDetector extends AnomalyDetector {
  async detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];

    if (!baseline || !action.userAgent) return anomalies;

    const fingerprint = require("crypto")
      .createHash("md5")
      .update(action.userAgent)
      .digest("hex")
      .substring(0, 16);

    const typicalDevices = baseline.loginPatterns.deviceFingerprints;

    if (typicalDevices.length > 0 && !typicalDevices.includes(fingerprint)) {
      anomalies.push({
        timestamp: action.timestamp,
        anomalyType: "NEW_DEVICE_LOGIN",
        severity: "medium",
        confidence: 0.7,
        details: {
          deviceFingerprint: fingerprint,
          typicalDevices: typicalDevices.slice(0, 3),
        },
      });
    }

    return anomalies;
  }
}

// Export singleton instance
export const behavioralAnalytics = new BehavioralAnalytics();
