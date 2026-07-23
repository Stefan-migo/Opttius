/**
 * Incident Response — barrel.
 *
 * @module lib/security/incident-response
 */

export { incidentResponse,IncidentResponseEngine } from "./engine";
export type {
  ContainmentStrategy,
  Incident,
  IncidentCategory,
  IncidentEvidence,
  IncidentTimelineEvent,
  ResponsePlaybook,
  ResponseStep,
} from "./types";
