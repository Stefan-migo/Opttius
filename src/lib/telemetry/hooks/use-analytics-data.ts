import { useCallback, useEffect, useState } from "react";

import { useTelemetry } from "./use-telemetry";

interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalEvents: number;
  avgSessionDuration: number;
}

interface FeatureUsage {
  name: string;
  usage: number;
  growth: number;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  topFeatures: FeatureUsage[];
  error?: string;
}

interface UseAnalyticsDataOptions {
  timeRange?: "7d" | "30d" | "90d";
  autoRefreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

export function useAnalyticsData({
  timeRange = "7d",
  autoRefreshInterval = 30000, // 30 seconds
  enabled = true,
}: UseAnalyticsDataOptions = {}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { trackFeatureUsage, trackError } = useTelemetry("use-analytics-data");

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const response = await fetch(`/api/telemetry/dashboard?days=${days}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Transform the raw data to our expected format
      const transformedData: AnalyticsData = {
        overview: {
          totalUsers: rawData.overview?.totalUsers || 0,
          activeUsers: rawData.overview?.activeUsers || 0,
          totalEvents: rawData.overview?.totalEvents || 0,
          avgSessionDuration: rawData.overview?.avgSessionDuration || 0,
        },
        topFeatures: rawData.topFeatures?.slice(0, 5) || [],
      };

      setData(transformedData);

      // Track successful data fetch
      trackFeatureUsage("analytics_data_fetched", {
        timeRange,
        totalUsers: transformedData.overview.totalUsers,
        featureCount: transformedData.topFeatures.length,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch analytics data";
      setError(errorMessage);
      trackError(err as Error, {
        context: "analytics_data_fetch",
        timeRange,
      });
      console.error("Analytics data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, enabled, trackFeatureUsage, trackError]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!enabled || autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchData, autoRefreshInterval, enabled]);

  // Manual refresh function
  const refresh = useCallback(() => {
    trackFeatureUsage("analytics_manual_refresh", { timeRange });
    fetchData();
  }, [fetchData, timeRange, trackFeatureUsage]);

  return {
    data,
    loading,
    error,
    refresh,
    timeRange,
  };
}
