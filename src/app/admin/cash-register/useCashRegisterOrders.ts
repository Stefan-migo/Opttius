/**
 * useCashRegisterOrders — orders and closures listing with actions.
 *
 * Extracted from useCashRegister.ts. Pure extraction — no behavioral changes.
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PAYMENT_METHOD_FILTER_MAP } from "./cashPaymentUtils";
import { buildOrderParams, buildClosureParams, getTodayChileDate } from "./cashOpsUtils";
import { extractDataFromResponse, extractTotalFromResponse } from "@/lib/api/response-helpers";
import type { CashClosure } from "./cashRegister.types";

export function useCashRegisterOrders(
  effectiveHeaders: Record<string, string>,
  fieldOperationIdFromUrl?: string | null,
) {
  // Closures
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [closuresCurrentPage, setClosuresCurrentPage] = useState(1);
  const [closuresItemsPerPage, setClosuresItemsPerPage] = useState(20);
  const [closuresTotalCount, setClosuresTotalCount] = useState(0);

  // Orders
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
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<unknown>(null);
  const [orderActionDialog, setOrderActionDialog] = useState<"cancel" | "delete" | null>(null);
  const [orderActionReason, setOrderActionReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [processingOrderAction, setProcessingOrderAction] = useState(false);
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const [ordersItemsPerPage, setOrdersItemsPerPage] = useState(20);
  const [ordersTotalCount, setOrdersTotalCount] = useState(0);
  const [orderFiltersExpanded, setOrderFiltersExpanded] = useState(false);

  // Fetch closures
  const fetchClosures = async (page: number, perPage: number) => {
    setLoading(true);
    try {
      const params = buildClosureParams(page, perPage, fieldOperationIdFromUrl ?? undefined);
      const response = await fetch(`/api/admin/cash-register/closures?${params}`, {
        headers: effectiveHeaders as HeadersInit,
      });
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

  // Fetch orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const params = buildOrderParams(orderFilters, ordersCurrentPage, ordersItemsPerPage);
      const response = await fetch(`/api/admin/orders?${params}`, {
        headers: effectiveHeaders as HeadersInit,
      });

      if (response.ok) {
        const data = await response.json();
        let filteredOrders = extractDataFromResponse(data) as Record<string, unknown>[];

        // Apply search filter (client-side)
        if (orderSearchTerm) {
          const term = orderSearchTerm.toLowerCase();
          filteredOrders = filteredOrders.filter(
            (order) =>
              ((order.order_number as string) || "").toLowerCase().includes(term) ||
              ((order.customer_email as string) || "").toLowerCase().includes(term) ||
              ((order.customer_name as string) || "").toLowerCase().includes(term) ||
              ((order.sii_business_name as string) || "").toLowerCase().includes(term),
          );
        }

        // Filter by payment method
        if (orderFilters.payment_method !== "all") {
          const allowed = PAYMENT_METHOD_FILTER_MAP[orderFilters.payment_method] || [];
          filteredOrders = filteredOrders.filter((order) => {
            const payments = (order.order_payments || []) as Array<Record<string, unknown>>;
            const hasMatch = payments.some((p) =>
              allowed.includes(((p as Record<string, unknown>).payment_method as string || "").toLowerCase()),
            );
            if (hasMatch) return true;
            const mp = ((order.mp_payment_method as string) || "").toLowerCase();
            return allowed.some((a: string) => mp.includes(a.replace("_", "")));
          });
        }

        // Filter by product name
        if (orderProductFilter.trim()) {
          const term = orderProductFilter.trim().toLowerCase();
          filteredOrders = filteredOrders.filter((order) => {
            const items = (order.order_items || []) as Array<Record<string, unknown>>;
            return items.some(
              (item) =>
                ((item as Record<string, unknown>).product_name as string || "").toLowerCase().includes(term) ||
                ((item as Record<string, unknown>).variant_title as string || "").toLowerCase().includes(term),
            );
          });
        }

        setOrders(filteredOrders);
        setOrdersTotalCount(extractTotalFromResponse(data) || filteredOrders.length);
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

  const handleCancelOrder = async (
    orderId: string,
    reason: string,
    method: string,
    onSuccess?: () => void,
  ) => {
    setProcessingOrderAction(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...effectiveHeaders } as HeadersInit,
        body: JSON.stringify({ reason, refund_method: method }),
      });

      if (response.ok) {
        toast.success("Venta anulada correctamente");
        setOrderActionDialog(null);
        setSelectedOrderForAction(null);
        setOrderActionReason("");
        setRefundMethod("cash");
        await fetchOrders();
        if (onSuccess) onSuccess();
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
      const response = await fetch(`/api/admin/orders/${orderId}/delete`, {
        method: "DELETE",
        headers: effectiveHeaders as HeadersInit,
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

  return {
    closures,
    setClosures,
    loading,
    setLoading,
    closuresCurrentPage,
    setClosuresCurrentPage,
    closuresItemsPerPage,
    setClosuresItemsPerPage,
    closuresTotalCount,
    setClosuresTotalCount,
    orders,
    setOrders,
    loadingOrders,
    setLoadingOrders,
    ordersTab,
    setOrdersTab,
    orderFilters,
    setOrderFilters,
    orderSearchTerm,
    setOrderSearchTerm,
    orderProductFilter,
    setOrderProductFilter,
    selectedOrderForAction,
    setSelectedOrderForAction,
    orderActionDialog,
    setOrderActionDialog,
    orderActionReason,
    setOrderActionReason,
    refundMethod,
    setRefundMethod,
    processingOrderAction,
    setProcessingOrderAction,
    ordersCurrentPage,
    setOrdersCurrentPage,
    ordersItemsPerPage,
    setOrdersItemsPerPage,
    ordersTotalCount,
    setOrdersTotalCount,
    orderFiltersExpanded,
    setOrderFiltersExpanded,
    fetchClosures,
    fetchOrders,
    handleCancelOrder,
    handleDeleteOrder,
  };
}
