"use client";

import React, { useEffect } from "react";

import { useTelemetry } from "@/lib/telemetry/hooks/use-telemetry";

interface TelemetryProviderProps {
  children: React.ReactNode;
  userId?: string;
  organizationId?: string;
  appName?: string;
}

export function TelemetryProvider({
  children,
  userId,
  organizationId,
  appName = "Opttius",
}: TelemetryProviderProps) {
  const { trackFeatureUsage, telemetryCollector } =
    useTelemetry("telemetry-provider");

  useEffect(() => {
    // Check if telemetry is enabled globally using the public endpoint
    fetch("/api/telemetry/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.enabled !== undefined) {
          telemetryCollector.setEnabled(data.enabled);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch global telemetry status");
      });

    // Track app initialization
    if (typeof window !== "undefined") {
      trackFeatureUsage("app_initialized", {
        userId,
        organizationId,
        appName,
        timestamp: new Date().toISOString(),
      });
    }

    // Track initial page view
    if (typeof window !== "undefined") {
      trackFeatureUsage("page_view", {
        pageUrl: window.location.href,
        pageTitle: document.title,
        timestamp: new Date().toISOString(),
      });
    }

    // Simple page visibility tracking
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackFeatureUsage("page_hidden", {
          timestamp: new Date().toISOString(),
        });
      } else {
        trackFeatureUsage("page_visible", {
          timestamp: new Date().toISOString(),
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [trackFeatureUsage, userId, organizationId, appName]);

  return <>{children}</>;
}
