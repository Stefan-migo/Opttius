"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  description?: string;
  category: string;
  is_public: boolean;
  is_sensitive: boolean;
  value_type: string;
  updated_at: string;
}

const fetchConfigs = async (
  branchId?: string | null,
): Promise<SystemConfig[]> => {
  const url = new URL("/api/admin/system/config");
  if (branchId) {
    url.searchParams.set("branch_id", branchId);
  }
  const response = await fetch(url.toString(), {
    headers: branchId ? { "x-branch-id": branchId } : undefined,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch system config");
  }
  const data = await response.json();
  return data.configs || [];
};

export interface UseSystemConfigOptions {
  /** When "branch", fetch/update config for this branch. When null/undefined, use org-level (all branches). */
  branchId?: string | null;
}

export function useSystemConfig(options?: UseSystemConfigOptions) {
  const branchId = options?.branchId ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["systemConfig", branchId ?? "global"],
    queryFn: () => fetchConfigs(branchId ?? undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      configKey,
      newValue,
    }: {
      configKey: string;
      newValue: any;
    }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (branchId) {
        headers["x-branch-id"] = branchId;
      }
      const response = await fetch("/api/admin/system/config", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          updates: [{ config_key: configKey, config_value: newValue }],
          branch_id: branchId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update config");
      }

      const data = await response.json();
      const result = data.results[0];

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemConfig"] });
      toast.success("Configuración actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar configuración");
    },
  });

  return {
    configs: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateConfig: async (key: string, value: any) => {
      await updateMutation.mutateAsync({ configKey: key, newValue: value });
    },
    isUpdating: updateMutation.isPending,
  };
}
