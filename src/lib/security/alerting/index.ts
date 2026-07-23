/**
 * Security Alerting System
 *
 * Manages security alert routing and notification delivery across multiple channels.
 * Provides configurable alert thresholds, deduplication, and escalation procedures.
 *
 * @module lib/security/alerting
 */

import { appLogger as logger } from "@/lib/logger";

import {
  AlertChannel,
  SecurityAlert,
  SecurityEvent,
  SecuritySeverity,
} from "../events";
import { sendToChannel } from "./dispatch";
import {
  addToHistory,
  cleanupOldAlerts,
  getChannelsForSeverity,
  shouldDeduplicate,
} from "./rules";

// Re-export dispatch and rules
export { sendToChannel } from "./dispatch";
export {
  addToHistory,
  calculateStringSimilarity,
  cleanupOldAlerts,
  getChannelsForSeverity,
  shouldDeduplicate,
} from "./rules";

export class SecurityAlerting {
  private channels: AlertChannel[] = [];
  private alertHistory: SecurityAlert[] = [];
  private readonly ALERT_HISTORY_LIMIT = 1000;
  private readonly DEDUPLICATION_WINDOW = 5 * 60 * 1000; // 5 minutes

  constructor(channels: AlertChannel[] = []) {
    this.channels = channels;
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
    if (
      shouldDeduplicate(
        this.alertHistory,
        title,
        severity,
        this.DEDUPLICATION_WINDOW,
      )
    ) {
      logger.debug("Alert deduplicated", { title, severity });
      return;
    }

    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      severity,
      timestamp: new Date().toISOString(),
      relatedEvents,
      recommendedActions,
      status: "active",
    };

    this.alertHistory = addToHistory(
      this.alertHistory,
      alert,
      this.ALERT_HISTORY_LIMIT,
    );

    const eligibleChannels = getChannelsForSeverity(this.channels, severity);

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

    const sendPromises = eligibleChannels.map((channel) =>
      sendToChannel(channel, alert),
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
   * Get alert history with optional filters
   */
  getAlertHistory(filter?: {
    severity?: SecuritySeverity;
    status?: SecurityAlert["status"];
    timeframe?: number;
  }): SecurityAlert[] {
    let alerts = [...this.alertHistory].reverse();

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
   * Get alert statistics within a timeframe
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
    const initialLength = this.alertHistory.length;
    this.alertHistory = cleanupOldAlerts(this.alertHistory, retentionDays);

    if (initialLength > this.alertHistory.length) {
      logger.info("Cleaned up old alerts", {
        removedCount: initialLength - this.alertHistory.length,
        retentionDays,
      });
    }
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
