"use client";

import { useQuery } from "@tanstack/react-query";

import { getBranchHeader } from "@/lib/utils/branch";

interface UseAnalyticsParams {
  branchId: string | null;
  period: string;
}

// ponytail: broad type — narrow when consuming component specifies exact shape
type AnalyticsData = Record<string, unknown>;

interface AnalyticsApiResponse {
  success: boolean;
  data?: { analytics: AnalyticsData };
  analytics?: AnalyticsData;
  error?: { message: string };
}

async function fetchAnalytics({
  branchId,
  period,
}: UseAnalyticsParams): Promise<AnalyticsData> {
  const headers: HeadersInit = {
    ...getBranchHeader(branchId),
  };

  const response = await fetch(
    `/api/admin/analytics/dashboard?period=${period}`,
    { headers },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch analytics");
  }

  const result: AnalyticsApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.error?.message || "Failed to fetch analytics");
  }

  return result.data?.analytics ?? (result.analytics as AnalyticsData);
}

export function useAnalytics(params: UseAnalyticsParams) {
  return useQuery({
    queryKey: ["admin", "analytics", params.branchId, params.period],
    queryFn: () => fetchAnalytics(params),
    staleTime: 5 * 60 * 1000,
  });
}
