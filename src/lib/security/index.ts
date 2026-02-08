/**
 * Security Module Index
 *
 * Exports all security-related functionality for centralized access
 *
 * @module lib/security
 */

export { SecurityMonitor, getSecurityMonitor } from "./monitoring";

export { SecurityAlerting, getSecurityAlerting } from "./alerting";

export {
  withAuthSecurity,
  withRateLimitSecurity,
  withDataSecurity,
  securityMiddleware,
  paymentSecurity,
  type NextRequest,
  type NextResponse,
} from "./integration";

export * from "./events";

// Phase 3 Advanced Security Components
export {
  phase3Security,
  behavioralAnalytics,
  threatDetector,
  incidentResponse,
} from "./phase3-integration";

export type {
  UserAction,
  BehaviorBaseline,
  ThreatAssessment,
} from "./behavioral-analytics";

export type {
  ThreatIndicator,
  ZeroTrustEvaluation,
  DeceptionAsset,
} from "./threat-detection";

export type {
  Incident,
  IncidentCategory,
  ResponsePlaybook,
} from "./incident-response";
