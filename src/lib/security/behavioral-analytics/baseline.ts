/**
 * Behavioral Analytics — Baseline Management
 *
 * Functions for creating and updating user behavior baselines
 * used by the BehavioralAnalytics engine.
 *
 * @module lib/security/behavioral-analytics/baseline
 */

import { BehaviorBaseline, UserAction } from "./types";

/**
 * Create initial behavior baseline for user
 */
export function createInitialBaseline(userId: string): BehaviorBaseline {
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
export function updateActionPatterns(
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

  const hour = action.timestamp.getHours();
  if (!pattern.timeOfDay.includes(hour)) {
    pattern.timeOfDay.push(hour);
  }

  if (action.resourceId) {
    if (!pattern.typicalResources.includes(action.resourceId)) {
      pattern.typicalResources.push(action.resourceId);
    }
  }
}

/**
 * Update login patterns in baseline
 */
export function updateLoginPatterns(
  baseline: BehaviorBaseline,
  action: UserAction,
): void {
  const hour = action.timestamp.getHours();
  if (!baseline.loginPatterns.typicalTimes.includes(hour)) {
    baseline.loginPatterns.typicalTimes.push(hour);
  }

  if (action.ipAddress) {
    const parts = action.ipAddress.split(".");
    const location =
      parts.length === 4 ? `${parts[0]}.${parts[1]}.0.0` : "unknown";
    if (!baseline.loginPatterns.typicalLocations.includes(location)) {
      baseline.loginPatterns.typicalLocations.push(location);
    }
  }

  if (action.userAgent) {
    const fingerprint = require("crypto")
      .createHash("md5")
      .update(action.userAgent)
      .digest("hex")
      .substring(0, 16);
    if (
      !baseline.loginPatterns.deviceFingerprints.includes(fingerprint)
    ) {
      baseline.loginPatterns.deviceFingerprints.push(fingerprint);
    }
  }
}

/**
 * Update user risk profile based on action
 */
export function updateRiskProfile(
  baseline: BehaviorBaseline,
  action: UserAction,
): void {
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
  baseline.riskProfile.recentActivityScore *= 0.95;
}
