import axios from "axios";
import nodemailer from "nodemailer";
import { appLogger as logger } from "@/lib/logger";
import {
  SecurityAlert,
  SecurityEvent,
  SecuritySeverity,
  AlertChannel,
  EmailAlertConfig,
  SlackAlertConfig,
  PagerDutyAlertConfig,
  WebhookAlertConfig,
  generateAlertId,
} from "./events";

/**
 * Security Alerting System
 *
 * Manages security alert routing and notification delivery across multiple channels.
 * Provides configurable alert thresholds, deduplication, and escalation procedures.
 *
 * @module lib/security/alerting
 */

export class SecurityAlerting {
  private channels: AlertChannel[] = [];
  private alertHistory: SecurityAlert[] = [];
  private transporter: nodemailer.Transporter | null = null;
  private readonly ALERT_HISTORY_LIMIT = 1000;
  private readonly DEDUPLICATION_WINDOW = 5 * 60 * 1000; // 5 minutes

  constructor(channels: AlertChannel[] = []) {
    this.channels = channels;
    this.initializeEmailTransport();
  }

  /**
   * Send a security alert through configured channels
   */
  async sendAlert(
    title: string,
    description: string,
    severity: SecuritySeverity,
    relatedEvents: SecurityEvent[] = [],
    recommendedActions: string[] = [],
  ): Promise<void> {
    // Check if alert should be deduplicated
    if (this.shouldDeduplicate(title, severity, relatedEvents)) {
      logger.debug("Alert deduplicated", { title, severity });
      return;
    }

    const alert: SecurityAlert = {
      id: generateAlertId(),
      title,
      description,
      severity,
      timestamp: new Date().toISOString(),
      relatedEvents,
      recommendedActions,
      status: "active",
    };

    // Add to history
    this.addToHistory(alert);

    // Get channels for this severity level
    const eligibleChannels = this.getChannelsForSeverity(severity);

    if (eligibleChannels.length === 0) {
      logger.warn("No alert channels configured for severity", { severity });
      return;
    }

    logger.info("Sending security alert", {
      alertId: alert.id,
      title: alert.title,
      severity: alert.severity,
      channelCount: eligibleChannels.length,
    });

    // Send to all eligible channels concurrently
    const sendPromises = eligibleChannels.map((channel) =>
      this.sendToChannel(channel, alert),
    );

    try {
      await Promise.allSettled(sendPromises);
    } catch (error) {
      logger.error("Error sending security alerts", error);
    }
  }

  /**
   * Add alert channel configuration
   */
  addChannel(channel: AlertChannel): void {
    this.channels.push(channel);
    logger.info("Alert channel added", {
      channelId: channel.id,
      type: channel.type,
      severityThreshold: channel.severityThreshold,
    });
  }

  /**
   * Remove alert channel
   */
  removeChannel(channelId: string): boolean {
    const initialLength = this.channels.length;
    this.channels = this.channels.filter((c) => c.id !== channelId);
    return this.channels.length < initialLength;
  }

  /**
   * Update alert channel configuration
   */
  updateChannel(channelId: string, updates: Partial<AlertChannel>): boolean {
    const channel = this.channels.find((c) => c.id === channelId);
    if (channel) {
      Object.assign(channel, updates);
      logger.info("Alert channel updated", { channelId, updates });
      return true;
    }
    return false;
  }

