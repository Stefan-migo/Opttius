/**
 * Security Module Index
 *
 * Exports all security-related functionality for centralized access
 *
 * @module lib/security
 */

export type { SecurityAlerting } from "./alerting";
export * from "./events";
export {
  type NextRequest,
  type NextResponse,
  paymentSecurity,
  securityMiddleware,
  withAuthSecurity,
  withDataSecurity,
} from "./integration";
export type { SecurityMonitor } from "./monitoring";
export { getSecurityAlerting } from "./shared";
export { getSecurityMonitor } from "./shared";

// Phase 3 Advanced Security Components
export type {
  BehaviorBaseline,
  ThreatAssessment,
  UserAction,
} from "./behavioral-analytics";
export type {
  Incident,
  IncidentCategory,
  ResponsePlaybook,
} from "./incident-response";
export {
  behavioralAnalytics,
  incidentResponse,
  phase3Security,
  threatDetector,
} from "./phase3-integration";
export type {
  DeceptionAsset,
  ThreatIndicator,
  ZeroTrustEvaluation,
} from "./threat-detection";
