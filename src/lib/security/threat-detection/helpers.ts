/**
 * Threat Detection — Utility helpers.
 *
 * Standalone helper functions extracted from ThreatDetector.
 *
 * @module lib/security/threat-detection/helpers
 */

import type { UserAction } from "../behavioral-analytics";
import { SecurityEvent, SecurityEventType, SecuritySeverity } from "../events";
import type { DeceptionAsset, MLModel, ZeroTrustEvaluation } from "./types";

export function createThreatEvent(
  eventType: string,
  severity: SecuritySeverity,
  userId?: string,
  ipAddress?: string,
  details?: Record<string, unknown>,
): SecurityEvent {
  return {
    id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType: eventType as SecurityEventType,
    severity,
    source: "threat-detection",
    userId,
    ipAddress,
    details: details || {},
  };
}

export function matchesSuspiciousPattern(
  _action: UserAction,
  _pattern: string,
): boolean {
  return false;
}

export function interactsWithDeceptionAsset(
  action: UserAction,
  asset: DeceptionAsset,
): boolean {
  return action.resourceId === asset.location;
}

export async function collectTrustEvidence(
  userId: string,
  actions: UserAction[],
): Promise<{
  userId: string;
  recentActions: number;
  unusualPatterns: number;
  verificationHistory: string[];
  deviceConsistency: number;
}> {
  return {
    userId,
    recentActions: actions.length,
    unusualPatterns: 0,
    verificationHistory: [],
    deviceConsistency: 1.0,
  };
}

export function calculateTrustScore(evidence: {
  unusualPatterns: number;
}): number {
  return Math.max(0.1, Math.min(0.9, 1.0 - evidence.unusualPatterns * 0.2));
}

export function determineVerificationRequirements(
  evidence: { deviceConsistency: number },
  trustScore: number,
): string[] {
  const requirements: string[] = [];
  if (trustScore < 0.5) requirements.push("multi_factor_auth");
  if (evidence.deviceConsistency < 0.8)
    requirements.push("device_verification");
  return requirements;
}

export function makeAccessDecision(
  trustScore: number,
  requirements: string[],
): "allow" | "deny" | "challenge" {
  if (trustScore < 0.3) return "deny";
  if (requirements.length > 0) return "challenge";
  return "allow";
}

export function determineAccessLevel(
  actionType: string,
): "read" | "write" | "admin" {
  const adminActions = ["admin_access", "user_management", "system_config"];
  const writeActions = ["data_export", "payment_processing", "create_resource"];
  if (adminActions.includes(actionType)) return "admin";
  if (writeActions.includes(actionType)) return "write";
  return "read";
}

export function evaluateZeroTrust(
  zeroTrustEnabled: boolean,
  userId: string,
  actions: UserAction[],
): ZeroTrustEvaluation {
  if (!zeroTrustEnabled) {
    return {
      userId,
      resourceAccess: [],
      trustScore: 0.8,
      verificationRequirements: [],
      accessDecision: "allow",
    };
  }

  const evidence = {
    userId,
    recentActions: actions.length,
    unusualPatterns: 0,
    verificationHistory: [] as string[],
    deviceConsistency: 1.0,
  };

  const trustScore = calculateTrustScore(evidence);
  const verificationRequirements = determineVerificationRequirements(
    evidence,
    trustScore,
  );
  const accessDecision = makeAccessDecision(
    trustScore,
    verificationRequirements,
  );

  return {
    userId,
    trustScore,
    verificationRequirements,
    accessDecision,
    resourceAccess: actions.map((action) => ({
      resourceId: action.resourceId || "unknown",
      accessLevel: determineAccessLevel(action.actionType),
      justification: "Behavioral analysis",
      riskScore: 1 - trustScore,
    })),
  };
}

export async function runAnomalyDetection(
  _model: MLModel,
  _userId: string,
  _actions: UserAction[],
): Promise<SecurityEvent[]> {
  return [];
}

export async function runClassification(
  _model: MLModel,
  _userId: string,
  _actions: UserAction[],
): Promise<SecurityEvent[]> {
  return [];
}
