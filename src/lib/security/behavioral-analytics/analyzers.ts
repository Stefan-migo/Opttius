/**
 * Behavioral Analytics — Anomaly Detectors
 *
 * Anomaly detection algorithms for identifying unusual user behavior
 * patterns that may indicate security threats.
 *
 * @module lib/security/behavioral-analytics/analyzers
 */

import { AnomalyRecord, BehaviorBaseline, UserAction } from "./types";

/**
 * Abstract base class for anomaly detectors
 */
export abstract class AnomalyDetector {
  abstract detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]>;
}

/**
 * Detects unusual frequency of actions
 */
export class FrequencyAnomalyDetector extends AnomalyDetector {
  async detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];

    if (!baseline) return anomalies;

    const pattern = baseline.actionPatterns[action.actionType];
    if (!pattern) return anomalies;

    const expectedFrequency = pattern.frequency / 100; // Normalize
    const currentFrequency = 1; // This is a single action

    if (currentFrequency > expectedFrequency * 3) {
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
export class TimingAnomalyDetector extends AnomalyDetector {
  async detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];

    if (!baseline) return anomalies;

    const hour = action.timestamp.getHours();

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
export class LocationAnomalyDetector extends AnomalyDetector {
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
export class ResourceAccessAnomalyDetector extends AnomalyDetector {
  async detect(
    action: UserAction,
    baseline: BehaviorBaseline | undefined,
  ): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];

    if (!baseline || !action.resourceId) return anomalies;

    const pattern = baseline.actionPatterns[action.actionType];
    if (!pattern) return anomalies;

    if (!pattern.typicalResources.includes(action.resourceId)) {
      anomalies.push({
        timestamp: action.timestamp,
        anomalyType: "UNUSUAL_RESOURCE_ACCESS",
        severity: "medium",
        confidence: 0.5,
        details: {
          resourceId: action.resourceId,
          typicalResources: pattern.typicalResources.slice(0, 5),
        },
      });
    }

    return anomalies;
  }
}

/**
 * Detects unusual device fingerprints
 */
export class DeviceFingerprintDetector extends AnomalyDetector {
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
