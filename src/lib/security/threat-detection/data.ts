/**
 * Threat Detection — Default data providers.
 *
 * Standalone data initialization functions extracted from ThreatDetector.
 *
 * @module lib/security/threat-detection/data
 */

import type { DeceptionAsset, MLModel, ThreatIntelFeed } from "./types";

export function loadDefaultThreatFeeds(): ThreatIntelFeed[] {
  return [
    {
      name: "Opttius Internal Threat Feed",
      url: "internal://threat-feed",
      format: "json",
      lastUpdate: new Date(),
      indicators: [
        {
          id: "ti-001",
          indicatorType: "ip_address",
          value: "192.168.1.100",
          severity: "high",
          confidence: 0.9,
          firstSeen: new Date(Date.now() - 86400000),
          lastSeen: new Date(),
          sources: ["internal-analysis"],
          tags: ["suspicious-login"],
        },
      ],
    },
  ];
}

export function createDefaultMLModels(): MLModel[] {
  return [
    {
      id: "ml-001",
      name: "User Behavior Anomaly Detector",
      type: "anomaly_detection",
      version: "1.0.0",
      accuracy: 0.92,
      lastTrained: new Date(Date.now() - 604800000),
      features: [
        "login_frequency",
        "access_patterns",
        "geolocation_changes",
        "device_fingerprints",
      ],
    },
    {
      id: "ml-002",
      name: "Threat Classification Model",
      type: "classification",
      version: "1.0.0",
      accuracy: 0.88,
      lastTrained: new Date(Date.now() - 1209600000),
      features: ["user_actions", "system_logs", "network_traffic"],
    },
  ];
}

export function createDefaultDeceptionAssets(): Map<string, DeceptionAsset> {
  const assets = new Map<string, DeceptionAsset>();
  assets.set("decoy-001", {
    id: "decoy-001",
    type: "fake_endpoint",
    location: "/api/internal/debug",
    purpose: "Detect unauthorized access attempts",
    deployed: true,
    triggeredEvents: [],
  });
  assets.set("decoy-002", {
    id: "decoy-002",
    type: "decoy_file",
    location: "/var/opttius/config/secrets.txt",
    purpose: "Detect file system reconnaissance",
    deployed: true,
    triggeredEvents: [],
  });
  return assets;
}
