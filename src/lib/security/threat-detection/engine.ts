/**
 * Threat Detection — ThreatDetector class.
 *
 * @module lib/security/threat-detection/engine
 */

import { appLogger as logger } from "@/lib/logger";

import { UserAction } from "../behavioral-analytics";
import { SecurityEvent, SecurityEventType } from "../events";
import {
  createDefaultDeceptionAssets,
  createDefaultMLModels,
  loadDefaultThreatFeeds,
} from "./data";
import {
  createThreatEvent,
  evaluateZeroTrust,
  interactsWithDeceptionAsset,
  matchesSuspiciousPattern,
  runAnomalyDetection,
  runClassification,
} from "./helpers";
import type {
  DeceptionAsset,
  MLModel,
  ThreatIndicator,
  ThreatIntelFeed,
} from "./types";

export class ThreatDetector {
  private threatFeeds: ThreatIntelFeed[] = [];
  private deceptionAssets: Map<string, DeceptionAsset> = new Map();
  private mlModels: MLModel[] = [];
  private zeroTrustEnabled: boolean = true;

  constructor() {
    this.initializeThreatDetection();
  }

  private async initializeThreatDetection(): Promise<void> {
    try {
      await this.loadThreatIntelFeeds();
      await this.initializeMLModels();
      await this.deployDeceptionAssets();
      logger.info("Threat detection system initialized", {
        threatFeeds: this.threatFeeds.length,
        mlModels: this.mlModels.length,
        deceptionAssets: this.deceptionAssets.size,
      });
    } catch (error) {
      logger.error("Failed to initialize threat detection system", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async analyzeUserBehavior(
    userId: string,
    actions: UserAction[],
  ): Promise<SecurityEvent[]> {
    const threats: SecurityEvent[] = [];
    try {
      for (const action of actions) {
        const intelMatches = await this.checkThreatIntel(action);
        if (intelMatches.length > 0) {
          threats.push(
            createThreatEvent(
              "system.suspicious_activity" as SecurityEventType,
              "high",
              userId,
              action.ipAddress,
              {
                matchedIndicators: intelMatches,
                actionType: action.actionType,
                resourceId: action.resourceId,
              },
            ),
          );
        }
      }

      const deceptionInteractions = await this.checkDeceptionInteractions(
        userId,
        actions,
      );
      threats.push(...deceptionInteractions);

      const zeroTrustEval = evaluateZeroTrust(
        this.zeroTrustEnabled,
        userId,
        actions,
      );
      if (zeroTrustEval.accessDecision === "deny") {
        threats.push(
          createThreatEvent(
            "authz.access_denied" as SecurityEventType,
            "critical",
            userId,
            undefined,
            {
              trustScore: zeroTrustEval.trustScore,
              failedVerifications: zeroTrustEval.verificationRequirements,
            },
          ),
        );
      }

      const mlThreats = await this.applyMLDetection(userId, actions);
      threats.push(...mlThreats);

      for (const threat of threats) {
        logger.warn("Threat detected", {
          eventType: threat.eventType,
          userId: threat.userId,
          severity: threat.severity,
          threatId: threat.id,
        });
      }
    } catch (error) {
      logger.error("Error in threat analysis", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
    }
    return threats;
  }

  private async checkThreatIntel(
    action: UserAction,
  ): Promise<ThreatIndicator[]> {
    const matches: ThreatIndicator[] = [];
    for (const feed of this.threatFeeds) {
      for (const indicator of feed.indicators) {
        let isMatch = false;
        switch (indicator.indicatorType) {
          case "ip_address":
            isMatch = action.ipAddress === indicator.value;
            break;
          case "user_agent":
            isMatch = action.userAgent === indicator.value;
            break;
          case "behavior_pattern":
            isMatch = matchesSuspiciousPattern(action, indicator.value);
            break;
        }
        if (isMatch) matches.push(indicator);
      }
    }
    return matches;
  }

  private async checkDeceptionInteractions(
    userId: string,
    actions: UserAction[],
  ): Promise<SecurityEvent[]> {
    const threats: SecurityEvent[] = [];
    for (const [, asset] of this.deceptionAssets) {
      if (!asset.deployed) continue;
      for (const action of actions) {
        if (interactsWithDeceptionAsset(action, asset)) {
          const threatEvent = createThreatEvent(
            "system.suspicious_activity" as SecurityEventType,
            "high",
            userId,
            action.ipAddress,
            {
              assetId: asset.id,
              assetType: asset.type,
              location: asset.location,
            },
          );
          asset.triggeredEvents.push(threatEvent);
          threats.push(threatEvent);
        }
      }
    }
    return threats;
  }

  private async applyMLDetection(
    userId: string,
    actions: UserAction[],
  ): Promise<SecurityEvent[]> {
    const threats: SecurityEvent[] = [];
    for (const model of this.mlModels) {
      switch (model.type) {
        case "anomaly_detection": {
          const anomalies = await runAnomalyDetection(model, userId, actions);
          threats.push(...anomalies);
          break;
        }
        case "classification": {
          const classifications = await runClassification(
            model,
            userId,
            actions,
          );
          threats.push(...classifications);
          break;
        }
      }
    }
    return threats;
  }

  private async loadThreatIntelFeeds(): Promise<void> {
    this.threatFeeds = loadDefaultThreatFeeds();
  }

  private async initializeMLModels(): Promise<void> {
    this.mlModels = createDefaultMLModels();
  }

  private async deployDeceptionAssets(): Promise<void> {
    this.deceptionAssets = createDefaultDeceptionAssets();
  }

  getStatus(): {
    threatFeeds: number;
    mlModels: number;
    deceptionAssets: number;
    zeroTrustEnabled: boolean;
  } {
    return {
      threatFeeds: this.threatFeeds.length,
      mlModels: this.mlModels.length,
      deceptionAssets: this.deceptionAssets.size,
      zeroTrustEnabled: this.zeroTrustEnabled,
    };
  }
}

// Export singleton instance
export const threatDetector = new ThreatDetector();
