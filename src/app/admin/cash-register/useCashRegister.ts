"use client";

import { useEffect } from "react";

import { useSearchParams } from "next/navigation";
import { useBranch } from "@/hooks/useBranch";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";
import { getTodayInTimezone } from "@/lib/utils/date-timezone";

import { useCashRegisterSession } from "./useCashRegisterSession";
import { useCashRegisterMovements } from "./useCashRegisterMovements";
import { useCashRegisterOrders } from "./useCashRegisterOrders";
import { computeCashDifference, resolveClosureStatus } from "./cashPaymentUtils";

export function useCashRegister() {
  const searchParams = useSearchParams();
  const fieldOperationIdFromUrl = searchParams.get("field_operation_id");
  const { currentBranchId, isSuperAdmin } = useBranch();

  // ─── Computed Values (deferred to actualEffectiveBranchId below) ───────────

  // ─── Session Hook ─────────────────────────────────────────────────────────

  // Build headers from currentBranchId, updated when field operation loads
  const initialHeaders = getBranchAndOperativoHeaders(
    currentBranchId ?? null,
    fieldOperationIdFromUrl,
  ) as Record<string, string>;

  const isGlobalView = !currentBranchId && isSuperAdmin && !fieldOperationIdFromUrl;

  const session = useCashRegisterSession({
    fieldOperationIdFromUrl,
    effectiveBranchId: currentBranchId ?? null,
    effectiveHeaders: initialHeaders,
    isSuperAdmin,
    isGlobalView,
    onSessionChange: () => {}, // populated below
  });

  const movements = useCashRegisterMovements(initialHeaders);
  const orders = useCashRegisterOrders(initialHeaders, fieldOperationIdFromUrl);

  // ─── Sync branch context ──────────────────────────────────────────────────

  const actualEffectiveBranchId =
    session.fieldOperation?.branch_id ?? currentBranchId ?? null;
  const isOperativoMode = !!fieldOperationIdFromUrl && !!session.fieldOperation;
  const actualHeaders = getBranchAndOperativoHeaders(
    actualEffectiveBranchId,
    fieldOperationIdFromUrl,
  );

  const cashDifference = computeCashDifference(
    session.actualCash,
    movements.dailySummary?.expected_cash ?? 0,
  );

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Reset date filters to today (Chile) when branch changes
  useEffect(() => {
    const today = getTodayInTimezone("America/Santiago");
    orders.setOrderFilters((prev: typeof orders.orderFilters) => ({
      ...prev,
      date_from: today,
      date_to: today,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualEffectiveBranchId]);

  // Initial data load
  useEffect(() => {
    if (fieldOperationIdFromUrl && !session.fieldOperation) return;
    orders.fetchClosures(orders.closuresCurrentPage, orders.closuresItemsPerPage);
    session.checkCashStatus();
    orders.fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualEffectiveBranchId, isGlobalView, fieldOperationIdFromUrl, session.fieldOperation]);

  // Refetch closures on pagination change
  useEffect(() => {
    if (fieldOperationIdFromUrl && !session.fieldOperation) return;
    orders.fetchClosures(orders.closuresCurrentPage, orders.closuresItemsPerPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.closuresCurrentPage, orders.closuresItemsPerPage, actualEffectiveBranchId, fieldOperationIdFromUrl, session.fieldOperation]);

  // Refetch orders on pagination and filter changes
  useEffect(() => {
    if (!isGlobalView && (!fieldOperationIdFromUrl || session.fieldOperation)) {
      orders.fetchOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.ordersCurrentPage, orders.ordersItemsPerPage, orders.orderFilters, actualEffectiveBranchId, isGlobalView, fieldOperationIdFromUrl, session.fieldOperation]);

  // Fetch daily summary + movements when close dialog opens
  useEffect(() => {
    if (session.showCloseDialog) {
      const loadData = async () => {
        const result = await movements.fetchDailySummary();
        if (result) {
          if (result.previousClosure) {
            const prev = result.previousClosure as Record<string, unknown>;
            session.setOpeningCash((prev.opening_cash_amount as number) || 0);
            session.setCardMachineDebit((prev.card_machine_debit_total as number) || 0);
            session.setCardMachineCredit((prev.card_machine_credit_total as number) || 0);
            session.setTransferTotal((result.summary?.transfer_sales as number) || 0);
            session.setNotes((prev.notes as string) || "");
            session.setDiscrepancies((prev.discrepancies as string) || "");
          } else {
            session.setCardMachineDebit((result.summary?.debit_card_sales as number) || 0);
            session.setCardMachineCredit((result.summary?.credit_card_sales as number) || 0);
            session.setTransferTotal((result.summary?.transfer_sales as number) || 0);
          }
        }
        if (session.currentSessionId) {
          await movements.fetchMovements(session.currentSessionId);
        }
      };
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.showCloseDialog, session.currentSessionId, actualEffectiveBranchId]);

  // Fetch orders when filters change
  useEffect(() => {
    orders.fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.orderFilters, orders.orderSearchTerm, orders.orderProductFilter]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getStatusBadge = (status: string, reopenedAt?: string | null, posSessionId?: string | null) => {
    const { variant, label } = resolveClosureStatus(status, posSessionId);
    return { variant, label, status };
  };

  // Wire up session close with post-close refresh
  const handleCloseCashRegister = async () => {
    await session.handleCloseCashRegister(movements.dailySummary, async () => {
      await session.checkCashStatus();
      await orders.fetchClosures(orders.closuresCurrentPage, orders.closuresItemsPerPage);
    });
  };

  const handleReopenCash = async (sessionId: string) => {
    await session.handleReopenCash(sessionId);
  };

  // Wire up cancel order with credit note / movement refresh
  const handleCancelOrder = async (orderId: string, reason: string, method: string) => {
    await orders.handleCancelOrder(orderId, reason, method, async () => {
      await movements.fetchCreditNotes();
      if (session.currentSessionId) {
        await movements.fetchMovements(session.currentSessionId);
      }
    });
  };

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    // Route state
    fieldOperationIdFromUrl,

    // Session state
    fieldOperation: session.fieldOperation,
    loadingFieldOperation: session.loadingFieldOperation,
    isCashOpen: session.isCashOpen,
    checkingCashStatus: session.checkingCashStatus,
    openingCash: session.openingCash,
    openingCashInput: session.openingCashInput,
    openingCashRegister: session.openingCashRegister,
    showCloseDialog: session.showCloseDialog,
    closing: session.closing,
    reopening: session.reopening,
    actualCash: session.actualCash,
    cardMachineDebit: session.cardMachineDebit,
    cardMachineCredit: session.cardMachineCredit,
    transferTotal: session.transferTotal,
    notes: session.notes,
    discrepancies: session.discrepancies,
    currentSessionId: session.currentSessionId,

    // Orders state
    orders: orders.orders,
    loadingOrders: orders.loadingOrders,
    ordersTab: orders.ordersTab,
    orderFilters: orders.orderFilters,
    orderSearchTerm: orders.orderSearchTerm,
    orderProductFilter: orders.orderProductFilter,
    selectedOrderForAction: orders.selectedOrderForAction,
    orderActionDialog: orders.orderActionDialog,
    orderActionReason: orders.orderActionReason,
    refundMethod: orders.refundMethod,
    processingOrderAction: orders.processingOrderAction,
    ordersCurrentPage: orders.ordersCurrentPage,
    ordersItemsPerPage: orders.ordersItemsPerPage,
    ordersTotalCount: orders.ordersTotalCount,

    // Closures state
    closures: orders.closures,
    loading: orders.loading,
    closuresCurrentPage: orders.closuresCurrentPage,
    closuresItemsPerPage: orders.closuresItemsPerPage,
    closuresTotalCount: orders.closuresTotalCount,

    // Movements state
    movements: movements.movements,
    loadingMovements: movements.loadingMovements,
    movementFilter: movements.movementFilter,
    movementTypeFilter: movements.movementTypeFilter,
    dailySummary: movements.dailySummary,
    loadingSummary: movements.loadingSummary,
    creditNotes: movements.creditNotes,
    loadingCreditNotes: movements.loadingCreditNotes,

    // UI state
    orderFiltersExpanded: orders.orderFiltersExpanded,

    // Computed
    isSuperAdmin,
    effectiveBranchId: actualEffectiveBranchId,
    isOperativoMode,
    effectiveHeaders: actualHeaders,
    isGlobalView,
    cashDifference,

    // Handlers
    getStatusBadge,
    checkCashStatus: session.checkCashStatus,
    handleOpenCashRegister: session.handleOpenCashRegister,
    fetchOrders: orders.fetchOrders,
    fetchClosures: () => orders.fetchClosures(orders.closuresCurrentPage, orders.closuresItemsPerPage),
    fetchDailySummary: movements.fetchDailySummary,
    fetchCurrentSessionId: session.fetchCurrentSessionId,
    fetchMovements: movements.fetchMovements,
    handleCloseCashRegister,
    handleReopenCash,
    fetchCreditNotes: movements.fetchCreditNotes,
    handleCancelOrder,
    handleDeleteOrder: orders.handleDeleteOrder,

    // Setters
    setShowCloseDialog: session.setShowCloseDialog,
    setOpeningCash: session.setOpeningCash,
    setActualCash: session.setActualCash,
    setCardMachineDebit: session.setCardMachineDebit,
    setCardMachineCredit: session.setCardMachineCredit,
    setTransferTotal: session.setTransferTotal,
    setNotes: session.setNotes,
    setDiscrepancies: session.setDiscrepancies,
    setOpeningCashInput: session.setOpeningCashInput,
    setOrdersTab: orders.setOrdersTab,
    setOrderFilters: orders.setOrderFilters,
    setOrderSearchTerm: orders.setOrderSearchTerm,
    setOrderProductFilter: orders.setOrderProductFilter,
    setSelectedOrderForAction: orders.setSelectedOrderForAction,
    setOrderActionDialog: orders.setOrderActionDialog,
    setOrderActionReason: orders.setOrderActionReason,
    setRefundMethod: orders.setRefundMethod,
    setOrdersCurrentPage: orders.setOrdersCurrentPage,
    setOrdersItemsPerPage: orders.setOrdersItemsPerPage,
    setClosuresCurrentPage: orders.setClosuresCurrentPage,
    setClosuresItemsPerPage: orders.setClosuresItemsPerPage,
    setMovementFilter: movements.setMovementFilter,
    setMovementTypeFilter: movements.setMovementTypeFilter,
    setOrderFiltersExpanded: orders.setOrderFiltersExpanded,
  };
}
