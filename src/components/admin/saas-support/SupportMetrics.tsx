"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { appLogger } from '@/lib/logger';

import { SupportMetricsDashboard } from "./_components/SupportMetricsDashboard";

interface SupportMetrics {
  totalTickets: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  averageResponseTimeMinutes: number | null;
  averageResolutionTimeMinutes: number | null;
  averageSatisfactionRating: number | null;
  ticketsPerDay: Record<string, number>;
  topOrganizations: Array<{ id: string; name: string; count: number }>;
}

export function SupportMetrics() {
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        "/api/admin/saas-management/support/metrics",
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      appLogger.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return <SupportMetricsDashboard metrics={metrics} />;
}
