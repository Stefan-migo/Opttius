/**
 * Threat Detection — barrel.
 *
 * @module lib/security/threat-detection
 */

export { ThreatDetector, threatDetector } from "./engine";
export type {
  DeceptionAsset,
  MLModel,
  ThreatIndicator,
  ThreatIntelFeed,
  ZeroTrustEvaluation,
} from "./types";
