"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface HealthMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  category: string;
  is_healthy: boolean;
  collected_at: string;
  threshold_warning?: number;
  threshold_critical?: number;
}

export interface HealthStatus {
  status: "healthy" | "warning" | "critical";
  warnings: number;
  criticals: number;
  warning_metrics: HealthMetric[];
  critical_metrics: HealthMetric[];
  last_check: number | null;
}

interface HealthResponse {
  latest: HealthMetric[];
  health_status: HealthStatus;
}

const fetchHealthMetrics = async (): Promise<HealthResponse> => {
  const response = await fetch("/api/admin/system/health");
  if (!response.ok) {
    throw new Error("Failed to fetch health metrics");
  }
  return response.json();
};

export function useSystemHealth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["systemHealth"],
    queryFn: fetchHealthMetrics,
    staleTime: 30 * 1000, // 30 seconds
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      // First collect new metrics
      const collectResponse = await fetch("/api/admin/system/health", {
        method: "POST",
      });
      if (!collectResponse.ok) {
        const errorData = await collectResponse.json();
        throw new Error(errorData.error || "Failed to collect health metrics");
      }

      const collectData = await collectResponse.json();
      toast.success(
        `Métricas recolectadas: ${collectData.metrics_collected || 0} nuevas métricas`,
      );

      // Then fetch the updated metrics
      return fetchHealthMetrics();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["systemHealth"], data);
      queryClient.invalidateQueries({ queryKey: ["systemHealth"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar métricas de salud");
    },
  });

  const clearMemoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/system/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "clear_memory" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al limpiar memoria");
      }

      const data = await response.json();
      toast.success(data.message || "Memoria limpiada exitosamente");

      // Refresh health metrics to see updated memory usage
      return fetchHealthMetrics();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["systemHealth"], data);
      queryClient.invalidateQueries({ queryKey: ["systemHealth"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al limpiar memoria");
    },
  });

  return {
    healthMetrics: query.data?.latest || [],
    healthStatus: query.data?.health_status || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    refreshHealth: refreshMutation.mutateAsync,
    clearMemory: clearMemoryMutation.mutateAsync,
    refreshing: refreshMutation.isPending,
    clearingMemory: clearMemoryMutation.isPending,
  };
}
