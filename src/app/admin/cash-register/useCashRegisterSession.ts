/**
 * useCashRegisterSession — cash register open/close/reopen state and actions.
 *
 * Extracted from useCashRegister.ts. Pure extraction — no behavioral changes.
 */

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FieldOperation {
  id: string;
  name: string;
  branch_id: string;
}

interface UseCashRegisterSessionParams {
  fieldOperationIdFromUrl: string | null;
  effectiveBranchId: string | null;
  effectiveHeaders: Record<string, string>;
  isSuperAdmin: boolean;
  isGlobalView: boolean;
  onSessionChange: () => void;
}

export function useCashRegisterSession({
  fieldOperationIdFromUrl,
  effectiveBranchId,
  effectiveHeaders,
  isSuperAdmin,
  isGlobalView,
  onSessionChange,
}: UseCashRegisterSessionParams) {
  const [fieldOperation, setFieldOperation] = useState<FieldOperation | null>(null);
  const [loadingFieldOperation, setLoadingFieldOperation] = useState(false);
  const [isCashOpen, setIsCashOpen] = useState(false);
  const [checkingCashStatus, setCheckingCashStatus] = useState(true);
  const [openingCash, setOpeningCash] = useState(0);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [openingCashRegister, setOpeningCashRegister] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [actualCash, setActualCash] = useState<number | null>(null);
  const [cardMachineDebit, setCardMachineDebit] = useState(0);
  const [cardMachineCredit, setCardMachineCredit] = useState(0);
  const [transferTotal, setTransferTotal] = useState(0);
  const [notes, setNotes] = useState("");
  const [discrepancies, setDiscrepancies] = useState("");

  // Fetch field operation
  useEffect(() => {
    if (!fieldOperationIdFromUrl) {
      setFieldOperation(null);
      return;
    }
    setLoadingFieldOperation(true);
    fetch(`/api/admin/field-operations/${fieldOperationIdFromUrl}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        const payload = (data as Record<string, unknown>)?.data ?? data;
        const op = (payload as Record<string, unknown>)?.fieldOperation ?? payload;
        if ((op as Record<string, unknown>)?.id && (op as Record<string, unknown>)?.branch_id) {
          setFieldOperation({
            id: (op as Record<string, unknown>).id as string,
            name: ((op as Record<string, unknown>).name as string) || "Operativo",
            branch_id: (op as Record<string, unknown>).branch_id as string,
          });
        } else {
          setFieldOperation(null);
        }
      })
      .catch(() => setFieldOperation(null))
      .finally(() => setLoadingFieldOperation(false));
  }, [fieldOperationIdFromUrl]);

  const checkCashStatus = async () => {
    if (isGlobalView) {
      setCheckingCashStatus(false);
      return;
    }
    setCheckingCashStatus(true);
    try {
      const response = await fetch("/api/admin/cash-register/open", {
        headers: effectiveHeaders as HeadersInit,
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setIsCashOpen(data.isOpen);
        if (data.session) {
          setOpeningCash(data.session.opening_cash_amount || 0);
          setCurrentSessionId(data.session.id);
        } else {
          setCurrentSessionId(null);
        }
      }
    } catch (error: unknown) {
      console.error("Error checking cash status:", error);
    } finally {
      setCheckingCashStatus(false);
    }
  };

  const handleOpenCashRegister = async () => {
    if (!openingCashInput || parseFloat(openingCashInput) < 0) {
      toast.error("Debe ingresar un monto inicial válido");
      return;
    }
    setOpeningCashRegister(true);
    try {
      const body: Record<string, unknown> = {
        opening_cash_amount: parseFloat(openingCashInput),
      };
      if (fieldOperationIdFromUrl) body.field_operation_id = fieldOperationIdFromUrl;

      const response = await fetch("/api/admin/cash-register/open", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...effectiveHeaders } as HeadersInit,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        toast.success("Caja abierta exitosamente");
        setIsCashOpen(true);
        setOpeningCash(data.session?.opening_cash_amount || 0);
        setOpeningCashInput("");
        await checkCashStatus();
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al abrir la caja");
      }
    } catch (error: unknown) {
      console.error("Error opening cash register:", error);
      toast.error("Error al abrir la caja");
    } finally {
      setOpeningCashRegister(false);
    }
  };

  const fetchCurrentSessionId = async () => {
    try {
      const response = await fetch("/api/admin/cash-register/open", {
        headers: effectiveHeaders as HeadersInit,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.session?.id) {
          setCurrentSessionId(data.session.id);
        }
      }
    } catch (error: unknown) {
      console.error("Error fetching session ID:", error);
    }
  };

  const handleCloseCashRegisterCore = async (
    dailySummary: { expected_cash?: number; opening_cash_amount?: number } | null,
    onSuccess: () => void,
  ) => {
    if (!dailySummary) {
      toast.error("No hay datos del día para cerrar");
      return;
    }
    setClosing(true);
    try {
      if (actualCash === null || actualCash === undefined || actualCash < 0) {
        toast.error("Debe ingresar el monto de efectivo físico contado");
        setClosing(false);
        return;
      }
      if (isNaN(Number(actualCash)) || Number(actualCash) < 0) {
        toast.error("El monto de efectivo físico contado debe ser 0 o mayor");
        setClosing(false);
        return;
      }

      const { getTodayInTimezone } = await import("@/lib/utils/date-timezone");
      const { buildCloseCashBody } = await import("./cashOpsUtils");
      const today = getTodayInTimezone("America/Santiago");
      const actualCashValue = Number(actualCash);

      const closeBody = buildCloseCashBody({
        closure_date: `${today}T00:00:00`,
        opening_cash_amount: openingCash,
        actual_cash: actualCashValue,
        card_machine_debit_total: cardMachineDebit,
        card_machine_credit_total: cardMachineCredit,
        notes: notes || null,
        discrepancies: discrepancies || null,
        field_operation_id: fieldOperationIdFromUrl ?? undefined,
      });

      const response = await fetch("/api/admin/cash-register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...effectiveHeaders } as HeadersInit,
        body: JSON.stringify(closeBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.details
            ? `${error.error || "Error al cerrar la caja"}: ${error.details}`
            : error.error || "Error al cerrar la caja",
        );
      }

      toast.success("Caja cerrada exitosamente");
      setShowCloseDialog(false);
      onSuccess();

      setOpeningCash(0);
      setActualCash(null);
      setCardMachineDebit(0);
      setCardMachineCredit(0);
      setTransferTotal(0);
      setNotes("");
      setDiscrepancies("");
    } catch (error: unknown) {
      console.error("Error closing cash register:", error);
      const err = error as Error;
      toast.error(err.message || "Error al cerrar la caja");
    } finally {
      setClosing(false);
    }
  };

  const handleReopenCash = async (sessionId: string) => {
    if (!isSuperAdmin) {
      toast.error("Solo superadmin puede reabrir cajas");
      return;
    }
    setReopening(true);
    try {
      const response = await fetch("/api/admin/cash-register/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...effectiveHeaders } as HeadersInit,
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (response.ok) {
        toast.success("Caja reabierta correctamente");
        await checkCashStatus();
        onSessionChange();
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al reabrir la caja");
      }
    } catch (error: unknown) {
      console.error("Error reopening cash register:", error);
      toast.error("Error al reabrir la caja");
    } finally {
      setReopening(false);
    }
  };

  return {
    fieldOperation,
    loadingFieldOperation,
    isCashOpen,
    checkingCashStatus,
    openingCash,
    setOpeningCash,
    openingCashInput,
    setOpeningCashInput,
    openingCashRegister,
    currentSessionId,
    setCurrentSessionId,
    showCloseDialog,
    setShowCloseDialog,
    closing,
    reopening,
    actualCash,
    setActualCash,
    cardMachineDebit,
    setCardMachineDebit,
    cardMachineCredit,
    setCardMachineCredit,
    transferTotal,
    setTransferTotal,
    notes,
    setNotes,
    discrepancies,
    setDiscrepancies,
    checkCashStatus,
    handleOpenCashRegister,
    fetchCurrentSessionId,
    handleCloseCashRegister: handleCloseCashRegisterCore,
    handleReopenCash,
  };
}
