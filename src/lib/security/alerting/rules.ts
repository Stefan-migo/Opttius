/**
 * Security Alerting — Rules Engine
 *
 * Alert deduplication, severity routing, and lifecycle management helpers.
 *
 * @module lib/security/alerting/rules
 */

import { AlertChannel, SecurityAlert, SecuritySeverity } from "../events";

/**
 * Get channels eligible for a given severity level
 */
export function getChannelsForSeverity(
  channels: AlertChannel[],
  severity: SecuritySeverity,
): AlertChannel[] {
  const severityLevels: SecuritySeverity[] = [
    "low",
    "medium",
    "high",
    "critical",
  ];
  const severityIndex = severityLevels.indexOf(severity);

  return channels.filter((channel) => {
    const channelSeverityIndex = severityLevels.indexOf(
      channel.severityThreshold,
    );
    return channel.enabled && severityIndex >= channelSeverityIndex;
  });
}

/**
 * Check if an alert should be deduplicated based on recent history
 */
export function shouldDeduplicate(
  alertHistory: SecurityAlert[],
  title: string,
  severity: SecuritySeverity,
  dedupWindowMs: number,
): boolean {
  const now = Date.now();
  const cutoffTime = now - dedupWindowMs;

  return alertHistory.some((alert) => {
    if (new Date(alert.timestamp).getTime() < cutoffTime) return false;

    const similarity = calculateStringSimilarity(alert.title, title);
    return similarity > 0.8 && alert.severity === severity;
  });
}

/**
 * Add alert to history, keeping within the configured limit
 */
export function addToHistory(
  alertHistory: SecurityAlert[],
  alert: SecurityAlert,
  limit: number,
): SecurityAlert[] {
  const updated = [alert, ...alertHistory];
  return updated.length > limit ? updated.slice(0, limit) : updated;
}

/**
 * Remove alerts older than the retention period
 */
export function cleanupOldAlerts(
  alertHistory: SecurityAlert[],
  retentionDays: number,
): SecurityAlert[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffTimestamp = cutoffDate.getTime();

  return alertHistory.filter(
    (alert) => new Date(alert.timestamp).getTime() > cutoffTimestamp,
  );
}

/**
 * Calculate string similarity (0..1) using Levenshtein distance
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost,
      );
    }
  }

  return matrix[str2.length][str1.length];
}
