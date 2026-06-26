/**
 * Security Shared Dependencies
 *
 * Shared re-exports to break import cycle between index.ts and integration.ts.
 *
 * @module lib/security/shared
 */

export { getSecurityAlerting } from "./alerting";
export { getSecurityMonitor } from "./monitoring";
