/**
 * Incident Response — IncidentResponseEngine class.
 *
 * @module lib/security/incident-response/engine
 */

import { appLogger as logger } from "@/lib/logger";
import type { SecurityAlerting } from "@/lib/security/alerting";
import { getSecurityAlerting } from "@/lib/security/alerting";
import { SecurityEvent, SecuritySeverity } from "@/lib/security/events";

import {
  backupSecurityLogs,
  blockIPAddress,
  collectSecurityLogs,
  collectSystemInformation,
  extractSuspiciousIPs,
  moveSystemToQuarantine,
  sendIncidentAlerts,
  sendNotification,
} from "./helpers";
import {
  getRemediationSteps,
  loadContainmentStrategies,
  loadResponsePlaybooks,
} from "./playbooks";
import type {
  ContainmentStrategy,
  Incident,
  IncidentCategory,
  IncidentEvidence,
  ResponsePlaybook,
  ResponseStep,
} from "./types";

export { type Incident, type IncidentCategory, type ResponsePlaybook };

export class IncidentResponseEngine {
  private incidents: Map<string, Incident> = new Map();
  private playbooks: ResponsePlaybook[] = [];
  private containmentStrategies: ContainmentStrategy[] = [];
  private alerting: SecurityAlerting;

  constructor(alerting: SecurityAlerting) {
    this.alerting = alerting;
    this.initializeResponseSystem();
  }

