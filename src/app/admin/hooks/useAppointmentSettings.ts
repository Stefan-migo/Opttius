"use client";

import { useQuery } from "@tanstack/react-query";

import { appointmentService } from "@/lib/api/services";

interface UseAppointmentSettingsParams {
  branchId: string | null | undefined;
  user: unknown;
  authLoading: boolean;
}

export function useAppointmentSettings(
  params: UseAppointmentSettingsParams,
) {
  return useQuery({
    queryKey: ["admin", "schedule-settings", params.branchId],
    queryFn: () =>
      appointmentService.getScheduleSettings(params.branchId || undefined),
    staleTime: 5 * 60 * 1000,
    enabled: !params.authLoading && !!params.user,
  });
}
