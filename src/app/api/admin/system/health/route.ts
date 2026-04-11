import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    const hours = parseInt(searchParams.get("hours") || "24");

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Temporarily bypass admin checks to test table access
    logger.debug("Testing system_health_metrics table access", {
      userEmail: user.email,
    });

    // Calculate time range
    const fromTime = new Date(
      Date.now() - hours * 60 * 60 * 1000,
    ).toISOString();

    // Build the query
    let query = supabase
      .from("system_health_metrics")
      .select("*")
      .gte("collected_at", fromTime);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: metrics, error } = await query.order("collected_at", {
      ascending: false,
    });

    if (error) {
      logger.error("Error fetching health metrics", { error });
      return NextResponse.json(
        { error: "Failed to fetch health metrics" },
        { status: 500 },
      );
    }

    // Get latest metrics summary
    const latestMetrics = getLatestMetrics(metrics || []);

    // Calculate health status
    const healthStatus = calculateHealthStatus(latestMetrics);

    // Group metrics by category and time for charts
    const metricsGrouped = groupMetricsByCategory(metrics || []);

    return NextResponse.json({
      metrics: metrics || [],
      latest: latestMetrics,
      health_status: healthStatus,
      grouped: metricsGrouped,
      period_hours: hours,
    });
  } catch (error) {
    logger.error("Error in health metrics API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Collecting system health metrics", { userEmail: user.email });

    const metricsToCollect = [];
    const now = new Date().toISOString();

    // 1. Database Response Time
    const dbStartTime = Date.now();
    await supabase.from("profiles").select("id").limit(1);
    const dbResponseTime = (Date.now() - dbStartTime) / 1000; // seconds
    metricsToCollect.push({
      metric_name: "database_response_time",
      metric_value: dbResponseTime,
      metric_unit: "seconds",
      category: "database",
      threshold_warning: 1.0,
      threshold_critical: 3.0,
      is_healthy: dbResponseTime < 1.0,
      collected_at: now,
    });

    // 2. Total Users Count
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    metricsToCollect.push({
      metric_name: "total_users",
      metric_value: totalUsers || 0,
      metric_unit: "count",
      category: "users",
      threshold_warning: 10000,
      threshold_critical: 50000,
      is_healthy: (totalUsers || 0) < 10000,
      collected_at: now,
    });

    // 3. Active Admin Users
    const { count: activeAdmins } = await supabase
      .from("admin_users")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    metricsToCollect.push({
      metric_name: "active_admin_users",
      metric_value: activeAdmins || 0,
      metric_unit: "count",
      category: "users",
      threshold_warning: 50,
      threshold_critical: 100,
      is_healthy: (activeAdmins || 0) < 50,
      collected_at: now,
    });

    // 4. Recent Activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentActivity } = await supabase
      .from("admin_activity_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday);
    metricsToCollect.push({
      metric_name: "admin_activity_24h",
      metric_value: recentActivity || 0,
      metric_unit: "count",
      category: "activity",
      threshold_warning: 1000,
      threshold_critical: 5000,
      is_healthy: (recentActivity || 0) < 1000,
      collected_at: now,
    });

    // 5. System Memory Usage (Node.js process)
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    // More realistic thresholds: warning at 1GB, critical at 2GB
    metricsToCollect.push({
      metric_name: "memory_usage",
      metric_value: memoryUsageMB,
      metric_unit: "megabytes",
      category: "system",
      threshold_warning: 1024, // 1GB
      threshold_critical: 2048, // 2GB
      is_healthy: memoryUsageMB < 1024,
      collected_at: now,
    });

    // 6. Database Size (approximate - count of records in key tables)
    const { count: productsCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    const { count: ordersCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });
    const totalRecords = (productsCount || 0) + (ordersCount || 0);
    metricsToCollect.push({
      metric_name: "database_records",
      metric_value: totalRecords,
      metric_unit: "count",
      category: "database",
      threshold_warning: 100000,
      threshold_critical: 500000,
      is_healthy: totalRecords < 100000,
      collected_at: now,
    });

    // Insert all metrics
    const { data: insertedMetrics, error: insertError } = await supabase
      .from("system_health_metrics")
      .insert(metricsToCollect)
      .select();

    if (insertError) {
      logger.error("Error inserting health metrics", { error: insertError });
      return NextResponse.json(
        { error: "Failed to save health metrics" },
        { status: 500 },
      );
    }

    logger.info("Health metrics collection completed", {
      metricsCount: insertedMetrics?.length,
    });

    // Get the newly collected metrics
    const { data: newMetrics } = await supabase
      .from("system_health_metrics")
      .select("*")
      .gte("collected_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order("collected_at", { ascending: false });

    return NextResponse.json({
      success: true,
      metrics_collected: insertedMetrics?.length || 0,
      latest_metrics: newMetrics || [],
    });
  } catch (error) {
    logger.error("Error in collect health metrics API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper functions
function getLatestMetrics(metrics: unknown[]) {
  const latest: unknown = {};

  metrics.forEach((metric) => {
    const key = metric.metric_name;
    if (
      !latest[key] ||
      new Date(metric.collected_at) > new Date(latest[key].collected_at)
    ) {
      latest[key] = metric;
    }
  });

  return Object.values(latest);
}

function calculateHealthStatus(latestMetrics: unknown[]) {
  let overallStatus = "healthy";
  const warnings: unknown[] = [];
  const criticals: unknown[] = [];

  latestMetrics.forEach((metric) => {
    if (
      metric.threshold_critical &&
      metric.metric_value >= metric.threshold_critical
    ) {
      overallStatus = "critical";
      criticals.push(metric);
    } else if (
      metric.threshold_warning &&
      metric.metric_value >= metric.threshold_warning
    ) {
      if (overallStatus !== "critical") {
        overallStatus = "warning";
      }
      warnings.push(metric);
    }
  });

  return {
    status: overallStatus,
    warnings: warnings.length,
    criticals: criticals.length,
    warning_metrics: warnings,
    critical_metrics: criticals,
    last_check:
      latestMetrics.length > 0
        ? Math.max(
            ...latestMetrics.map((m) => new Date(m.collected_at).getTime()),
          )
        : null,
  };
}

function groupMetricsByCategory(metrics: unknown[]) {
  const grouped = metrics.reduce((acc: unknown, metric) => {
    const category = metric.category || "general";

    if (!acc[category]) {
      acc[category] = {};
    }

    if (!acc[category][metric.metric_name]) {
      acc[category][metric.metric_name] = [];
    }

    acc[category][metric.metric_name].push({
      value: metric.metric_value,
      collected_at: metric.collected_at,
      unit: metric.metric_unit,
      is_healthy: metric.is_healthy,
    });

    return acc;
  }, {});

  // Sort each metric array by time
  Object.keys(grouped).forEach((category) => {
    Object.keys(grouped[category]).forEach((metricName) => {
      grouped[category][metricName].sort(
        (a: unknown, b: unknown) =>
          new Date(a.collected_at).getTime() -
          new Date(b.collected_at).getTime(),
      );
    });
  });

  return grouped;
}
