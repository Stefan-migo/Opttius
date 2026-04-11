/**
 * usePOSPrescription - Hook para gestión de recetas y presupuestos en el POS
 * Maneja prescripciones, presupuestos, y datos de lentes
 */

import { useCallback, useEffect, useState } from "react";

import { quoteService } from "@/lib/api/services";

import type { POSQuote, POSCustomer } from "../types";

interface UsePOSPrescriptionProps {
  customer?: POSCustomer | null;
  branchId?: string | null;
  onQuoteSelect?: (quote: POSQuote) => void;
}

export function usePOSPrescription({
  customer,
  branchId,
  onQuoteSelect,
}: UsePOSPrescriptionProps = {}) {
  // States
  const [quotes, setQuotes] = useState<POSQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<POSQuote | null>(null);
  const [prescriptions, setPrescriptions] = useState<unknown[]>([]);
  const [selectedPrescription, setSelectedPrescription] =
    useState<unknown>(null);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  // Fetch quotes when customer changes
  useEffect(() => {
    console.log(
      "[usePOSPrescription] Fetching quotes - customer:",
      customer?.id,
      "branchId:",
      branchId,
    );

    if (!customer?.id || !branchId) {
      console.log(
        "[usePOSPrescription] Skipping - missing customer.id or branchId",
      );
      setQuotes([]);
      return;
    }

    let cancelled = false;
    setLoadingQuotes(true);

    // Fetch quotes with multiple statuses (draft, sent, accepted) - not just "sent"
    // This ensures we show all available quotes for the customer
    const statuses = ["draft", "sent", "accepted"] as const;

    // Use Promise.all to fetch quotes with different statuses
    Promise.all(
      statuses.map((status) =>
        quoteService
          .getQuotes({
            customer_id: customer.id,
            branch_id: branchId,
            status,
          })
          .catch(() => ({ data: [] as never[], pagination: {} })),
      ),
    )
      .then((results) => {
        console.log(
          "[usePOSPrescription] getQuotes results by status:",
          results,
        );
        if (!cancelled) {
          // Combine all quotes from different statuses
          const allQuotes = results.flatMap((r) => r.data || []);

          // Filter out rejected and expired, and remove duplicates by id
          const uniqueQuotes = allQuotes.filter(
            (q, index, self) =>
              q.status !== "rejected" &&
              q.status !== "expired" &&
              self.findIndex((q2) => q2.id === q.id) === index,
          );

          console.log(
            "[usePOSPrescription] All unique active quotes:",
            uniqueQuotes,
          );
          setQuotes(uniqueQuotes);
        }
      })
      .catch((error) => {
        console.error("[usePOSPrescription] Error fetching quotes:", error);
        if (!cancelled) setQuotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingQuotes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customer?.id, branchId]);

  // Fetch prescriptions when customer changes
  useEffect(() => {
    if (!customer?.id || !branchId) {
      setPrescriptions([]);
      return;
    }

    let cancelled = false;
    setLoadingPrescriptions(true);

    // TODO: Replace with actual prescription service call when available
    // For now, we'll use a placeholder
    setPrescriptions([]);
    setLoadingPrescriptions(false);

    return () => {
      cancelled = true;
    };
  }, [customer?.id, branchId]);

  // Select quote
  const handleSelectQuote = useCallback(
    (quote: POSQuote) => {
      setSelectedQuote(quote);
      onQuoteSelect?.(quote);
    },
    [onQuoteSelect],
  );

  // Clear quote selection
  const clearQuote = useCallback(() => {
    setSelectedQuote(null);
    onQuoteSelect?.({} as POSQuote);
  }, [onQuoteSelect]);

  // Select prescription
  const handleSelectPrescription = useCallback((prescription: unknown) => {
    setSelectedPrescription(prescription);
  }, []);

  // Clear prescription selection
  const clearPrescription = useCallback(() => {
    setSelectedPrescription(null);
  }, []);

  // Refresh quotes
  const refreshQuotes = useCallback(async () => {
    if (!customer?.id || !branchId) {
      setQuotes([]);
      return;
    }

    setLoadingQuotes(true);
    try {
      const result = await quoteService.getQuotes({
        customer_id: customer.id,
        branch_id: branchId,
        status: "sent",
      });
      const activeQuotes = (result?.data || []).filter(
        (q) => q.status !== "rejected" && q.status !== "expired",
      );
      setQuotes(activeQuotes);
    } catch (error) {
      console.error("Error refreshing quotes:", error);
    } finally {
      setLoadingQuotes(false);
    }
  }, [customer?.id, branchId]);

  return {
    // Quotes
    quotes,
    loadingQuotes,
    selectedQuote,
    handleSelectQuote,
    clearQuote,

    // Prescriptions
    prescriptions,
    loadingPrescriptions,
    selectedPrescription,
    handleSelectPrescription,
    clearPrescription,

    // Helpers
    hasQuotes: quotes.length > 0,
    hasPrescriptions: prescriptions.length > 0,
    quotesCount: quotes.length,

    // Actions
    refreshQuotes,
  };
}
