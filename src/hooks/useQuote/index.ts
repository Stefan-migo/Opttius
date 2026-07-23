"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useBranch } from "@/hooks/useBranch";
import { quoteService } from "@/lib/api/services";

import { buildQuotePrintContent } from "./printTemplate";
import type { Quote } from "./types";

export type { Quote };

export function useQuote() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const { currentBranchId, isSuperAdmin } = useBranch();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingToPos, setLoadingToPos] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const getCustomerId = (q: Quote | null): string => {
    if (!q) return "N/A";
    if (typeof q.customer === "object" && q.customer !== null)
      return q.customer.id ?? "N/A";
    return "N/A";
  };

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (currentBranchId) {
        headers["x-branch-id"] = currentBranchId;
      } else if (isSuperAdmin) {
        headers["x-branch-id"] = "global";
      }
      const quoteResult = await quoteService.getQuote(quoteId);
      setQuote(quoteResult as unknown as Quote | null);
    } catch (error) {
      console.error("Error fetching quote:", error);
      toast.error("Error al cargar el presupuesto");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quoteId) fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, currentBranchId]);

  const handleLoadToPOS = async () => {
    if (!quote) return;
    setLoadingToPos(true);
    try {
      router.push(`/admin/pos?quoteId=${quoteId}`);
    } catch (error: unknown) {
      console.error("Error loading quote to POS:", error);
      toast.error("Error al cargar presupuesto al POS");
    } finally {
      setLoadingToPos(false);
    }
  };

  const handlePrint = useCallback(() => {
    if (!quote) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Por favor, permite ventanas emergentes para imprimir");
      return;
    }
    printWindow.document.write(buildQuotePrintContent(quote));
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 250);
  }, [quote]);

  const handleSendQuote = async () => {
    if (!quote) return;
    const emailToSend = quote.customer?.email || sendEmail;
    if (!emailToSend || !emailToSend.includes("@")) {
      toast.error("Por favor, ingresa un email válido");
      return;
    }
    setSending(true);
    try {
      await quoteService.sendQuote(quoteId, emailToSend);
      toast.success(`Presupuesto enviado exitosamente a ${emailToSend}`);
      setShowSendDialog(false);
      setSendEmail("");
      fetchQuote();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Error al enviar presupuesto");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (quote?.customer?.email && !sendEmail)
      setSendEmail(quote.customer.email);
  }, [quote, sendEmail]);

  return {
    quote,
    loading,
    loadingToPos,
    sending,
    showSendDialog,
    sendEmail,
    printRef,
    getCustomerId,
    fetchQuote,
    handleLoadToPOS,
    handlePrint,
    handleSendQuote,
    setShowSendDialog,
    setSendEmail,
    router,
  };
}
