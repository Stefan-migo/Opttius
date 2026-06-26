"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useBranch } from "@/hooks/useBranch";
import {
  extractDataFromResponse,
  extractTotalFromResponse,
} from "@/lib/api/response-helpers";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";
import { getTodayInTimezone } from "@/lib/utils/date-timezone";

import {
  PAYMENT_METHOD_FILTER_MAP,
  computeCashDifference,
  resolveClosureStatus,
} from "./cashPaymentUtils";
import {
  buildClosureParams,
  buildCloseCashBody,
  buildCreditNotesDateRange,
  buildOrderParams,
  getTodayChileDate,
} from "./cashOpsUtils";
import type { CashClosure, DailySummary, Movement } from "./cashRegister.types";

export function useCashRegister() {
  const searchParams = useSearchParams();
  const fieldOperationIdFromUrl = searchParams.get("field_operation_id");
  const { currentBranchId, isSuperAdmin } = useBranch();

  const [fieldOperation, setFieldOperation] = useState<{
    id: string;
    name: string;
    branch_id: string;
  } | null>(null);
  const [loadingFieldOperation, setLoadingFieldOperation] = useState(false);
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Close dialog form state
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [actualCash, setActualCash] = useState<number | null>(null);
  const [cardMachineDebit, setCardMachineDebit] = useState<number>(0);
  const [cardMachineCredit, setCardMachineCredit] = useState<number>(0);
  const [transferTotal, setTransferTotal] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [discrepancies, setDiscrepancies] = useState("");
  const [isCashOpen, setIsCashOpen] = useState(false);
  const [checkingCashStatus, setCheckingCashStatus] = useState(true);
  const [openingCashInput, setOpeningCashInput] = useState<string>("");
  const [openingCashRegister, setOpeningCashRegister] = useState(false);
  const [orders, setOrders] = useState<unknown[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersTab, setOrdersTab] = useState(false);
  const [orderFilters, setOrderFilters] = useState(() => ({
    payment_status: "all",
    payment_method: "all",
    date_from: getTodayChileDate(),
    date_to: getTodayChileDate(),
  }));
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orderProductFilter, setOrderProductFilter] = useState("");
  const [selectedOrderForAction, setSelectedOrderForAction] =
    useState<unknown>(null);
  const [orderActionDialog, setOrderActionDialog] = useState<
    "cancel" | "delete" | null
  >(null);
  const [orderActionReason, setOrderActionReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [processingOrderAction, setProcessingOrderAction] = useState(false);

  const [creditNotes, setCreditNotes] = useState<unknown[]>([]);
  const [loadingCreditNotes, setLoadingCreditNotes] = useState(false);

  // Pagination for orders
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const [ordersItemsPerPage, setOrdersItemsPerPage] = useState(20);
  const [ordersTotalCount, setOrdersTotalCount] = useState(0);

  // Pagination for closures
  const [closuresCurrentPage, setClosuresCurrentPage] = useState(1);
  const [closuresItemsPerPage, setClosuresItemsPerPage] = useState(20);
  const [closuresTotalCount, setClosuresTotalCount] = useState(0);

  // Movements (session payments) state
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementFilter, setMovementFilter] = useState<string>("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [orderFiltersExpanded, setOrderFiltersExpanded] = useState(false);

  // ─── Computed Values ──────────────────────────────────────────────────────
  const effectiveBranchId =
    fieldOperation?.branch_id ?? currentBranchId ?? null;
  const isOperativoMode = !!fieldOperationIdFromUrl && !!fieldOperation;
  const effectiveHeaders = getBranchAndOperativoHeaders(
    effectiveBranchId,
    fieldOperationIdFromUrl,
  );
  const isGlobalView =
    !effectiveBranchId && isSuperAdmin && !fieldOperationIdFromUrl;

  const cashDifference = computeCashDifference(
    actualCash,
    dailySummary?.expected_cash ?? 0,
  );

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!fieldOperationIdFromUrl) {
      setFieldOperation(null);
      return;
    }
    setLoadingFieldOperation(true);
    fetch(`/api/admin/field-operations/${fieldOperationIdFromUrl}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const payload = data?.data ?? data;
        const op = payload?.fieldOperation ?? payload;
        if (op?.id && op?.branch_id) {
          setFieldOperation({
            id: op.id,
            name: op.name || "Operativo",
            branch_id: op.branch_id,
          });
        } else {
          setFieldOperation(null);
        }
      })
      .catch(() => setFieldOperation(null))
      .finally(() => setLoadingFieldOperation(false));
  }, [fieldOperationIdFromUrl]);

  // Reset date filters to today (Chile) when branch changes
  useEffect(() => {
    const today = getTodayInTimezone("America/Santiago");
    setOrderFilters((prev) => ({
      ...prev,
      date_from: today,
      date_to: today,
    }));
  }, [effectiveBranchId]);

  useEffect(() => {
    if (fieldOperationIdFromUrl && !fieldOperation) return;
    fetchClosures();
    checkCashStatus();
    fetchOrders();
  }, [
    effectiveBranchId,
    isGlobalView,
    fieldOperationIdFromUrl,
    fieldOperation,
  ]);

  // Refetch closures when pagination changes
  useEffect(() => {
    if (fieldOperationIdFromUrl && !fieldOperation) return;
    fetchClosures();
  }, [
    closuresCurrentPage,
    closuresItemsPerPage,
    effectiveBranchId,
    fieldOperationIdFromUrl,
    fieldOperation,
  ]);

  // Refetch orders when pagination changes
  useEffect(() => {
    if (!isGlobalView && (!fieldOperationIdFromUrl || fieldOperation)) {
      fetchOrders();
    }
  }, [
    ordersCurrentPage,
    ordersItemsPerPage,
    orderFilters,
    effectiveBranchId,
    isGlobalView,
    fieldOperationIdFromUrl,
    fieldOperation,
  ]);

  useEffect(() => {
    if (showCloseDialog) {
      fetchDailySummary();
      if (currentSessionId) {
        fetchMovements(currentSessionId);
      }
    }
  }, [showCloseDialog, currentSessionId, effectiveBranchId]);

  // Fetch orders when filters change
  useEffect(() => {
    fetchOrders();
  }, [orderFilters, orderSearchTerm, orderProductFilter]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const checkCashStatus = async () => {
    if (isGlobalView) {
      setCheckingCashStatus(false);
      return;
    }

    setCheckingCashStatus(true);
    try {
      const headers: HeadersInit = { ...effectiveHeaders };

      const response = await fetch("/api/admin/cash-register/open", {
        headers,
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
      } else {
        const error = await response.json();
        console.error("Error checking cash status:", error);
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
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...effectiveHeaders,
      };

      const body: Record<string, unknown> = {
        opening_cash_amount: parseFloat(openingCashInput),
      };
      if (fieldOperationIdFromUrl)
        body.field_operation_id = fieldOperationIdFromUrl;

      const response = await fetch("/api/admin/cash-register/open", {
        method: "POST",
        headers,
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

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const headers: HeadersInit = { ...effectiveHeaders };

      const params = buildOrderParams(
        orderFilters,
        ordersCurrentPage,
        ordersItemsPerPage,
      );
      const response = await fetch(`/api/admin/orders?${params}`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        let filteredOrders = extractDataFromResponse(data);

        // Apply search filter (client-side)
        if (orderSearchTerm) {
          filteredOrders = filteredOrders.filter(
            (order: unknown) =>
              order.order_number
                ?.toLowerCase()
                .includes(orderSearchTerm.toLowerCase()) ||
              order.customer_email
                ?.toLowerCase()
                .includes(orderSearchTerm.toLowerCase()) ||
              order.customer_name
                ?.toLowerCase()
                .includes(orderSearchTerm.toLowerCase()) ||
              order.sii_business_name
                ?.toLowerCase()
                .includes(orderSearchTerm.toLowerCase()),
          );
        }

        // Filter by payment method
        if (orderFilters.payment_method !== "all") {
          const allowed =
            PAYMENT_METHOD_FILTER_MAP[orderFilters.payment_method] || [];
          filteredOrders = filteredOrders.filter((order: unknown) => {
            const payments = order.order_payments || [];
            const hasMatch = payments.some((p: unknown) =>
              allowed.includes((p.payment_method || "").toLowerCase()),
            );
            if (hasMatch) return true;
            const mp = (order.mp_payment_method || "").toLowerCase();
            return allowed.some((a) => mp.includes(a.replace("_", "")));
          });
        }

        // Filter by product name
        if (orderProductFilter.trim()) {
          const term = orderProductFilter.trim().toLowerCase();
          filteredOrders = filteredOrders.filter((order: unknown) => {
            const items = order.order_items || [];
            return items.some(
              (item: unknown) =>
                (item.product_name || "").toLowerCase().includes(term) ||
                (item.variant_title || "").toLowerCase().includes(term),
            );
          });
        }

        setOrders(filteredOrders);
        setOrdersTotalCount(
          extractTotalFromResponse(data) || filteredOrders.length,
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al cargar órdenes");
      }
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
      toast.error("Error al cargar órdenes");
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchClosures = async () => {
    setLoading(true);
    try {
      const headers: HeadersInit = { ...effectiveHeaders };

      const params = buildClosureParams(
        closuresCurrentPage,
        closuresItemsPerPage,
        fieldOperationIdFromUrl ?? undefined,
      );
      const response = await fetch(
        `/api/admin/cash-register/closures?${params}`,
        { headers },
      );
      if (response.ok) {
        const data = await response.json();
        setClosures(data.closures || []);
        setClosuresTotalCount(data.pagination?.total || 0);
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al cargar cierres de caja");
      }
    } catch (error: unknown) {
      console.error("Error fetching closures:", error);
      toast.error("Error al cargar cierres de caja");
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async () => {
    setLoadingSummary(true);
    try {
      const headers: HeadersInit = { ...effectiveHeaders };

      const today = getTodayInTimezone("America/Santiago");
      const response = await fetch(
        `/api/admin/cash-register/close?date=${today}`,
        { headers },
      );
      if (response.ok) {
        const data = await response.json();
        setDailySummary(data.summary);

        setOpeningCash(data.summary.opening_cash_amount || 0);
        setActualCash(null);

        if (data.previous_closure) {
          setOpeningCash(data.previous_closure.opening_cash_amount || 0);
          setCardMachineDebit(
            data.previous_closure.card_machine_debit_total || 0,
          );
          setCardMachineCredit(
            data.previous_closure.card_machine_credit_total || 0,
          );
          setTransferTotal(data.summary.transfer_sales || 0);
          setNotes(data.previous_closure.notes || "");
          setDiscrepancies(data.previous_closure.discrepancies || "");
        } else {
          setCardMachineDebit(data.summary.debit_card_sales || 0);
          setCardMachineCredit(data.summary.credit_card_sales || 0);
          setTransferTotal(data.summary.transfer_sales || 0);
        }

        await fetchCurrentSessionId();
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
  };

  const fetchCurrentSessionId = async () => {
    try {
      const headers: HeadersInit = { ...effectiveHeaders };

      const response = await fetch("/api/admin/cash-register/open", {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.session?.id) {
          setCurrentSessionId(data.session.id);
          await fetchMovements(data.session.id);
        }
      }
    } catch (error: unknown) {
      console.error("Error fetching session ID:", error);
    }
  };

  const fetchMovements = async (sessionId: string) => {
    if (!sessionId) return;

    setLoadingMovements(true);
    try {
      const headers: HeadersInit = { ...effectiveHeaders };

      const response = await fetch(
        `/api/admin/cash-register/session-movements?session_id=${sessionId}`,
        { headers, credentials: "include" },
      );

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      } else {
        const error = await response.json();
        console.error("Error fetching movements:", error);
      }
    } catch (error: unknown) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleCloseCashRegister = async () => {
    if (!dailySummary) {
      toast.error("No hay datos del día para cerrar");
      return;
    }

    setClosing(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...effectiveHeaders,
      };

      if (actualCash === null || actualCash === undefined || actualCash < 0) {
        toast.error("Debe ingresar el monto de efectivo físico contado");
        setClosing(false);
        return;
      }

      const today = getTodayInTimezone("America/Santiago");
      const actualCashValue = Number(actualCash);

      if (isNaN(actualCashValue) || actualCashValue < 0) {
        toast.error("El monto de efectivo físico contado debe ser 0 o mayor");
        setClosing(false);
        return;
      }

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
        headers,
        body: JSON.stringify(closeBody),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.details
          ? `${error.error || "Error al cerrar la caja"}: ${error.details}`
          : error.error || "Error al cerrar la caja";
        throw new Error(errorMessage);
      }

      toast.success("Caja cerrada exitosamente");
      setShowCloseDialog(false);

      await checkCashStatus();
      await fetchClosures();

      setOpeningCash(0);
      setActualCash(null);
      setCardMachineDebit(0);
      setCardMachineCredit(0);
      setTransferTotal(0);
      setNotes("");
      setDiscrepancies("");
    } catch (error: unknown) {
      console.error("Error closing cash register:", error);
      toast.error(error.message || "Error al cerrar la caja");
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
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...effectiveHeaders,
      };

      const response = await fetch("/api/admin/cash-register/reopen", {
        method: "POST",
        headers,
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (response.ok) {
        toast.success("Caja reabierta correctamente");
        await checkCashStatus();
        await fetchClosures();
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

  const fetchCreditNotes = async () => {
    setLoadingCreditNotes(true);
    try {
      const headers = effectiveHeaders;
      const { date_from, date_to } = buildCreditNotesDateRange();
      const params = new URLSearchParams({
        date_from,
        date_to,
        limit: "50",
        offset: "0",
      });
      const response = await fetch(`/api/admin/credit-notes?${params}`, {
        headers,
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

  const handleCancelOrder = async (
    orderId: string,
    reason: string,
    method: string,
  ) => {
    setProcessingOrderAction(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...effectiveHeaders,
      };

      const body: Record<string, unknown> = { reason, refund_method: method };

      const response = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success("Venta anulada correctamente");
        setOrderActionDialog(null);
        setSelectedOrderForAction(null);
        setOrderActionReason("");
        setRefundMethod("cash");
        await fetchOrders();
        await fetchCreditNotes();
        if (currentSessionId) {
          await fetchMovements(currentSessionId);
        }
      } else {
        let msg = "Error al anular venta";
        try {
          const errData = await response.json();
          msg = errData.details
            ? `${errData.error || "Error"}: ${errData.details}`
            : errData.error || msg;
        } catch (_) {
          msg = `Error ${response.status}: ${response.statusText}`;
        }
        toast.error(msg);
      }
    } catch (error: unknown) {
      console.error("Error cancelling order:", error);
      toast.error("Error al anular venta");
    } finally {
      setProcessingOrderAction(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setProcessingOrderAction(true);
    try {
      const headers: HeadersInit = { ...effectiveHeaders };

      const response = await fetch(`/api/admin/orders/${orderId}/delete`, {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        toast.success("Venta eliminada correctamente");
        setOrderActionDialog(null);
        setSelectedOrderForAction(null);
        await fetchOrders();
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al eliminar venta");
      }
    } catch (error: unknown) {
      console.error("Error deleting order:", error);
      toast.error("Error al eliminar venta");
    } finally {
      setProcessingOrderAction(false);
    }
  };

  // ─── Inline Helpers ───────────────────────────────────────────────────────

  const getStatusBadge = (
    status: string,
    reopenedAt?: string | null,
    posSessionId?: string | null,
  ) => {
    const { variant, label } = resolveClosureStatus(status, posSessionId);
    // ponytail: static icon map — icons stay here since they're JSX
    // These are imported from lucide-react at use-site (section components)
    // To avoid coupling the hook to React component rendering, we return status info only
    return { variant, label, status }; // sections will map icons
  };

  // ─── Return ──────────────────────────────────────────────────────────────

  return {
    // Route state
    fieldOperationIdFromUrl,

    // State
    fieldOperation,
    loadingFieldOperation,
    closures,
    loading,
    showCloseDialog,
    closing,
    dailySummary,
    loadingSummary,
    reopening,
    openingCash,
    actualCash,
    cardMachineDebit,
    cardMachineCredit,
    transferTotal,
    notes,
    discrepancies,
    isCashOpen,
    checkingCashStatus,
    openingCashInput,
    openingCashRegister,
    orders,
    loadingOrders,
    ordersTab,
    orderFilters,
    orderSearchTerm,
    orderProductFilter,
    selectedOrderForAction,
    orderActionDialog,
    orderActionReason,
    refundMethod,
    processingOrderAction,
    creditNotes,
    loadingCreditNotes,
    ordersCurrentPage,
    ordersItemsPerPage,
    ordersTotalCount,
    closuresCurrentPage,
    closuresItemsPerPage,
    closuresTotalCount,
    movements,
    loadingMovements,
    movementFilter,
    movementTypeFilter,
    currentSessionId,
    orderFiltersExpanded,

    // Computed
    isSuperAdmin,
    effectiveBranchId,
    isOperativoMode,
    effectiveHeaders,
    isGlobalView,
    cashDifference,

    // Handlers
    getStatusBadge,
    checkCashStatus,
    handleOpenCashRegister,
    fetchOrders,
    fetchClosures,
    fetchDailySummary,
    fetchCurrentSessionId,
    fetchMovements,
    handleCloseCashRegister,
    handleReopenCash,
    fetchCreditNotes,
    handleCancelOrder,
    handleDeleteOrder,

    // Setters (for form bindings)
    setShowCloseDialog,
    setOpeningCash,
    setActualCash,
    setCardMachineDebit,
    setCardMachineCredit,
    setTransferTotal,
    setNotes,
    setDiscrepancies,
    setOpeningCashInput,
    setOrdersTab,
    setOrderFilters,
    setOrderSearchTerm,
    setOrderProductFilter,
    setSelectedOrderForAction,
    setOrderActionDialog,
    setOrderActionReason,
    setRefundMethod,
    setOrdersCurrentPage,
    setOrdersItemsPerPage,
    setClosuresCurrentPage,
    setClosuresItemsPerPage,
    setMovementFilter,
    setMovementTypeFilter,
    setOrderFiltersExpanded,
  };
}
