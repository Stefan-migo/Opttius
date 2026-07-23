/**
 * Incident Response — Utility helpers.
 *
 * @module lib/security/incident-response/helpers
 */

import { appLogger as logger } from "@/lib/logger";
import type { SecurityAlerting } from "@/lib/security/alerting";

import type { Incident, IncidentEvidence } from "./types";

export const extractSuspiciousIPs = (incident: Incident): string[] =>
  incident.affectedAssets
    .filter((asset) => asset.startsWith("ip:"))
    .map((asset) => asset.split(":")[1]);

export async function blockIPAddress(ip: string): Promise<void> {
  // ponytail: placeholder — integrate with firewall/NIDS when available
  logger.info(`Blocking IP address: ${ip}`);
}

export async function moveSystemToQuarantine(system: string): Promise<void> {
  // ponytail: placeholder — integrate with network management when available
  logger.info(`Moving system to quarantine: ${system}`);
}

export async function collectSecurityLogs(
  _incident: Incident,
): Promise<IncidentEvidence> {
  return {
    id: "ev-logs",
    type: "log",
    source: "security-monitoring",
    content: "Security logs collected during incident",
    timestamp: new Date(),
    description: "Complete security log dump",
  };
}

export async function collectSystemInformation(
  _incident: Incident,
): Promise<IncidentEvidence> {
  return {
    id: "ev-system",
    type: "log",
    source: "system-information",
    content: "System configuration and process information",
    timestamp: new Date(),
    description: "System state information at time of incident",
  };
}

export async function backupSecurityLogs(incident: Incident): Promise<void> {
  // ponytail: placeholder — backup to secure storage when available
  logger.info("Backing up security logs for incident", {
    incidentId: incident.id,
  });
}

export async function sendNotification(
  recipient: string,
  notification: { subject: string; body: string; priority: string },
): Promise<void> {
  // ponytail: placeholder — integrate with notification system when available
  logger.info(`Sending notification to ${recipient}`, {
    subject: notification.subject,
  });
}

export async function sendIncidentAlerts(
  incident: Incident,
  alerting: SecurityAlerting,
): Promise<void> {
  await alerting.sendAlert(
    `Security Incident: ${incident.title}`,
    `Category: ${incident.category}\nSeverity: ${incident.severity}\nStatus: ${incident.status}\nAffected Assets: ${incident.affectedAssets.join(", ")}`,
    incident.severity,
    [],
    [`Investigate incident ${incident.id}`, "Update stakeholders"],
  );
}
