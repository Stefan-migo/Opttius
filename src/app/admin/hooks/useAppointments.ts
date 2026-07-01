"use client";

import { useQuery } from "@tanstack/react-query";

import { appointmentService } from "@/lib/api/services";

interface UseAppointmentsParams {
  branchId: string | null;
  view: string;
  currentDate: Date;
  statusFilter: string;
  user: unknown;
  authLoading: boolean;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function getDateRange(view: string, currentDate: Date) {
  let startDate: Date;
  let endDate: Date;

  if (view === "day") {
    startDate = new Date(currentDate);
    endDate = new Date(currentDate);
  } else if (view === "week") {
    const monday = getMondayOfWeek(currentDate);
    startDate = new Date(monday);
    endDate = new Date(monday);
    endDate.setDate(endDate.getDate() + 6);
  } else {
    startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 30);
    endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + 30);
  }

  return {
    date_from: startDate.toISOString().split("T")[0],
    date_to: endDate.toISOString().split("T")[0],
  };
}

export function useAppointments(params: UseAppointmentsParams) {
  const { date_from, date_to } = getDateRange(params.view, params.currentDate);

  return useQuery({
    queryKey: [
      "admin",
      "appointments",
      params.view,
      date_from,
      date_to,
      params.statusFilter,
      params.branchId,
    ],
    queryFn: async () => {
      const result = await appointmentService.getAppointments({
        date_from,
        date_to,
        status: params.statusFilter !== "all" ? params.statusFilter : undefined,
        branch_id: params.branchId || undefined,
      });
      return result.data;
    },
    // ponytail: 30s staleTime for frequently-changing appointment data
    staleTime: 30 * 1000,
    enabled: !params.authLoading && !!params.user,
  });
}