  /**
   * Get alert history
   */
  getAlertHistory(filter?: {
    severity?: SecuritySeverity;
    status?: SecurityAlert["status"];
    timeframe?: number; // milliseconds
  }): SecurityAlert[] {
    let alerts = [...this.alertHistory].reverse(); // Most recent first

    if (filter) {
      if (filter.severity) {
        alerts = alerts.filter((a) => a.severity === filter.severity);
      }
      if (filter.status) {
        alerts = alerts.filter((a) => a.status === filter.status);
      }
      if (filter.timeframe) {
        const cutoffTime = Date.now() - filter.timeframe;
        alerts = alerts.filter(
          (a) => new Date(a.timestamp).getTime() > cutoffTime,
        );
      }
    }

    return alerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (alert && alert.status === "active") {
      alert.status = "acknowledged";
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();
      logger.info("Alert acknowledged", { alertId, acknowledgedBy });
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolutionNotes?: string): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (
      alert &&
      (alert.status === "active" || alert.status === "acknowledged")
    ) {
      alert.status = "resolved";
      alert.resolutionNotes = resolutionNotes;
      logger.info("Alert resolved", { alertId, resolutionNotes });
      return true;
    }
    return false;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(timeframe: number = 24 * 60 * 60 * 1000): {
    totalAlerts: number;
    alertsBySeverity: Record<SecuritySeverity, number>;
    alertsByStatus: Record<SecurityAlert["status"], number>;
    averageResponseTime: number;
  } {
    const cutoffTime = Date.now() - timeframe;
    const recentAlerts = this.alertHistory.filter(
      (a) => new Date(a.timestamp).getTime() > cutoffTime,
    );

    const stats = {
      totalAlerts: recentAlerts.length,
      alertsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      } as Record<SecuritySeverity, number>,
      alertsByStatus: {
        active: 0,
        acknowledged: 0,
        resolved: 0,
        dismissed: 0,
      } as Record<SecurityAlert["status"], number>,
      averageResponseTime: 0,
    };

    let totalResponseTime = 0;
    let resolvedCount = 0;

    for (const alert of recentAlerts) {
      stats.alertsBySeverity[alert.severity]++;
      stats.alertsByStatus[alert.status]++;

      if (alert.acknowledgedAt) {
        const createTime = new Date(alert.timestamp).getTime();
        const ackTime = new Date(alert.acknowledgedAt).getTime();
        totalResponseTime += ackTime - createTime;
        resolvedCount++;
      }
    }

    stats.averageResponseTime =
      resolvedCount > 0 ? Math.round(totalResponseTime / resolvedCount) : 0;

    return stats;
  }

