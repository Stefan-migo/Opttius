"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface SurveyConfig {
  survey_enabled: boolean;
  survey_scale_type: "1-5" | "1-10";
  survey_question: string;
}

const fetchSurveyConfig = async (): Promise<SurveyConfig> => {
  const res = await fetch("/api/admin/system/survey-config");
  if (!res.ok) throw new Error("Failed to fetch survey config");
  const data = await res.json();
  return {
    survey_enabled: data.config?.survey_enabled ?? false,
    survey_scale_type: data.config?.survey_scale_type ?? "1-5",
    survey_question: data.config?.survey_question ?? "",
  };
};

export function useSurveyConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["surveyConfig"],
    queryFn: fetchSurveyConfig,
    staleTime: 2 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (config: Partial<SurveyConfig>) => {
      const res = await fetch("/api/admin/system/survey-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveyConfig"] });
      toast.success("Configuración guardada");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
