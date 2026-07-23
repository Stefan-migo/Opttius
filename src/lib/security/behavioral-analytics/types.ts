/**
 * Behavioral Analytics Types
 *
 * Type definitions and constants for the behavioral analytics system.
 *
 * @module lib/security/behavioral-analytics/types
 */

import { SecuritySeverity } from "../events";

export interface UserAction {
  userId: string;
  actionType: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
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
  details: Record<string, unknown>;
}

export interface ThreatAssessment {
  userId: string;
  riskScore: number;
  anomalies: AnomalyRecord[];
  recommendedActions: string[];
  immediateActions?: string[];
}

export const BEHAVIOR_REDIS_PREFIX = "behavior:";
export const BASELINE_EXPIRY = 30 * 24 * 60 * 60; // 30 days
export const ANOMALY_THRESHOLD = 0.7;
export const HIGH_RISK_THRESHOLD = 0.85;
