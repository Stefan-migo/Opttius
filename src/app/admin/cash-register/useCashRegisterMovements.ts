/**
 * useCashRegisterMovements — movements, daily summary, credit notes.
 *
 * Extracted from useCashRegister.ts. Pure extraction — no behavioral changes.
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { DailySummary, Movement } from "./cashRegister.types";

export function useCashRegisterMovements(effectiveHeaders: Record<string, string>) {
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementFilter, setMovementFilter] = useState<string>("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [creditNotes, setCreditNotes] = useState<unknown[]>([]);
  const [loadingCreditNotes, setLoadingCreditNotes] = useState(false);

  const fetchDailySummary = async () => {
    setLoadingSummary(true);
    try {
      const { getTodayInTimezone } = await import("@/lib/utils/date-timezone");
      const today = getTodayInTimezone("America/Santiago");
      const response = await fetch(
        `/api/admin/cash-register/close?date=${today}`,
        { headers: effectiveHeaders as HeadersInit },
      );
      if (response.ok) {
        const data = await response.json();
        setDailySummary(data.summary);
        if (data.previous_closure) {
          return {
            summary: data.summary,
            previousClosure: data.previous_closure,
          };
        }
        return { summary: data.summary, previousClosure: null };
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al cargar resumen del día");
      }
    } catch (error: unknown) {
      console.error("Error fetching daily summary:", error);
      toast.error("Error al cargar resumen del día");
    } finally {
      setLoadingSummary(false);
    }
    return null;
  };

  const fetchMovements = async (sessionId: string) => {
    if (!sessionId) return;

    setLoadingMovements(true);
    try {
      const response = await fetch(
        `/api/admin/cash-register/session-movements?session_id=${sessionId}`,
        { headers: effectiveHeaders as HeadersInit, credentials: "include" },
      );

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      } else {
        const errorData = await response.json();
        console.error("Error fetching movements:", errorData);
      }
    } catch (error: unknown) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const fetchCreditNotes = async () => {
    setLoadingCreditNotes(true);
    try {
      const { buildCreditNotesDateRange } = await import("./cashOpsUtils");
      const { date_from, date_to } = buildCreditNotesDateRange();
      const params = new URLSearchParams({ date_from, date_to, limit: "50", offset: "0" });
      const response = await fetch(`/api/admin/credit-notes?${params}`, {
        headers: effectiveHeaders as HeadersInit,
      });
      if (response.ok) {
        const data = await response.json();
        setCreditNotes(data.credit_notes || []);
      }
    } catch (err) {
      console.error("Error fetching credit notes:", err);
    } finally {
      setLoadingCreditNotes(false);
    }
  };

  return {
    dailySummary,
    setDailySummary,
    loadingSummary,
    movements,
    setMovements,
    loadingMovements,
    movementFilter,
    setMovementFilter,
    movementTypeFilter,
    setMovementTypeFilter,
    creditNotes,
    setCreditNotes,
    loadingCreditNotes,
    fetchDailySummary,
    fetchMovements,
    fetchCreditNotes,
  };
}
