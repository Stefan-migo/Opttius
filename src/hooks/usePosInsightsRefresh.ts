"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/** Minimal shape for prescription/customer used by POS insights refresh */
type PrescriptionLike = { id?: unknown };
type CustomerLike = { id?: unknown; name?: unknown; rut?: unknown };

/**
 * Hook to trigger POS insights refresh when prescription or customer changes.
 * Used in POS page to generate contextual insights (e.g. lens recommendations).
 */
export function usePosInsightsRefresh(
  selectedPrescription: PrescriptionLike | null,
  selectedCustomer: CustomerLike | null,
  options?: { debounceMs?: number; enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const debounceMs = options?.debounceMs ?? 1500;
  const enabled = options?.enabled ?? true;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prescriptionIdRef = useRef<string | null>(null);
  const customerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const presId =
      selectedPrescription && "id" in selectedPrescription
        ? String(selectedPrescription.id)
        : null;
    const custId =
      selectedCustomer && "id" in selectedCustomer
        ? String(selectedCustomer.id)
        : null;

    if (!presId && !custId) return;

    if (
      prescriptionIdRef.current === presId &&
      customerIdRef.current === custId
    ) {
      return;
    }
    prescriptionIdRef.current = presId;
    customerIdRef.current = custId;

    timeoutRef.current = setTimeout(async () => {
      try {
        const posContext = {
          prescription: selectedPrescription
            ? { ...selectedPrescription }
            : undefined,
          customerHistory: selectedCustomer
            ? {
                id: selectedCustomer.id,
                name: selectedCustomer.name,
                rut: selectedCustomer.rut,
              }
            : undefined,
        };

        const prepareRes = await fetch("/api/ai/insights/prepare-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "pos",
            posContext,
          }),
        });

        if (!prepareRes.ok) return;

        const { data } = await prepareRes.json();

        const generateRes = await fetch("/api/ai/insights/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "pos",
            data,
            forceRegenerate: true,
          }),
        });

        if (generateRes.ok) {
          queryClient.invalidateQueries({ queryKey: ["ai-insights", "pos"] });
        }
      } catch {
        // Silently ignore - insights refresh is non-critical
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    selectedPrescription,
    selectedCustomer,
    enabled,
    debounceMs,
    queryClient,
  ]);
}
