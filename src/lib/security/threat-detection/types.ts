/**
 * Threat Detection Types
 *
 * Type definitions for the threat detection system.
 *
 * @module lib/security/threat-detection/types
 */

import { SecurityEvent, SecuritySeverity } from "../events";

export interface ThreatIndicator {
  id: string;
  indicatorType:
    | "ip_address"
    | "user_agent"
    | "file_hash"
    | "domain"
    | "behavior_pattern";
  value: string;
  severity: SecuritySeverity;
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  sources: string[];
  tags: string[];
}

export interface ThreatIntelFeed {
  name: string;
  url: string;
  format: "stix" | "csv" | "json";
  lastUpdate: Date;
  indicators: ThreatIndicator[];
}

export interface ZeroTrustEvaluation {
  userId?: string;
  ipAddress?: string;
  deviceId?: string;
  resourceAccess: {
    resourceId: string;
    accessLevel: "read" | "write" | "admin";
    justification: string;
    riskScore: number;
  }[];
  trustScore: number;
  verificationRequirements: string[];
  accessDecision: "allow" | "deny" | "challenge";
}

export interface DeceptionAsset {
  id: string;
  type: "honeypot" | "decoy_file" | "fake_endpoint" | "bait_data";
  location: string;
  purpose: string;
  deployed: boolean;
  triggeredEvents: SecurityEvent[];
}

export interface MLModel {
  id: string;
  name: string;
  type: "anomaly_detection" | "classification" | "clustering";
  version: string;
  accuracy: number;
  lastTrained: Date;
  features: string[];
}
