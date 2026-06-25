"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";
import {
  extractDataFromResponse,
  extractTotalFromResponse,
} from "@/lib/api/response-helpers";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";
import { getTodayInTimezone } from "@/lib/utils/date-timezone";

import type { CashClosure, DailySummary, Movement } from "./cashRegister.types";

// ponytail: re-export for backward compat — remove in T-119
export type { CashClosure, DailySummary, Movement } from "./cashRegister.types";

export default function CashRegisterPage() {
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
  const [actualCash, setActualCash] = useState<number | null>(null); // null = vacío, usuario debe ingresar
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
  // Fecha en zona Chile (America/Santiago) para filtros
  const getTodayLocal = () => getTodayInTimezone("America/Santiago");
  const [orderFilters, setOrderFilters] = useState(() => ({
    payment_status: "all",
    payment_method: "all",
    date_from: getTodayLocal(),
    date_to: getTodayLocal(),
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

  // Credit notes (use wider date range to avoid timezone issues)
  const [creditNotes, setCreditNotes] = useState<unknown[]>([]);
  const [loadingCreditNotes, setLoadingCreditNotes] = useState(false);
  const getCreditNotesDateRange = () => {
    // Wide range (5 years back, 1 year ahead) to show all notes including "antiguas"
    // and avoid timezone/year mismatches between client and DB
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 5);
    to.setFullYear(to.getFullYear() + 1);
    return {
      date_from: from.toISOString().split("T")[0],
      date_to: to.toISOString().split("T")[0],
    };
  };

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

  const effectiveBranchId =
    fieldOperation?.branch_id ?? currentBranchId ?? null;
  const isOperativoMode = !!fieldOperationIdFromUrl && !!fieldOperation;
  const effectiveHeaders = getBranchAndOperativoHeaders(
    effectiveBranchId,
    fieldOperationIdFromUrl,
  );
  const isGlobalView =
    !effectiveBranchId && isSuperAdmin && !fieldOperationIdFromUrl;

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

  // Reset filtros de fecha al día actual (Chile) al cambiar sucursal
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
    // Load orders by default (incl. super admin Vista Global - API filters by org)
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
        const data = result.data || result; // Handle both standardized and legacy responses
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
        const data = result.data || result; // Handle both standardized and legacy responses
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

      const offset = (ordersCurrentPage - 1) * ordersItemsPerPage;
      const params = new URLSearchParams({
        date_from: orderFilters.date_from,
        date_to: orderFilters.date_to,
        limit: ordersItemsPerPage.toString(),
        offset: offset.toString(),
      });

      // Handle special cases: cancelled and refunded
      if (orderFilters.payment_status === "cancelled") {
        params.append("status", "cancelled");
      } else if (orderFilters.payment_status === "refunded") {
        params.append("payment_status", "refunded");
      } else if (orderFilters.payment_status !== "all") {
        params.append("payment_status", orderFilters.payment_status);
      }

      const response = await fetch(`/api/admin/orders?${params}`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        let filteredOrders = extractDataFromResponse(data);

        // Apply search filter (client-side for now, could be moved to backend)
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

        // Filter by payment method (from order_payments or mp_payment_method)
        if (orderFilters.payment_method !== "all") {
          const methodMap: Record<string, string[]> = {
            cash: ["cash"],
            debit: ["debit", "debit_card"],
            credit: ["credit", "credit_card"],
            transfer: ["transfer"],
          };
          const allowed = methodMap[orderFilters.payment_method] || [];
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

        // Filter by product name in order_items
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
        // Use API pagination total (standardized: meta.pagination.total)
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

  const fetchClosures = async () => {
    setLoading(true);
    try {
      const headers: HeadersInit = { ...effectiveHeaders };

      const offset = (closuresCurrentPage - 1) * closuresItemsPerPage;
      const params = new URLSearchParams({
        limit: closuresItemsPerPage.toString(),
        offset: offset.toString(),
      });
      if (fieldOperationIdFromUrl) {
        params.append("field_operation_id", fieldOperationIdFromUrl);
      }

      const response = await fetch(
        `/api/admin/cash-register/closures?${params}`,
        {
          headers,
        },
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

        // ✅ Cargar valores del resumen
        setOpeningCash(data.summary.opening_cash_amount || 0);
        // actualCash siempre debe estar vacío (null) para que el usuario lo ingrese manualmente
        // Esto aplica tanto para primera vez como para reapertura
        setActualCash(null);

        // Si hay un cierre previo (reabierto), cargar valores de referencia
        if (data.previous_closure) {
          setOpeningCash(data.previous_closure.opening_cash_amount || 0);
          // NO cargar actualCash - debe estar vacío para que el usuario ingrese el nuevo valor físico
          setCardMachineDebit(
            data.previous_closure.card_machine_debit_total || 0,
          );
          setCardMachineCredit(
            data.previous_closure.card_machine_credit_total || 0,
          );
          // Transferencias se guardan en other_payment_sales, pero para el input usamos transfer_sales del summary
          setTransferTotal(data.summary.transfer_sales || 0);
          setNotes(data.previous_closure.notes || "");
          setDiscrepancies(data.previous_closure.discrepancies || "");
        } else {
          // Primera vez cerrando: cargar valores del resumen del día
          setCardMachineDebit(data.summary.debit_card_sales || 0);
          setCardMachineCredit(data.summary.credit_card_sales || 0);
          setTransferTotal(data.summary.transfer_sales || 0);
        }

        // Get current session ID to fetch movements
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

      // Validar que se haya ingresado el efectivo físico contado
      if (actualCash === null || actualCash === undefined || actualCash < 0) {
        toast.error("Debe ingresar el monto de efectivo físico contado");
        setClosing(false);
        return;
      }

      const today = getTodayInTimezone("America/Santiago");

      // Validar que actual_cash sea un número válido
      const actualCashValue = Number(actualCash);

      if (isNaN(actualCashValue) || actualCashValue < 0) {
        toast.error("El monto de efectivo físico contado debe ser 0 o mayor");
        setClosing(false);
        return;
      }

      console.log("Closing cash register with values:", {
        opening_cash_amount: openingCash,
        actual_cash: actualCashValue,
        expected_cash: dailySummary?.expected_cash,
        cash_sales: dailySummary?.cash_sales,
        calculated_difference:
          actualCashValue - (dailySummary?.expected_cash || 0),
      });

      const closeBody: Record<string, unknown> = {
        closure_date: `${today}T00:00:00`,
        opening_cash_amount: openingCash,
        actual_cash: actualCashValue,
        card_machine_debit_total: cardMachineDebit,
        card_machine_credit_total: cardMachineCredit,
        notes: notes || null,
        discrepancies: discrepancies || null,
      };
      if (fieldOperationIdFromUrl)
        closeBody.field_operation_id = fieldOperationIdFromUrl;

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
        console.error("Error closing cash register:", {
          error,
          status: response.status,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success("Caja cerrada exitosamente");
      setShowCloseDialog(false);

      // Refresh cash status to update UI
      await checkCashStatus();
      // Refresh closures list
      await fetchClosures();

      // Reset form
      setOpeningCash(0);
      setActualCash(null); // Vacío para que el usuario lo ingrese
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
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

      if (response.ok) {
        toast.success("Caja reabierta correctamente");
        // Refresh cash status to update UI
        await checkCashStatus();
        // Refresh closures list
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
      const { date_from, date_to } = getCreditNotesDateRange();
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

      const body: Record<string, unknown> = {
        reason,
        refund_method: method,
      };

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

  const getStatusBadge = (
    status: string,
    reopenedAt?: string | null,
    posSessionId?: string | null,
  ) => {
    const config: Record<
      string,
      { variant: unknown; label: string; icon: unknown }
    > = {
      draft: { variant: "secondary", label: "Abierta", icon: RefreshCw }, // draft = caja abierta
      confirmed: { variant: "default", label: "Confirmado", icon: CheckCircle },
      reviewed: { variant: "secondary", label: "Revisado", icon: Eye },
      closed: { variant: "default", label: "Cerrada", icon: CheckCircle }, // closed = caja cerrada
      reopened: { variant: "secondary", label: "Abierta", icon: RefreshCw },
    };

    // Lógica correcta:
    // - Si está "closed", SIEMPRE mostrar "Cerrada" (independientemente de si fue reabierta en el pasado)
    // - Si está "draft" y tiene session_id = "Abierta" (caja actualmente abierta)
    // - Si está "draft" y NO tiene session_id = "Borrador" (no debería pasar)
    let statusConfig;
    if (status === "closed") {
      // Si está cerrada, siempre mostrar "Cerrada"
      // El hecho de que haya sido reabierta (reopenedAt) es histórico, pero si está cerrada, está cerrada
      statusConfig = config.closed;
    } else if (status === "draft" && posSessionId) {
      // draft con session_id = caja abierta
      statusConfig = config.reopened || config.draft;
    } else {
      statusConfig = config[status] || {
        variant: "outline",
        label: status,
        icon: FileText,
      };
    }

    const Icon = statusConfig.icon;

    return (
      <Badge className="flex items-center gap-1" variant={statusConfig.variant}>
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  // Calcular diferencia solo si actualCash tiene un valor ingresado
  const cashDifference =
    dailySummary && actualCash !== null && actualCash !== undefined
      ? actualCash - (dailySummary.expected_cash || 0)
      : null;

  if (fieldOperationIdFromUrl && loadingFieldOperation) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary" />
      </div>
    );
  }

  if (fieldOperationIdFromUrl && !fieldOperation) {
    return (
      <div className="space-y-6">
        <p className="text-admin-text-secondary">Operativo no encontrado.</p>
        <Link href="/admin/cash-register">
          <Button variant="outline">Volver a Caja</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 min-w-0">
      {/* Operativo mode banner */}
      {isOperativoMode && fieldOperation && (
        <div className="rounded-lg border border-admin-accent-primary/30 bg-admin-accent-primary/10 px-4 py-2 text-sm text-admin-text-primary">
          Modo operativo: <strong>{fieldOperation.name}</strong>
        </div>
      )}

      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-epoch-primary">
            {isOperativoMode && fieldOperation
              ? `Caja - ${fieldOperation.name}`
              : "Caja"}
          </h1>
          <p className="text-sm text-admin-text-tertiary mt-1">
            {isGlobalView
              ? "Gestión de caja - Todas las sucursales"
              : isOperativoMode
                ? "Caja independiente del operativo en terreno"
                : "Gestión de caja diaria"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={
              isOperativoMode && fieldOperationIdFromUrl
                ? `/admin/pos?field_operation_id=${fieldOperationIdFromUrl}`
                : "/admin/pos"
            }
          >
            <Button className="shrink-0" size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al POS
            </Button>
          </Link>
          <Button
            className="shrink-0"
            disabled={!effectiveBranchId && !isSuperAdmin}
            onClick={() => setShowCloseDialog(true)}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Cerrar Caja
          </Button>
        </div>
      </div>

      {/* Cash Status Card - visible and usable on mobile */}
      {!isGlobalView && (
        <Card
          className={
            isCashOpen
              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
              : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="flex items-center gap-2">
                <DollarSign
                  className={`h-5 w-5 ${isCashOpen ? "text-green-600" : "text-red-600"}`}
                />
                Estado de Caja
              </span>
              {checkingCashStatus ? (
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <Badge
                  className="w-fit text-sm px-3 py-1"
                  variant={isCashOpen ? "default" : "destructive"}
                >
                  {isCashOpen ? "Abierta" : "Cerrada"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkingCashStatus ? (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Verificando estado...</p>
              </div>
            ) : isCashOpen ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monto Inicial:</span>
                  <span className="font-semibold text-green-700">
                    {formatCurrency(openingCash)}
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  La caja está abierta y lista para realizar ventas.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                    La caja está cerrada
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    Debe abrir la caja antes de realizar ventas en el POS.
                  </p>
                  <div className="space-y-3">
                    <Label htmlFor="opening_cash">Monto Inicial de Caja</Label>
                    <Input
                      className="w-full sm:max-w-xs h-12"
                      id="opening_cash"
                      min="0"
                      placeholder="0"
                      step="0.01"
                      type="number"
                      value={openingCashInput}
                      onChange={(e) => setOpeningCashInput(e.target.value)}
                    />
                    <Button
                      className="w-full sm:w-auto h-12"
                      disabled={openingCashRegister || !openingCashInput}
                      onClick={handleOpenCashRegister}
                    >
                      {openingCashRegister ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Abriendo...
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Abrir Caja
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Summary Card (if branch selected) */}
      {effectiveBranchId && dailySummary && (
        <Card className="bg-admin-bg-tertiary">
          <CardHeader className="pb-2 pt-4 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              Resumen del Día - {formatDate(new Date())}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <p className="text-[10px] sm:text-xs text-admin-text-tertiary uppercase tracking-wide">
                  Total Ventas
                </p>
                <p className="text-base sm:text-lg font-bold text-epoch-primary mt-0.5">
                  {formatCurrency(dailySummary.total_sales)}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-admin-text-tertiary uppercase tracking-wide">
                  Transacciones
                </p>
                <p className="text-base sm:text-lg font-bold text-epoch-primary mt-0.5">
                  {dailySummary.total_transactions}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-admin-text-tertiary uppercase tracking-wide">
                  Efectivo Esperado
                </p>
                <p className="text-base sm:text-lg font-bold text-admin-success mt-0.5">
                  {formatCurrency(dailySummary.expected_cash)}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-admin-text-tertiary uppercase tracking-wide">
                  Ventas Efectivo
                </p>
                <p className="text-base sm:text-lg font-bold text-epoch-primary mt-0.5">
                  {formatCurrency(dailySummary.cash_sales)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Closures, Orders and Credit Notes - responsive */}
      <Tabs className="space-y-4" defaultValue="orders">
        <TabsList className="flex flex-col sm:flex-row h-auto w-full sm:w-auto">
          <TabsTrigger
            className="w-full sm:w-auto data-[state=active]:bg-admin-accent-secondary data-[state=active]:text-[#1A2B23]"
            value="closures"
          >
            Cierres de Caja
          </TabsTrigger>
          <TabsTrigger
            className="w-full sm:w-auto data-[state=active]:bg-admin-accent-secondary data-[state=active]:text-[#1A2B23]"
            value="orders"
            onClick={() => setOrdersTab(true)}
          >
            Ventas / Órdenes
          </TabsTrigger>
          <TabsTrigger
            className="w-full sm:w-auto data-[state=active]:bg-admin-accent-secondary data-[state=active]:text-[#1A2B23]"
            value="credit_notes"
            onClick={() => fetchCreditNotes()}
          >
            Notas de Crédito
          </TabsTrigger>
        </TabsList>

        <TabsContent value="closures">
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] min-w-0">
            <CardHeader>
              <CardTitle>Cierres de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
                  <p className="text-admin-text-tertiary">
                    Cargando cierres...
                  </p>
                </div>
              ) : closures.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-epoch-primary mb-2">
                    No hay cierres de caja
                  </h3>
                  <p className="text-admin-text-tertiary">
                    {effectiveBranchId
                      ? isOperativoMode
                        ? "Aún no se ha cerrado la caja para este operativo"
                        : "Aún no se ha cerrado la caja para esta sucursal"
                      : "Seleccione una sucursal para ver sus cierres de caja"}
                  </p>
                </div>
              ) : (
                <div className="w-full min-w-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        {isSuperAdmin && <TableHead>Sucursal</TableHead>}
                        <TableHead>Fecha</TableHead>
                        <TableHead>Ventas Totales</TableHead>
                        <TableHead>Transacciones</TableHead>
                        <TableHead>Efectivo</TableHead>
                        <TableHead>Tarjeta Débito</TableHead>
                        <TableHead>Tarjeta Crédito</TableHead>
                        <TableHead>Transferencias</TableHead>
                        <TableHead>Diferencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Cerrado por</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closures.map((closure) => {
                        const shouldShowReopen =
                          isSuperAdmin &&
                          (closure.status === "closed" ||
                            closure.status === "draft") &&
                          closure.pos_session_id;
                        // Extract transfer sales from other_payment_sales (since DB doesn't have separate field)
                        // This is a workaround - ideally we'd have transfer_sales in the DB
                        const transferSales = closure.other_payment_sales || 0;
                        return (
                          <TableRow key={closure.id}>
                            {isSuperAdmin && (
                              <TableCell>
                                {closure.branch?.name || "N/A"}
                              </TableCell>
                            )}
                            <TableCell>
                              {formatDate(closure.closure_date)}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(closure.total_sales)}
                            </TableCell>
                            <TableCell>{closure.total_transactions}</TableCell>
                            <TableCell>
                              {formatCurrency(closure.cash_sales)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(closure.debit_card_sales)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(closure.credit_card_sales)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(transferSales)}
                            </TableCell>
                            <TableCell>
                              {closure.cash_difference !== null &&
                              closure.cash_difference !== undefined ? (
                                <div className="flex items-center gap-1">
                                  {closure.cash_difference > 0 ? (
                                    <>
                                      <TrendingUp className="h-4 w-4 text-green-600" />
                                      <span className="text-green-600 font-semibold">
                                        +
                                        {formatCurrency(
                                          Math.abs(closure.cash_difference),
                                        )}
                                      </span>
                                    </>
                                  ) : closure.cash_difference < 0 ? (
                                    <>
                                      <TrendingDown className="h-4 w-4 text-red-600" />
                                      <span className="text-red-600 font-semibold">
                                        {formatCurrency(
                                          closure.cash_difference,
                                        )}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-admin-text-tertiary">
                                      $0
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-admin-text-tertiary">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(
                                closure.status,
                                closure.reopened_at,
                                closure.pos_session_id,
                              )}
                            </TableCell>
                            <TableCell>
                              {closure.closed_by_user
                                ? `${closure.closed_by_user.first_name} ${closure.closed_by_user.last_name}`
                                : "N/A"}
                            </TableCell>
                            <TableCell className="space-x-2">
                              {isSuperAdmin &&
                                (closure.status === "closed" ||
                                  closure.status === "draft") &&
                                closure.pos_session_id && (
                                  <Button
                                    disabled={reopening}
                                    size="sm"
                                    title="Solo superadmin puede reabrir cajas cerradas"
                                    variant="outline"
                                    onClick={() =>
                                      handleReopenCash(
                                        closure.pos_session_id || "",
                                      )
                                    }
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reabrir
                                  </Button>
                                )}
                              <Link href={`/admin/cash-register/${closure.id}`}>
                                <Button
                                  size="sm"
                                  title={
                                    closure.reopened_at
                                      ? `Caja reabierta${closure.reopen_count && closure.reopen_count > 1 ? ` ${closure.reopen_count} veces` : ""}${closure.reopen_notes ? `. Notas: ${closure.reopen_notes}` : ""}`
                                      : undefined
                                  }
                                  variant="outline"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                  {closure.reopened_at && (
                                    <RefreshCw className="h-3 w-3 ml-1 text-blue-600" />
                                  )}
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination for Closures */}
              {!loading && closures.length > 0 && (
                <div className="mt-4 w-full min-w-0 overflow-x-auto">
                  <Pagination
                    className="flex-wrap gap-y-2"
                    currentPage={closuresCurrentPage}
                    itemsPerPage={closuresItemsPerPage}
                    itemsPerPageOptions={[10, 20, 50, 100]}
                    totalItems={closuresTotalCount}
                    totalPages={Math.ceil(
                      closuresTotalCount / closuresItemsPerPage,
                    )}
                    onItemsPerPageChange={setClosuresItemsPerPage}
                    onPageChange={setClosuresCurrentPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] min-w-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ventas / Órdenes</CardTitle>
                <Button size="sm" variant="outline" onClick={fetchOrders}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters - mobile: search + collapsible; desktop: all visible */}
              <div className="mb-4 space-y-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs sm:text-sm">Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          className="pl-8 text-sm"
                          placeholder="Orden, email, cliente..."
                          value={orderSearchTerm}
                          onChange={(e) => {
                            setOrderSearchTerm(e.target.value);
                            fetchOrders();
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      className="md:hidden w-full sm:w-auto flex items-center justify-center gap-2"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setOrderFiltersExpanded((v) => !v)}
                    >
                      <Filter className="h-4 w-4" />
                      Filtros
                      {orderFiltersExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div
                    className={`grid gap-3 transition-all md:grid md:grid-cols-2 lg:grid-cols-5 ${
                      orderFiltersExpanded ? "grid" : "hidden md:grid"
                    }`}
                  >
                    <div className="md:col-span-2 lg:col-span-1">
                      <Label className="text-xs sm:text-sm">
                        Estado de Pago
                      </Label>
                      <Select
                        value={orderFilters.payment_status}
                        onValueChange={(value) => {
                          setOrderFilters({
                            ...orderFilters,
                            payment_status: value,
                          });
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="paid">Pagado</SelectItem>
                          <SelectItem value="partial">Parcial</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="cancelled">Anulado</SelectItem>
                          <SelectItem value="refunded">Reembolsado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">
                        Método de Pago
                      </Label>
                      <Select
                        value={orderFilters.payment_method}
                        onValueChange={(value) => {
                          setOrderFilters({
                            ...orderFilters,
                            payment_method: value,
                          });
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="debit">Débito</SelectItem>
                          <SelectItem value="credit">Crédito</SelectItem>
                          <SelectItem value="transfer">
                            Transferencia
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Producto</Label>
                      <Input
                        className="text-sm h-9"
                        placeholder="Ej: Kit Limpieza"
                        value={orderProductFilter}
                        onChange={(e) => setOrderProductFilter(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Fecha Desde</Label>
                      <Input
                        className="text-sm h-9"
                        type="date"
                        value={orderFilters.date_from}
                        onChange={(e) => {
                          setOrderFilters({
                            ...orderFilters,
                            date_from: e.target.value,
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Fecha Hasta</Label>
                      <Input
                        className="text-sm h-9"
                        type="date"
                        value={orderFilters.date_to}
                        onChange={(e) => {
                          setOrderFilters({
                            ...orderFilters,
                            date_to: e.target.value,
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        className="h-9 text-xs"
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const today = getTodayInTimezone("America/Santiago");
                          setOrderFilters((prev) => ({
                            ...prev,
                            date_from: today,
                            date_to: today,
                          }));
                        }}
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Hoy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders Table */}
              {loadingOrders ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
                  <p className="text-admin-text-tertiary">
                    Cargando órdenes...
                  </p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-epoch-primary mb-2">
                    No hay órdenes
                  </h3>
                  <p className="text-admin-text-tertiary">
                    {isGlobalView
                      ? "Seleccione una sucursal para ver sus órdenes"
                      : "No se encontraron órdenes con los filtros seleccionados"}
                  </p>
                </div>
              ) : (
                <div className="w-full min-w-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Método de Pago</TableHead>
                        <TableHead>Estado de Pago</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {order.customer_name ||
                                  order.sii_business_name ||
                                  (order.billing_first_name &&
                                  order.billing_last_name
                                    ? `${order.billing_first_name} ${order.billing_last_name}`.trim()
                                    : order.customer_email ||
                                      "Cliente no registrado")}
                              </div>
                              {order.sii_rut && (
                                <div className="text-xs text-admin-text-tertiary font-mono">
                                  {order.sii_rut}
                                </div>
                              )}
                              {/* Mostrar email o teléfono solo si hay nombre arriba, para evitar duplicación */}
                              {(order.customer_name ||
                                order.sii_business_name ||
                                (order.billing_first_name &&
                                  order.billing_last_name)) && (
                                <>
                                  {order.customer_email && (
                                    <div className="text-xs text-admin-text-tertiary">
                                      {order.customer_email}
                                    </div>
                                  )}
                                  {(order.customer_phone ||
                                    order.billing_phone ||
                                    order.shipping_phone) && (
                                    <div className="text-xs text-admin-text-tertiary">
                                      {order.customer_phone ||
                                        order.billing_phone ||
                                        order.shipping_phone}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              {order.order_items &&
                              order.order_items.length > 0 ? (
                                <>
                                  {order.order_items
                                    .slice(0, 2)
                                    .map((item: unknown, idx: number) => {
                                      const productName =
                                        item.product_name || "Producto";
                                      return (
                                        <div className="text-sm" key={idx}>
                                          <span className="font-medium">
                                            {item.quantity}x
                                          </span>{" "}
                                          <span>{productName}</span>
                                          {item.sku && (
                                            <span className="text-xs text-admin-text-tertiary ml-1">
                                              ({item.sku})
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  {order.order_items.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{order.order_items.length - 2} más
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-sm text-admin-text-tertiary">
                                  Sin productos
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              {formatCurrency(order.total_amount)}
                            </div>
                            {(() => {
                              const paid =
                                order.order_payments?.reduce(
                                  (sum: number, p: unknown) =>
                                    sum + Number(p.amount || 0),
                                  0,
                                ) || 0;
                              const pending = Math.max(
                                0,
                                order.total_amount - paid,
                              );
                              if (pending > 0 && order.status !== "cancelled") {
                                return (
                                  <div className="text-xs text-red-600 font-medium">
                                    Pdte: {formatCurrency(pending)}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const methodsFromPayments =
                                order.order_payments?.map(
                                  (p: unknown) => p.payment_method,
                                ) || [];
                              const uniqueMethods = Array.from(
                                new Set(methodsFromPayments),
                              );

                              if (uniqueMethods.length > 0) {
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {uniqueMethods.map(
                                      (method: unknown, idx: number) => (
                                        <Badge
                                          className="text-[10px] px-1 h-5 capitalize"
                                          key={idx}
                                          variant="outline"
                                        >
                                          {method === "cash"
                                            ? "Efectivo"
                                            : method === "debit"
                                              ? "Débito"
                                              : method === "credit"
                                                ? "Crédito"
                                                : method === "transfer"
                                                  ? "Transf."
                                                  : method}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <Badge
                                  className="text-[10px] px-1 h-5"
                                  variant="outline"
                                >
                                  {order.payment_method_type === "cash" &&
                                    "Efectivo"}
                                  {order.payment_method_type === "debit_card" &&
                                    "Débito"}
                                  {order.payment_method_type ===
                                    "credit_card" && "Crédito"}
                                  {order.payment_method_type === "transfer" &&
                                    "Transf."}
                                  {order.payment_method_type === "deposit" &&
                                    "Abono"}
                                  {order.payment_method_type ===
                                    "installments" && "Cuotas"}
                                  {![
                                    "cash",
                                    "debit_card",
                                    "credit_card",
                                    "transfer",
                                    "deposit",
                                    "installments",
                                  ].includes(order.payment_method_type) &&
                                    (order.payment_method_type || "N/A")}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === "cancelled"
                                  ? "destructive"
                                  : order.payment_status === "paid"
                                    ? "default"
                                    : order.payment_status === "partial"
                                      ? "secondary"
                                      : order.payment_status === "refunded"
                                        ? "destructive"
                                        : "outline"
                              }
                            >
                              {order.status === "cancelled" && "Anulado"}
                              {order.status !== "cancelled" &&
                                order.payment_status === "paid" &&
                                "Pagado"}
                              {order.status !== "cancelled" &&
                                order.payment_status === "partial" &&
                                "Parcial"}
                              {order.status !== "cancelled" &&
                                order.payment_status === "pending" &&
                                "Pendiente"}
                              {order.status !== "cancelled" &&
                                order.payment_status === "refunded" &&
                                "Reembolsado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/cash-register/orders/${order.id}`}
                              >
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                              </Link>
                              {isSuperAdmin && order.status !== "cancelled" && (
                                <Button
                                  className="text-red-600 hover:text-red-700"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setOrderActionDialog("cancel");
                                  }}
                                >
                                  Anular
                                </Button>
                              )}
                              {isSuperAdmin && order.status === "cancelled" && (
                                <Button
                                  className="text-red-600 hover:text-red-700"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForAction(order);
                                    setOrderActionDialog("delete");
                                  }}
                                >
                                  Eliminar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination for Orders */}
              {!loadingOrders && orders.length > 0 && (
                <div className="mt-4 w-full min-w-0 overflow-x-auto">
                  <Pagination
                    className="flex-wrap gap-y-2"
                    currentPage={ordersCurrentPage}
                    itemsPerPage={ordersItemsPerPage}
                    itemsPerPageOptions={[10, 20, 50, 100]}
                    totalItems={ordersTotalCount}
                    totalPages={Math.ceil(
                      ordersTotalCount / ordersItemsPerPage,
                    )}
                    onItemsPerPageChange={setOrdersItemsPerPage}
                    onPageChange={setOrdersCurrentPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit_notes">
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] min-w-0">
            <CardHeader>
              <CardTitle>Notas de Crédito</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCreditNotes ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
                  <p className="text-admin-text-tertiary">
                    Cargando notas de crédito...
                  </p>
                </div>
              ) : creditNotes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-epoch-primary mb-2">
                    No hay notas de crédito
                  </h3>
                  <p className="text-admin-text-tertiary">
                    Las notas de crédito se crean al anular una venta con la
                    opción correspondiente
                  </p>
                </div>
              ) : (
                <div className="w-full min-w-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <Table className="min-w-[550px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Orden</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método Reembolso</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditNotes.map((cn) => (
                        <TableRow key={cn.id}>
                          <TableCell className="font-mono font-medium">
                            {cn.credit_note_number}
                          </TableCell>
                          <TableCell>
                            {cn.order_id ? (
                              <Link
                                href={`/admin/cash-register/orders/${cn.order_id}`}
                              >
                                <Button className="p-0 h-auto" variant="link">
                                  {cn.order_number || "Ver orden"}
                                </Button>
                              </Link>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">
                            -{formatCurrency(cn.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {cn.refund_method === "cash"
                                ? "Efectivo"
                                : cn.refund_method === "debit"
                                  ? "Débito"
                                  : cn.refund_method === "credit"
                                    ? "Crédito"
                                    : "Transferencia"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {cn.reason}
                          </TableCell>
                          <TableCell>{formatDateTime(cn.created_at)}</TableCell>
                          <TableCell>
                            {cn.order_id && (
                              <Link
                                href={`/admin/cash-register/orders/${cn.order_id}`}
                              >
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver orden
                                </Button>
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Close Cash Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6 gap-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Cerrar Caja
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete los datos para cerrar la caja del día
            </DialogDescription>
          </DialogHeader>

          {loadingSummary ? (
            <div className="text-center py-6 sm:py-8">
              <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-epoch-primary mx-auto mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Cargando resumen del día...
              </p>
            </div>
          ) : dailySummary ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Summary */}
              <Card>
                <CardHeader className="pb-1 pt-4 sm:pt-6">
                  <CardTitle className="text-sm sm:text-base">
                    Resumen del Día
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
                      Total Ventas
                    </p>
                    <p className="text-sm sm:text-base font-bold mt-0.5">
                      {formatCurrency(dailySummary.total_sales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
                      Transacciones
                    </p>
                    <p className="text-sm sm:text-base font-bold mt-0.5">
                      {dailySummary.total_transactions}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
                      Efectivo Neto
                    </p>
                    <p className="text-sm sm:text-base font-bold mt-0.5">
                      {formatCurrency(dailySummary.cash_sales)}
                    </p>
                    {(dailySummary.cash_inflows != null ||
                      dailySummary.cash_outflows != null) && (
                      <p className="text-[9px] sm:text-[10px] text-admin-text-tertiary mt-0.5 break-words">
                        Ing: {formatCurrency(dailySummary.cash_inflows ?? 0)} |
                        Eg: -{formatCurrency(dailySummary.cash_outflows ?? 0)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
                      Débito
                    </p>
                    <p className="text-sm sm:text-base font-bold mt-0.5">
                      {formatCurrency(dailySummary.debit_card_sales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
                      Crédito
                    </p>
                    <p className="text-sm sm:text-base font-bold mt-0.5">
                      {formatCurrency(dailySummary.credit_card_sales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
                      Transferencias
                    </p>
                    <p className="text-sm sm:text-base font-bold mt-0.5">
                      {formatCurrency(dailySummary.transfer_sales || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
                      Efectivo Esperado
                    </p>
                    <p className="text-sm sm:text-base font-bold text-admin-success mt-0.5">
                      {formatCurrency(dailySummary.expected_cash)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions for Cash Reconciliation */}
              <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                    <span className="break-words">
                      Instrucciones para Cuadre de Caja
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <p className="break-words">
                    <strong>1. Efectivo Físico Contado:</strong> Cuente el
                    dinero en su caja física
                  </p>
                  <p className="break-words">
                    <strong>2. Máquina Débito:</strong> Ingrese el total de la
                    máquina de débito (total de vouchers)
                  </p>
                  <p className="break-words">
                    <strong>3. Máquina Crédito:</strong> Ingrese el total de la
                    máquina de crédito (total de vouchers)
                  </p>
                  <p>
                    <strong>Referencia para cuadre:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 space-y-1">
                    <li className="break-words">
                      Efectivo esperado:{" "}
                      <strong>
                        {formatCurrency(dailySummary.expected_cash)}
                      </strong>{" "}
                      (Monto inicial{" "}
                      {formatCurrency(dailySummary.opening_cash_amount)} +
                      efectivo neto {formatCurrency(dailySummary.cash_sales)})
                    </li>
                    {(dailySummary.cash_inflows != null ||
                      dailySummary.cash_outflows != null) && (
                      <li className="text-[10px] sm:text-xs break-words">
                        Desglose: Ingresos{" "}
                        {formatCurrency(dailySummary.cash_inflows ?? 0)} -
                        Egresos{" "}
                        {formatCurrency(dailySummary.cash_outflows ?? 0)}
                      </li>
                    )}
                    <li>
                      Ventas débito:{" "}
                      <strong>
                        {formatCurrency(dailySummary.debit_card_sales)}
                      </strong>
                    </li>
                    <li>
                      Ventas crédito:{" "}
                      <strong>
                        {formatCurrency(dailySummary.credit_card_sales)}
                      </strong>
                    </li>
                    <li className="break-words">
                      Ventas transferencia:{" "}
                      <strong>
                        {formatCurrency(dailySummary.transfer_sales || 0)}
                      </strong>{" "}
                      (NO se cuenta en efectivo físico)
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Movements Detail */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                      Detalle de Movimientos
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={movementTypeFilter}
                        onValueChange={setMovementTypeFilter}
                      >
                        <SelectTrigger className="w-full sm:w-36 min-h-[44px] sm:min-h-0 text-sm">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los tipos</SelectItem>
                          <SelectItem value="sale">Venta</SelectItem>
                          <SelectItem value="partial_payment">
                            Pago Saldo
                          </SelectItem>
                          <SelectItem value="credit_note">
                            Nota de Crédito
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={movementFilter}
                        onValueChange={setMovementFilter}
                      >
                        <SelectTrigger className="w-full sm:w-36 min-h-[44px] sm:min-h-0 text-sm">
                          <SelectValue placeholder="Método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los métodos</SelectItem>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="debit">Débito</SelectItem>
                          <SelectItem value="credit">Crédito</SelectItem>
                          <SelectItem value="transfer">
                            Transferencia
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  {loadingMovements ? (
                    <div className="text-center py-6 sm:py-8">
                      <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-epoch-primary mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-admin-text-tertiary">
                        Cargando movimientos...
                      </p>
                    </div>
                  ) : movements.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-admin-text-tertiary text-xs sm:text-sm">
                      <p>No hay movimientos registrados en esta sesión</p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-xs sm:text-sm text-admin-text-tertiary">
                        Total de movimientos:{" "}
                        <strong>{movements.length}</strong> | Total:{" "}
                        <strong>
                          {formatCurrency(
                            movements.reduce((sum, m) => sum + m.amount, 0),
                          )}
                        </strong>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table className="min-w-[520px]">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[70px] sm:w-[100px] text-xs sm:text-sm whitespace-nowrap">
                                  Hora
                                </TableHead>
                                <TableHead className="w-[80px] sm:w-[100px] text-xs sm:text-sm whitespace-nowrap">
                                  Tipo
                                </TableHead>
                                <TableHead className="w-[90px] sm:w-[120px] text-xs sm:text-sm whitespace-nowrap">
                                  Orden
                                </TableHead>
                                <TableHead className="min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm whitespace-nowrap">
                                  Cliente
                                </TableHead>
                                <TableHead className="w-[80px] sm:w-[100px] text-xs sm:text-sm whitespace-nowrap">
                                  Método
                                </TableHead>
                                <TableHead className="w-[90px] sm:w-[120px] text-xs sm:text-sm text-right whitespace-nowrap">
                                  Monto
                                </TableHead>
                                <TableHead className="w-[80px] sm:w-[100px] text-xs sm:text-sm whitespace-nowrap">
                                  Estado
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {movements
                                .filter((m) => {
                                  if (
                                    movementTypeFilter !== "all" &&
                                    m.movement_type !== movementTypeFilter
                                  )
                                    return false;
                                  if (movementFilter === "all") return true;
                                  return (
                                    m.payment_method_code === movementFilter
                                  );
                                })
                                .map((movement) => (
                                  <TableRow key={movement.id}>
                                    <TableCell className="text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">
                                      {new Date(
                                        movement.paid_at,
                                      ).toLocaleTimeString("es-CL", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap py-2 sm:py-3">
                                      <Badge
                                        variant={
                                          movement.movement_type === "sale"
                                            ? "default"
                                            : movement.movement_type ===
                                                "credit_note"
                                              ? "destructive"
                                              : "secondary"
                                        }
                                      >
                                        {movement.movement_type === "sale"
                                          ? "Venta"
                                          : movement.movement_type ===
                                              "credit_note"
                                            ? "Nota de Crédito"
                                            : "Pago Saldo"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">
                                      {movement.order_number}
                                    </TableCell>
                                    <TableCell className="min-w-[100px] sm:min-w-[140px] py-2 sm:py-3">
                                      <div className="text-xs sm:text-sm">
                                        <div className="truncate max-w-[80px] sm:max-w-none">
                                          {movement.customer_name}
                                        </div>
                                        {movement.customer_rut && (
                                          <div className="text-[10px] sm:text-xs text-admin-text-tertiary font-mono truncate max-w-[80px] sm:max-w-none">
                                            {movement.customer_rut}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap py-2 sm:py-3">
                                      <Badge
                                        className="text-[10px] sm:text-xs"
                                        variant="outline"
                                      >
                                        {movement.payment_method}
                                      </Badge>
                                    </TableCell>
                                    <TableCell
                                      className={`text-right font-semibold whitespace-nowrap text-xs sm:text-sm py-2 sm:py-3 ${
                                        movement.amount < 0
                                          ? "text-red-600"
                                          : ""
                                      }`}
                                    >
                                      {formatCurrency(movement.amount)}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap py-2 sm:py-3">
                                      <Badge
                                        className="text-[10px] sm:text-xs"
                                        variant={
                                          movement.payment_status === "Completo"
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {movement.payment_status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      {movements.filter((m) => {
                        if (
                          movementTypeFilter !== "all" &&
                          m.movement_type !== movementTypeFilter
                        )
                          return false;
                        if (movementFilter === "all") return true;
                        return m.payment_method_code === movementFilter;
                      }).length === 0 &&
                        (movementFilter !== "all" ||
                          movementTypeFilter !== "all") && (
                          <div className="text-center py-4 text-admin-text-tertiary text-xs sm:text-sm">
                            No hay movimientos con el filtro seleccionado
                          </div>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cash Reconciliation - responsive form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs sm:text-sm">
                    Monto Inicial de Caja
                  </Label>
                  <Input
                    className="h-11 sm:h-12 text-sm sm:text-base mt-1"
                    placeholder="0"
                    type="number"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs sm:text-sm">
                    Efectivo Físico Contado *
                  </Label>
                  <Input
                    required
                    className="h-11 sm:h-12 text-sm sm:text-base mt-1"
                    placeholder="Monto contado físicamente"
                    type="number"
                    value={actualCash ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setActualCash(value === "" ? null : Number(value));
                    }}
                  />
                  <p className="text-[10px] sm:text-xs text-admin-text-tertiary mt-1 break-words">
                    Efectivo esperado:{" "}
                    {formatCurrency(dailySummary.expected_cash || 0)} (Inicial{" "}
                    {formatCurrency(dailySummary.opening_cash_amount || 0)} +
                    efectivo {formatCurrency(dailySummary.cash_sales || 0)})
                  </p>
                  {actualCash !== null &&
                    actualCash !== undefined &&
                    cashDifference !== null && (
                      <p
                        className={`text-xs sm:text-sm mt-1 font-semibold ${cashDifference > 0 ? "text-green-600" : cashDifference < 0 ? "text-red-600" : "text-muted-foreground"}`}
                      >
                        Diferencia: {cashDifference > 0 ? "+" : ""}
                        {formatCurrency(cashDifference)}
                      </p>
                    )}
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">
                    Total Máquina Débito
                  </Label>
                  <Input
                    className="h-11 sm:h-12 text-sm sm:text-base mt-1"
                    placeholder="0"
                    type="number"
                    value={cardMachineDebit}
                    onChange={(e) =>
                      setCardMachineDebit(Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">
                    Total Máquina Crédito
                  </Label>
                  <Input
                    className="h-11 sm:h-12 text-sm sm:text-base mt-1"
                    placeholder="0"
                    type="number"
                    value={cardMachineCredit}
                    onChange={(e) =>
                      setCardMachineCredit(Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">
                    Total Transferencias
                  </Label>
                  <Input
                    className="h-11 sm:h-12 text-sm sm:text-base mt-1"
                    placeholder="0"
                    type="number"
                    value={transferTotal}
                    onChange={(e) => setTransferTotal(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Notas</Label>
                  <Input
                    className="h-11 sm:h-12 text-sm sm:text-base mt-1"
                    placeholder="Notas adicionales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Discrepancias</Label>
                  <Input
                    className="h-11 sm:h-12 text-sm sm:text-base mt-1"
                    placeholder="Describa discrepancia..."
                    value={discrepancies}
                    onChange={(e) => setDiscrepancies(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-admin-text-tertiary mx-auto mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                No hay datos disponibles para cerrar la caja
              </p>
            </div>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto order-2 sm:order-1">
              {isOperativoMode && fieldOperationIdFromUrl && (
                <Link
                  className="inline-flex"
                  href={`/admin/field-operations/${fieldOperationIdFromUrl}`}
                >
                  <Button
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                    variant="outline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al operativo
                  </Button>
                </Link>
              )}
              <Button
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                variant="outline"
                onClick={() => setShowCloseDialog(false)}
              >
                Cancelar
              </Button>
            </div>
            <Button
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 order-1 sm:order-2"
              disabled={closing || !dailySummary}
              onClick={handleCloseCashRegister}
            >
              {closing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cerrando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Cerrar Caja
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Action Dialog (Cancel/Delete) */}
      <Dialog
        open={orderActionDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOrderActionDialog(null);
            setSelectedOrderForAction(null);
            setOrderActionReason("");
            setRefundMethod("cash");
          }
        }}
      >
        <DialogContent
          aria-describedby={orderActionDialog ? "order-action-desc" : undefined}
        >
          <DialogHeader>
            <DialogTitle>
              {orderActionDialog === "cancel"
                ? "Anular Venta"
                : "Eliminar Venta"}
            </DialogTitle>
            <DialogDescription id="order-action-desc">
              {orderActionDialog === "cancel"
                ? "Confirma la anulación de esta venta. Se creará una nota de crédito, se revertirá el stock y se actualizará la caja."
                : "Esta acción eliminará la venta permanentemente del sistema."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOrderForAction && (
              <>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <p>
                    <span className="font-semibold">Orden:</span>{" "}
                    {selectedOrderForAction.order_number}
                  </p>
                  <p>
                    <span className="font-semibold">Monto:</span>{" "}
                    {formatCurrency(selectedOrderForAction.total_amount)}
                  </p>
                  <p>
                    <span className="font-semibold">Cliente:</span>{" "}
                    {selectedOrderForAction.customer_email}
                  </p>
                </div>

                {orderActionDialog === "cancel" && (
                  <>
                    <p className="text-sm text-gray-600">
                      ¿Estás seguro de que deseas anular esta venta? Se creará
                      una nota de crédito, se revertirá el stock y se
                      actualizará la caja.
                    </p>
                    <div>
                      <Label>Razón de la anulación *</Label>
                      <Input
                        placeholder="Ej: Cliente solicitó cambio de producto"
                        value={orderActionReason}
                        onChange={(e) => setOrderActionReason(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Método de reembolso *</Label>
                      <Select
                        value={refundMethod}
                        onValueChange={setRefundMethod}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="debit">Débito</SelectItem>
                          <SelectItem value="credit">Crédito</SelectItem>
                          <SelectItem value="transfer">
                            Transferencia
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {orderActionDialog === "delete" && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg space-y-2">
                    <p className="text-sm font-semibold text-red-800">
                      ⚠️ Acción Irreversible
                    </p>
                    <p className="text-sm text-red-700">
                      ¿Estás seguro de que deseas ELIMINAR esta venta
                      permanentemente? Esta acción no se puede deshacer.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={processingOrderAction}
              variant="outline"
              onClick={() => {
                setOrderActionDialog(null);
                setSelectedOrderForAction(null);
                setOrderActionReason("");
                setRefundMethod("cash");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                processingOrderAction ||
                (orderActionDialog === "cancel" && !orderActionReason)
              }
              variant={
                orderActionDialog === "delete" ? "destructive" : "default"
              }
              onClick={() => {
                if (orderActionDialog === "cancel") {
                  handleCancelOrder(
                    selectedOrderForAction.id,
                    orderActionReason,
                    refundMethod,
                  );
                } else if (orderActionDialog === "delete") {
                  handleDeleteOrder(selectedOrderForAction.id);
                }
              }}
            >
              {processingOrderAction ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : orderActionDialog === "delete" ? (
                "Eliminar Permanentemente"
              ) : (
                "Anular Venta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
