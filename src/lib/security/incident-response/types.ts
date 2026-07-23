/**
 * Incident Response — Type definitions.
 *
 * @module lib/security/incident-response/types
 */

import type { SecuritySeverity } from "@/lib/security/events";

export type IncidentCategory =
  | "unauthorized_access"
  | "data_breach"
  | "malware_infection"
  | "denial_of_service"
  | "phishing_attack"
  | "insider_threat"
  | "configuration_error"
  | "vulnerability_exploit";

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  status:
    | "detected"
    | "investigating"
    | "contained"
    | "eradicated"
    | "recovered"
    | "closed";
  category: IncidentCategory;
  detectedAt: Date;
  assignedTo?: string;
  responseTeam: string[];
  affectedAssets: string[];
  timeline: IncidentTimelineEvent[];
  evidence: IncidentEvidence[];
  remediationSteps: string[];
  lessonsLearned?: string[];
}

export interface IncidentTimelineEvent {
  timestamp: Date;
  actor: string;
  action: string;
  details: string;
}

export interface IncidentEvidence {
  id: string;
  type: "log" | "screenshot" | "network_capture" | "file" | "email";
  source: string;
  content: string | Buffer;
  timestamp: Date;
  description: string;
}

export interface ResponsePlaybook {
  id: string;
  name: string;
  category: IncidentCategory;
  triggerConditions: string[];
  responseSteps: ResponseStep[];
  escalationPath: string[];
  requiredResources: string[];
  estimatedResolutionTime: string;
}

export interface ResponseStep {
  id: string;
  title: string;
  description: string;
  actionType: "automated" | "manual" | "notification";
  responsibleTeam: string;
  dependencies: string[];
  timeout?: number;
}

export interface ContainmentStrategy {
  id: string;
  name: string;
  description: string;
  actions: string[];
  rollbackPlan: string[];
  impactAssessment: string;
}
