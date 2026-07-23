"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { TOUR_STEPS } from "@/lib/onboarding/tour-config";

export interface TourProgress {
  status: "not_started" | "in_progress" | "completed" | "disabled";
  current_step: number;
  completed_steps: number[];
  skip_on_next_login: boolean;
  started_at?: string;
  completed_at?: string;
  last_accessed_at?: string;
}

export function useTour() {
  const queryClient = useQueryClient();

  // Obtener progreso del tour - optimizado para carga rápida
  const { data: progress, isLoading } = useQuery<TourProgress>({
    queryKey: ["tour-progress"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Timeout reducido a 2 segundos

      try {
        const res = await fetch("/api/onboarding/tour", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          // Si no hay progreso, retornar estado inicial
          if (res.status === 404 || res.status === 401) {
            return {
              status: "not_started" as const,
              current_step: 0,
              completed_steps: [],
              skip_on_next_login: false,
            };
          }
          throw new Error("Failed to fetch tour progress");
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        // En caso de error, retornar estado inicial para no bloquear (sin logs en producción)
        return {
          status: "not_started" as const,
          current_step: 0,
          completed_steps: [],
          skip_on_next_login: false,
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 0, // No reintentar para evitar delays
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false, // No refetch al reconectar
    gcTime: 1000 * 60 * 10, // Mantener en cache por 10 minutos
  });

  const startTour = useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      try {
        const res = await fetch("/api/onboarding/tour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ action: "start" }),
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ error: "Failed to start tour" }));
          throw new Error(err.error || "Failed to start tour");
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          const state = {
            status: "in_progress" as const,
            current_step: 0,
            completed_steps: [],
            skip_on_next_login: false,
          };
          queryClient.setQueryData(["tour-progress"], state);
          return state;
        }
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tour-progress"] }),
  });

  // Completar paso - optimizado con actualización optimista
  const completeStep = useMutation({
    mutationFn: async (stepIndex: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const res = await fetch(`/api/onboarding/tour/${stepIndex}`, {
          method: "POST",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const error = await res
            .json()
            .catch(() => ({ error: "Failed to complete step" }));
          throw new Error(error.error || "Failed to complete step");
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        // Actualización optimista: avanzar el paso localmente incluso si falla la API
        if (error instanceof Error && error.name === "AbortError") {
          const currentProgress = queryClient.getQueryData<TourProgress>([
            "tour-progress",
          ]);
          if (currentProgress) {
            const newProgress: TourProgress = {
              ...currentProgress,
              current_step: stepIndex + 1,
              completed_steps: [
                ...(currentProgress.completed_steps || []),
                stepIndex,
              ],
            };
            queryClient.setQueryData(["tour-progress"], newProgress);
            return newProgress;
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tour-progress"] });
    },
  });

  const completeTour = useMutation({
    mutationFn: () => tourApiCall("complete"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tour-progress"] }),
  });

  const tourApiCall = useCallback(
    async (action: string, body?: Record<string, unknown>) => {
      const res = await fetch("/api/onboarding/tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? { action }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: `Failed to ${action} tour` }));
        throw new Error(err.error || `Failed to ${action} tour`);
      }
      return res.json();
    },
    [],
  );

  // Saltar tour - actualización inmediata sin esperar API
  const skipTour = useMutation({
    mutationFn: async () => {
      const disabledState = {
        status: "disabled" as const,
        current_step: 0,
        completed_steps: [],
        skip_on_next_login: true,
      };
      queryClient.setQueryData(["tour-progress"], disabledState);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      try {
        const res = await fetch("/api/onboarding/tour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ action: "skip" }),
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          queryClient.setQueryData(["tour-progress"], {
            ...data,
            status: "disabled" as const,
          });
        }
      } catch {
        clearTimeout(timeoutId);
      }
      return disabledState;
    },
  });

  const restartTour = useMutation({
    mutationFn: () => tourApiCall("restart"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tour-progress"] }),
  });

  const skipTourImmediate = useCallback(() => {
    const disabledState = {
      status: "disabled" as const,
      current_step: 0,
      completed_steps: [],
      skip_on_next_login: true,
    };
    queryClient.setQueryData(["tour-progress"], disabledState);
    queryClient.cancelQueries({ queryKey: ["tour-progress"] });
    skipTour.mutate(undefined, {
      onSuccess: (data) =>
        queryClient.setQueryData(["tour-progress"], {
          ...data,
          status: "disabled" as const,
        }),
    });
  }, [skipTour, queryClient]);

  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex < 0 || stepIndex >= TOUR_STEPS.length) return;
      const currentProgress = queryClient.getQueryData<TourProgress>([
        "tour-progress",
      ]);
      if (currentProgress?.status === "in_progress") {
        queryClient.setQueryData(["tour-progress"], {
          ...currentProgress,
          current_step: stepIndex,
        });
      }
    },
    [queryClient],
  );

  const currentStep = progress?.current_step ?? 0;
  const totalSteps = TOUR_STEPS.length;
  const isActive = progress?.status === "in_progress";
  const isCompleted = progress?.status === "completed";
  const isDisabled = progress?.status === "disabled";
  const isNotStarted = progress?.status === "not_started" || !progress;

  return {
    progress,
    isLoading,
    currentStep,
    totalSteps,
    isActive,
    isCompleted,
    isDisabled,
    isNotStarted,
    startTour: startTour.mutate,
    completeStep: completeStep.mutate,
    completeTour: completeTour.mutate,
    skipTour: skipTourImmediate,
    restartTour: restartTour.mutate,
    goToStep,
    isStarting: startTour.isPending,
    isCompleting: completeTour.isPending,
    isSkipping: skipTour.isPending,
    isRestarting: restartTour.isPending,
  };
}