  /**
   * Initialize incident response system
   */
  private async initializeResponseSystem(): Promise<void> {
    try {
      this.playbooks = await loadResponsePlaybooks();
      this.containmentStrategies = await loadContainmentStrategies();

      logger.info("Incident response system initialized", {
        playbooks: this.playbooks.length,
        containmentStrategies: this.containmentStrategies.length,
      });
    } catch (error) {
      logger.error("Failed to initialize incident response system", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Process security events and detect incidents
   */
  async processSecurityEvents(events: SecurityEvent[]): Promise<Incident[]> {
    const newIncidents: Incident[] = [];

    for (const event of events) {
      const incident = await this.analyzeEventForIncident(event);
      if (incident) {
        await this.registerIncident(incident);
        newIncidents.push(incident);

        // Trigger automated response
        await this.executeAutomatedResponse(incident);
      }
    }

    return newIncidents;
  }

  /**
   * Analyze security event for potential incident
   */
  private async analyzeEventForIncident(
    event: SecurityEvent,
  ): Promise<Incident | null> {
    // Match event to incident categories
    const category = this.categorizeEvent(event);
    if (!category) return null;

    // Determine severity and impact
    const severity = this.assessSeverity(event, category);
    const affectedAssets = this.identifyAffectedAssets(event);

    // Check for incident escalation patterns
    const escalationPattern = await this.checkEscalationPatterns(event);

    if (escalationPattern.shouldEscalate) {
      return this.createIncident(
        event,
        category,
        severity,
        affectedAssets,
        escalationPattern.evidence,
      );
    }

    return null;
  }

  /**
   * Register new incident
   */
  private async registerIncident(incident: Incident): Promise<void> {
    this.incidents.set(incident.id, incident);

    // Add to timeline
    incident.timeline.push({
      timestamp: new Date(),
      actor: "system",
      action: "Incident registered",
      details: `New ${incident.category} incident detected with ${incident.severity} severity`,
    });

    // Log incident
    logger.warn("Security incident registered", {
      incidentId: incident.id,
      category: incident.category,
      severity: incident.severity,
      affectedAssets: incident.affectedAssets.length,
    });

    // Send alerts
    await sendIncidentAlerts(incident, this.alerting);
  }

  /**
   * Execute automated response procedures
   */
  private async executeAutomatedResponse(incident: Incident): Promise<void> {
    try {
      // Find matching playbook
      const playbook = this.findMatchingPlaybook(incident);
      if (!playbook) {
        logger.warn("No matching playbook found for incident", {
          incidentId: incident.id,
          category: incident.category,
        });
        return;
      }

      // Execute playbook steps
      for (const step of playbook.responseSteps) {
        if (step.actionType === "automated") {
          await this.executeAutomatedStep(step, incident);
        }
      }

      // Update incident status
      incident.status = "investigating";
      incident.timeline.push({
        timestamp: new Date(),
        actor: "system",
        action: "Automated response initiated",
        details: `Executed playbook: ${playbook.name}`,
      });
    } catch (error) {
      logger.error("Failed to execute automated response", {
        error: error instanceof Error ? error.message : "Unknown error",
        incidentId: incident.id,
      });
    }
  }

  /**
   * Execute automated response step
   */
  private async executeAutomatedStep(
    step: ResponseStep,
    incident: Incident,
  ): Promise<void> {
    try {
      switch (step.id) {
        case "contain-network-access":
          await this.containNetworkAccess(incident);
          break;

        case "isolate-affected-systems":
          await this.isolateAffectedSystems(incident);
          break;

        case "collect-evidence":
          await this.collectDigitalEvidence(incident);
          break;

        case "notify-stakeholders":
          await this.notifyStakeholders(incident);
          break;

        case "backup-logs":
          await backupSecurityLogs(incident);
          break;
      }

      // Update timeline
      incident.timeline.push({
        timestamp: new Date(),
        actor: "system",
        action: `Executed: ${step.title}`,
        details: step.description,
      });
    } catch (error) {
      logger.error("Failed to execute automated step", {
        error: error instanceof Error ? error.message : "Unknown error",
        stepId: step.id,
        incidentId: incident.id,
      });
    }
  }

  /**
   * Containment actions
   */
  private async containNetworkAccess(incident: Incident): Promise<void> {
    // Block suspicious IP addresses
    const suspiciousIPs = extractSuspiciousIPs(incident);
    for (const ip of suspiciousIPs) {
      await blockIPAddress(ip);
    }

    logger.info("Network access contained", {
      incidentId: incident.id,
      blockedIPs: suspiciousIPs.length,
    });
  }

  private async isolateAffectedSystems(incident: Incident): Promise<void> {
    // Move affected systems to quarantine VLAN
    const affectedSystems = incident.affectedAssets.filter((asset) =>
      asset.startsWith("system:"),
    );
    for (const system of affectedSystems) {
      await moveSystemToQuarantine(system);
    }

    logger.info("Affected systems isolated", {
      incidentId: incident.id,
      isolatedSystems: affectedSystems.length,
    });
  }

  private async collectDigitalEvidence(incident: Incident): Promise<void> {
    // Collect logs, screenshots, and other evidence
    const evidence: IncidentEvidence[] = [];

    // Collect security logs
    evidence.push(await collectSecurityLogs(incident));

    // Collect system information
    evidence.push(await collectSystemInformation(incident));

    // Store evidence
    incident.evidence.push(...evidence);

    logger.info("Digital evidence collected", {
      incidentId: incident.id,
      evidenceCount: evidence.length,
    });
  }

  /**
   * Notification and communication
   */
  private async notifyStakeholders(incident: Incident): Promise<void> {
    const stakeholders = [
      "security-team@opttius.com",
      "it-operations@opttius.com",
      "management@opttius.com",
    ];

    const notification = {
      subject: `Security Incident ALERT: ${incident.title}`,
      body: `
Security Incident Details:
- ID: ${incident.id}
- Category: ${incident.category}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Detected: ${incident.detectedAt.toISOString()}
- Affected Assets: ${incident.affectedAssets.join(", ")}
Please review incident details and take appropriate action.
      `,
      priority: incident.severity === "critical" ? "high" : "normal",
    };

    // Send notifications
    for (const stakeholder of stakeholders) {
      await sendNotification(stakeholder, notification);
    }
  }

  /**
   * Helper methods for incident analysis
   */
  private categorizeEvent(event: SecurityEvent): IncidentCategory | null {
    const categoryMap: Record<string, IncidentCategory> = {
      "auth.login_failure": "unauthorized_access",
      "auth.account_locked": "unauthorized_access",
      "data.unauthorized_access": "data_breach",
      "system.malware_detected": "malware_infection",
      "network.ddos_attempt": "denial_of_service",
      "network.suspicious_ip": "insider_threat",
    };

    return categoryMap[event.eventType] || null;
  }

  private assessSeverity(
    event: SecurityEvent,
    category: IncidentCategory,
  ): SecuritySeverity {
    // Enhanced severity assessment logic
    if (event.severity === "critical") return "critical";

    const categorySeverity: Record<IncidentCategory, SecuritySeverity> = {
      data_breach: "critical",
      malware_infection: "high",
      denial_of_service: "high",
      unauthorized_access: "medium",
      phishing_attack: "medium",
      insider_threat: "high",
      configuration_error: "low",
      vulnerability_exploit: "high",
    };

    return categorySeverity[category] || "medium";
  }

  private identifyAffectedAssets(event: SecurityEvent): string[] {
    const assets: string[] = [];

    if (event.userId) {
      assets.push(`user:${event.userId}`);
    }

    if (event.ipAddress) {
      assets.push(`ip:${event.ipAddress}`);
    }

    // Add resource-specific assets
    if (event.details?.resourceId) {
      assets.push(`resource:${event.details.resourceId}`);
    }

    return assets;
  }

  private async checkEscalationPatterns(event: SecurityEvent): Promise<{
    shouldEscalate: boolean;
    evidence: string[];
  }> {
    // Check for escalation patterns like multiple failed logins, rapid escalation, etc.
    const evidence: string[] = [];
    let shouldEscalate = false;

    // Example escalation rules
    if (
      event.eventType === "auth.login_failure" &&
      Number(event.details?.attempts ?? 0) > 5
    ) {
      evidence.push("Multiple failed login attempts detected");
      shouldEscalate = true;
    }

    if (event.severity === "critical") {
      evidence.push("Critical severity event detected");
      shouldEscalate = true;
    }

    return { shouldEscalate, evidence };
  }

  private createIncident(
    _event: SecurityEvent,
    category: IncidentCategory,
    severity: SecuritySeverity,
    affectedAssets: string[],
    evidence: string[],
  ): Incident {
    return {
      id: `INC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: `${category.replace("_", " ").toUpperCase()} Incident`,
      description: `Automatically detected ${category} incident from security event`,
      severity,
      status: "detected",
      category,
      detectedAt: new Date(),
      responseTeam: ["security-analyst", "incident-responder"],
      affectedAssets,
      timeline: [],
      evidence: evidence.map((item, index) => ({
        id: `ev-${index}`,
        type: "log",
        source: "security-monitoring",
        content: item,
        timestamp: new Date(),
        description: "Automatic detection evidence",
      })),
      remediationSteps: getRemediationSteps(category),
    };
  }

  private findMatchingPlaybook(
    incident: Incident,
  ): ResponsePlaybook | undefined {
    return this.playbooks.find(
      (playbook) => playbook.category === incident.category,
    );
  }

  /**
   * Public API methods
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      (incident) => incident.status !== "closed",
    );
  }

  getIncidentById(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  async updateIncidentStatus(
    incidentId: string,
    status: Incident["status"],
  ): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.status = status;
      incident.timeline.push({
        timestamp: new Date(),
        actor: "analyst",
        action: `Status updated to ${status}`,
        details: "Manual status update",
      });

      logger.info("Incident status updated", {
        incidentId,
        newStatus: status,
      });
    }
  }
}

// Export singleton instance
export const incidentResponse = new IncidentResponseEngine(
  getSecurityAlerting(),
);
