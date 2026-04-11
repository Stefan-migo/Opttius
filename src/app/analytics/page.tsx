"use client";

import React, { useEffect, useState } from "react";

import { useTelemetry } from "@/lib/telemetry/hooks/use-telemetry";

interface DashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalEvents: number;
    avgSessionDuration: number;
  };
  trends: {
    dailyActiveUsers: Array<{ date: string; count: number }>;
    featureUsage: Array<{ feature: string; usage: number }>;
    performanceMetrics: Array<{
      metric: string;
      value: number;
      trend: "up" | "down";
    }>;
  };
  topFeatures: Array<{ name: string; usage: number; growth: number }>;
  errorRates: Array<{ type: string; rate: number; change: number }>;
}

export default function UsageAnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const { trackFeatureUsage } = useTelemetry("UsageAnalyticsDashboard");

  useEffect(() => {
    // Track dashboard usage (only after component mounts)
    if (typeof window !== "undefined") {
      trackFeatureUsage("usage_dashboard_view", { timeRange });
    }
  }, [timeRange, trackFeatureUsage]);

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/telemetry/dashboard?days=${timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90}`,
        );
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!dashboardData && !loading) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
          <p className="text-red-600 mt-1">
            Unable to fetch usage analytics data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Usage Analytics Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Monitor system performance and user behavior patterns
        </p>

        <div className="flex gap-2 mt-4">
          {["7d", "30d", "90d"].map((range) => (
            <button
              className={`px-4 py-2 rounded-lg ${
                timeRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              key={range}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
          <p className="text-3xl font-bold text-gray-900">
            {dashboardData?.overview?.totalUsers?.toLocaleString() || "0"}
          </p>
          <p className="text-green-600 text-sm mt-1">↑ 12% from last period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Active Users</h3>
          <p className="text-3xl font-bold text-gray-900">
            {dashboardData?.overview?.activeUsers?.toLocaleString() || "0"}
          </p>
          <p className="text-green-600 text-sm mt-1">↑ 8% from last period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Total Events</h3>
          <p className="text-3xl font-bold text-gray-900">
            {dashboardData?.overview?.totalEvents?.toLocaleString() || "0"}
          </p>
          <p className="text-blue-600 text-sm mt-1">↗ Steady growth</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Avg Session</h3>
          <p className="text-3xl font-bold text-gray-900">
            {Math.round(dashboardData?.overview?.avgSessionDuration || 0)}s
          </p>
          <p className="text-green-600 text-sm mt-1">↑ 5% improvement</p>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Active Users
          </h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Chart visualization would go here</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Features
          </h3>
          <div className="space-y-3">
            {dashboardData?.topFeatures?.map((feature, index) => (
              <div className="flex justify-between items-center" key={index}>
                <span className="text-gray-700">{feature.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{feature.usage}%</span>
                  <span
                    className={`text-sm ${
                      feature.growth > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {feature.growth > 0 ? "↗" : "↘"}{" "}
                    {Math.abs(feature.growth)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboardData?.trends?.performanceMetrics?.map((metric, index) => (
            <div className="border rounded-lg p-4" key={index}>
              <h4 className="font-medium text-gray-900">{metric.metric}</h4>
              <p className="text-2xl font-bold mt-2">
                {typeof metric.value === "number"
                  ? metric.value.toFixed(2)
                  : metric.value}
              </p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                  metric.trend === "up"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {metric.trend === "up" ? "↗ Improving" : "↘ Declining"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
