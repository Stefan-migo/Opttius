"use client";

import { useQuery } from "@tanstack/react-query";

import type { DashboardData } from "../_components/types";

interface UseDashboardParams {
  branchId: string | null;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
  period: string;
}

interface DashboardApiResponse {
  success: boolean;
  data: DashboardData;
  error?: { message: string };
}

const fetchDashboard = async ({
  branchId,
  isGlobalView,
  isSuperAdmin,
  period,
}: UseDashboardParams): Promise<DashboardData> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (branchId) {
    headers["x-branch-id"] = branchId;
  } else if (isGlobalView && isSuperAdmin) {
    headers["x-branch-id"] = "global";
  }

  const params = new URLSearchParams({ period });
  const response = await fetch(`/api/admin/dashboard?${params}`, { headers });

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data");
  }

  const result: DashboardApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.error?.message || "Failed to fetch dashboard data");
  }

  return result.data;
};

export function useDashboard(params: UseDashboardParams) {
  return useQuery({
    queryKey: ["admin", "dashboard", params.branchId, params.period],
    queryFn: () => fetchDashboard(params),
    staleTime: 5 * 60 * 1000,
  });
}