  /**
   * Clean up old alerts based on retention policy
   */
  cleanupOldAlerts(retentionDays: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffTimestamp = cutoffDate.getTime();

    const initialLength = this.alertHistory.length;
    this.alertHistory = this.alertHistory.filter(
      (alert) => new Date(alert.timestamp).getTime() > cutoffTimestamp,
    );

    if (initialLength > this.alertHistory.length) {
      logger.info("Cleaned up old alerts", {
        removedCount: initialLength - this.alertHistory.length,
        retentionDays,
      });
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(
    channel: AlertChannel,
    alert: SecurityAlert,
  ): Promise<void> {
    if (!channel.enabled) {
      return;
    }

    try {
      switch (channel.type) {
        case "email":
          await this.sendEmailAlert(
            channel as AlertChannel & { config: EmailAlertConfig },
            alert,
          );
          break;
        case "slack":
          await this.sendSlackAlert(
            channel as AlertChannel & { config: SlackAlertConfig },
            alert,
          );
          break;
        case "pagerduty":
          await this.sendPagerDutyAlert(
            channel as AlertChannel & { config: PagerDutyAlertConfig },
            alert,
          );
          break;
        case "webhook":
          await this.sendWebhookAlert(
            channel as AlertChannel & { config: WebhookAlertConfig },
            alert,
          );
          break;
        default:
          logger.warn("Unknown alert channel type", { type: channel.type });
      }
    } catch (error) {
      logger.error(`Failed to send alert to ${channel.type} channel`, error);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    channel: AlertChannel & { config: EmailAlertConfig },
    alert: SecurityAlert,
  ): Promise<void> {
    if (!this.transporter) {
      throw new Error("Email transporter not initialized");
    }

    const mailOptions = {
      from: channel.config.smtp.auth.user,
      to: channel.config.recipients.join(", "),
      subject: `[SECURITY ALERT] ${alert.title}`,
      html: `
        <h2>Security Alert: ${alert.title}</h2>
        <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
        <p><strong>Description:</strong> ${alert.description}</p>
        <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
        
        ${
          alert.relatedEvents.length > 0
            ? `
          <h3>Related Events (${alert.relatedEvents.length})</h3>
          <ul>
            ${alert.relatedEvents
              .map(
                (event) => `
              <li>${event.eventType} - ${event.ipAddress || "Unknown IP"}</li>
            `,
              )
              .join("")}
          </ul>
        `
            : ""
        }
        
        ${
          alert.recommendedActions.length > 0
            ? `
          <h3>Recommended Actions</h3>
          <ul>
            ${alert.recommendedActions.map((action) => `<li>${action}</li>`).join("")}
          </ul>
        `
            : ""
        }
        
        <hr>
        <p><small>Alert ID: ${alert.id}</small></p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    logger.debug("Email alert sent", {
      channelId: channel.id,
      recipients: channel.config.recipients.length,
    });
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(
    channel: AlertChannel & { config: SlackAlertConfig },
    alert: SecurityAlert,
  ): Promise<void> {
    const severityColor = {
      low: "#36a64f",
      medium: "#f2c744",
      high: "#ff6600",
      critical: "#e01e5a",
    }[alert.severity];

    const payload = {
      channel: channel.config.channel,
      username: channel.config.username || "Security Bot",
      icon_emoji: channel.config.iconEmoji || ":rotating_light:",
      attachments: [
        {
          color: severityColor,
          title: `🚨 Security Alert: ${alert.title}`,
          fields: [
            {
              title: "Severity",
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: "Time",
              value: new Date(alert.timestamp).toLocaleString(),
              short: true,
            },
            {
              title: "Description",
              value: alert.description,
              short: false,
            },
          ],
          footer: `Alert ID: ${alert.id}`,
        },
      ],
    };

    await axios.post(channel.config.webhookUrl, payload);
    logger.debug("Slack alert sent", { channelId: channel.id });
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(
    channel: AlertChannel & { config: PagerDutyAlertConfig },
    alert: SecurityAlert,
  ): Promise<void> {
    const payload = {
      payload: {
        summary: `${alert.title} - ${alert.description}`,
        severity: alert.severity,
        source: "opttius-security-monitoring",
        timestamp: alert.timestamp,
        custom_details: {
          alertId: alert.id,
          relatedEvents: alert.relatedEvents.length,
          recommendedActions: alert.recommendedActions,
        },
      },
      routing_key: channel.config.integrationKey,
      event_action: "trigger",
      dedup_key: `security-alert-${alert.id}`,
    };

    await axios.post("https://events.pagerduty.com/v2/enqueue", payload);
    logger.debug("PagerDuty alert sent", { channelId: channel.id });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    channel: AlertChannel & { config: WebhookAlertConfig },
    alert: SecurityAlert,
  ): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        timestamp: alert.timestamp,
        status: alert.status,
        relatedEvents: alert.relatedEvents,
        recommendedActions: alert.recommendedActions,
      },
    };

    const headers = {
      "Content-Type": "application/json",
      ...channel.config.headers,
    };

    await axios({
      method: channel.config.method,
      url: channel.config.url,
      data: payload,
      headers,
    });

    logger.debug("Webhook alert sent", { channelId: channel.id });
  }

  /**
   * Get channels eligible for specific severity
   */
  private getChannelsForSeverity(severity: SecuritySeverity): AlertChannel[] {
    const severityLevels: SecuritySeverity[] = [
      "low",
      "medium",
      "high",
      "critical",
    ];
    const severityIndex = severityLevels.indexOf(severity);

    return this.channels.filter((channel) => {
      const channelSeverityIndex = severityLevels.indexOf(
        channel.severityThreshold,
      );
      return channel.enabled && severityIndex >= channelSeverityIndex;
    });
  }

  /**
   * Check if alert should be deduplicated
   */
  private shouldDeduplicate(
    title: string,
    severity: SecuritySeverity,
    events: SecurityEvent[],
  ): boolean {
    const now = Date.now();
    const cutoffTime = now - this.DEDUPLICATION_WINDOW;

    return this.alertHistory.some((alert) => {
      if (new Date(alert.timestamp).getTime() < cutoffTime) {
        return false;
      }

      // Simple deduplication based on title similarity
      const titleSimilarity = this.calculateStringSimilarity(
        alert.title,
        title,
      );
      return titleSimilarity > 0.8 && alert.severity === severity;
    });
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + substitutionCost, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Add alert to history with size management
   */
  private addToHistory(alert: SecurityAlert): void {
    this.alertHistory.unshift(alert);

    // Keep history within limits
    if (this.alertHistory.length > this.ALERT_HISTORY_LIMIT) {
      this.alertHistory = this.alertHistory.slice(0, this.ALERT_HISTORY_LIMIT);
    }
  }

  /**
   * Initialize email transporter
   */
  private initializeEmailTransport(): void {
    // In a real implementation, this would be configured with actual SMTP settings
    // For now, we'll create a mock transporter for testing
    this.transporter = {
      sendMail: async (mailOptions) => {
        logger.debug("Mock email sent", {
          to: mailOptions.to,
          subject: mailOptions.subject,
        });
        return { messageId: "mock-message-id" };
      },
    } as unknown as nodemailer.Transporter;
  }
}

// Export singleton instance
let securityAlerting: SecurityAlerting | null = null;

export function getSecurityAlerting(): SecurityAlerting {
  if (!securityAlerting) {
    securityAlerting = new SecurityAlerting();
  }
  return securityAlerting;
}

// Export types
export type { SecurityAlerting };
