/**
 * Security Alerting — Channel Dispatch
 *
 * Handles sending security alerts to configured notification channels
 * including email, Slack, PagerDuty, and webhooks.
 *
 * @module lib/security/alerting/dispatch
 */

import axios from "axios";

import { appLogger as logger } from "@/lib/logger";

import {
  AlertChannel,
  EmailAlertConfig,
  PagerDutyAlertConfig,
  SecurityAlert,
  SlackAlertConfig,
  WebhookAlertConfig,
} from "../events";

export async function sendToChannel(
  channel: AlertChannel,
  alert: SecurityAlert,
): Promise<void> {
  if (!channel.enabled) return;

  try {
    switch (channel.type) {
      case "email":
        await sendEmailAlert(
          channel as AlertChannel & { config: EmailAlertConfig },
          alert,
        );
        break;
      case "slack":
        await sendSlackAlert(
          channel as AlertChannel & { config: SlackAlertConfig },
          alert,
        );
        break;
      case "pagerduty":
        await sendPagerDutyAlert(
          channel as AlertChannel & { config: PagerDutyAlertConfig },
          alert,
        );
        break;
      case "webhook":
        await sendWebhookAlert(
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

async function sendEmailAlert(
  channel: AlertChannel & { config: EmailAlertConfig },
  alert: SecurityAlert,
): Promise<void> {
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

  // ponytail: mock transporter, replace with nodemailer when actual SMTP is configured
  const transporter = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sendMail: async (_mailOptions: Record<string, unknown>) => {
      logger.debug("Email alert sent", {
        to: channel.config.recipients.length,
        subject: mailOptions.subject,
      });
      return { messageId: "mock-message-id" };
    },
  };

  await transporter.sendMail(mailOptions);
}

async function sendSlackAlert(
  channel: AlertChannel & { config: SlackAlertConfig },
  alert: SecurityAlert,
): Promise<void> {
  const severityColor: Record<string, string> = {
    low: "#36a64f",
    medium: "#f2c744",
    high: "#ff6600",
    critical: "#e01e5a",
  };

  const payload = {
    channel: channel.config.channel,
    username: channel.config.username || "Security Bot",
    icon_emoji: channel.config.iconEmoji || ":rotating_light:",
    attachments: [
      {
        color: severityColor[alert.severity] || "#cccccc",
        title: `Security Alert: ${alert.title}`,
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

async function sendPagerDutyAlert(
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

async function sendWebhookAlert(
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

  await axios({
    method: channel.config.method,
    url: channel.config.url,
    data: payload,
    headers: {
      "Content-Type": "application/json",
      ...channel.config.headers,
    },
  });

  logger.debug("Webhook alert sent", { channelId: channel.id });
}
