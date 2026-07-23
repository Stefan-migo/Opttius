/**
 * usePOSPageActions — collates handlers and callbacks for POSPageContent.
 *
 * Extracted from POSPageContent.tsx to reduce component size.
 * Uses usePOS() internally for shared state; accepts local state params.
 */
"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { appLogger } from '@/lib/logger';

import type { POSProduct } from "../types";
import { usePOS } from "./usePOSProvider";

export interface UsePOSPageActionsParams {
  // Dialogs
  setShowPaymentDialog: (open: boolean) => void;
  setShowPendingBalanceDialog: (open: boolean) => void;
  setShowRefundDialog: (open: boolean) => void;

  // Processing
  setProcessingPayment: (v: boolean) => void;
  setLastProcessedOrder: (v: unknown) => void;
}

export interface UsePOSPageActionsReturn {
  handlePaymentShortcut: (method: string) => void;
  handleSearchShortcut: () => void;
  handleClearCartShortcut: () => void;
  handleCompleteSaleShortcut: () => void;
  handleCloseDialogs: () => void;
  handleProcessPayment: () => Promise<void>;
  handleLoadQuote: (quoteInput: string) => Promise<void>;
  handlePartialPaymentChange: (
    isPartial: boolean,
    amount?: number,
    total?: number,
  ) => void;
  handleProductKeyDown: (
    e: React.KeyboardEvent,
    productResults: POSProduct[],
    selectedProductIndex: number,
    addToCart: (product: POSProduct) => void,
    clearProductSearch: () => void,
    setSelectedProductIndex: (i: number) => void,
  ) => void;
}

export function usePOSPageActions({
  setShowPaymentDialog,
  setShowPendingBalanceDialog,
  setShowRefundDialog,
  setProcessingPayment,
  setLastProcessedOrder,
}: UsePOSPageActionsParams): UsePOSPageActionsReturn {
  void setLastProcessedOrder; // ponytail: kept for API compatibility, used in handleProcessPayment
  const {
    branchId,
    cart,
    customer,
    customerBusinessName,
    setCustomerBusinessName,
    customerRUT,
    setCustomerRUT,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    setCustomer,
    addToCart,
    clearCart,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    paymentTotals,
    resetPayment,
    isPaymentSufficient,
  } = usePOS();

  const handlePaymentShortcut = useCallback(
    (method: string) => {
      if (cart.length === 0) {
        toast.warning("Agregue productos al carrito primero");
        return;
      }
      setPaymentMethod(method as typeof paymentMethod);
      setShowPaymentDialog(true);
    },
    [cart.length, setPaymentMethod, setShowPaymentDialog],
  );

  const handleSearchShortcut = useCallback(() => {
    // Focus handled by ref forwarding — this signals the intent
  }, []);

  const handleClearCartShortcut = useCallback(() => {
    if (cart.length === 0) return;
    clearCart();
    toast.info("Carrito limpiado");
  }, [cart.length, clearCart]);

  const handleCompleteSaleShortcut = useCallback(() => {
    if (cart.length === 0) return;
    setShowPaymentDialog(true);
  }, [cart.length, setShowPaymentDialog]);

  const handleCloseDialogs = useCallback(() => {
    setShowPaymentDialog(false);
    setShowPendingBalanceDialog(false);
    setShowRefundDialog(false);
  }, [setShowPaymentDialog, setShowPendingBalanceDialog, setShowRefundDialog]);

  const handleProcessPayment = useCallback(async () => {
    if (!branchId) {
      toast.error("Seleccione una sucursal");
      return;
    }
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    setProcessingPayment(true);

    try {
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const saleData = {
        customer_id: customer?.id,
        customer_name: customerBusinessName || customer?.name,
        customer_rut: customerRUT || customer?.rut,
        customer_email: customer?.email,
        customer_phone: customer?.phone,
        items: cart.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        payment_method: paymentMethod,
        cash_received: cashReceived,
        subtotal: paymentTotals.subtotal,
        discount_amount: 0,
        tax_amount: paymentTotals.taxAmount,
        total: paymentTotals.total,
        branch_id: branchId,
        idempotency_key: idempotencyKey,
      };

      appLogger.info("Processing sale:", saleData);

      // ponytail: mock implementation, replace with real API call when backend ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setLastProcessedOrder({
        ...saleData,
        order_number: `ORD-${Date.now()}`,
      });
      toast.success("Venta procesada correctamente");

      clearCart();
      setCustomer(null);
      resetPayment();
      setShowPaymentDialog(false);
    } catch (error) {
      appLogger.error("Payment error:", error);
      toast.error("Error al procesar el pago");
    } finally {
      setProcessingPayment(false);
    }
  }, [
    branchId,
    cart,
    customer,
    customerBusinessName,
    customerRUT,
    paymentMethod,
    cashReceived,
    paymentTotals,
    clearCart,
    setCustomer,
    resetPayment,
    setShowPaymentDialog,
    setProcessingPayment,
    setLastProcessedOrder,
  ]);

  const handleLoadQuote = useCallback(
    async (quoteInput: string) => {
      if (!branchId) {
        toast.error("Seleccione una sucursal");
        return;
      }

      try {
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            quoteInput,
          );
        const endpoint = isUUID
          ? `/api/admin/quotes/${quoteInput}/load-to-pos`
          : `/api/admin/quotes?quote_number=${encodeURIComponent(quoteInput)}`;

        const response = await fetch(endpoint, { method: "POST" });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Presupuesto no encontrado");
        }

        const data = await response.json();

        if (data.success && data.data?.items) {
          data.data.items.forEach(
            (item: {
              product_id: string;
              product_name: string;
              quantity: number;
              unit_price: number;
            }) => {
              addToCart({
                id: item.product_id,
                name: item.product_name,
                price: item.unit_price,
              } as POSProduct);
            },
          );

          if (data.data.customer) {
            setCustomer(data.data.customer);
            if (data.data.customer.rut) setCustomerRUT(data.data.customer.rut);
            if (data.data.customer.business_name)
              setCustomerBusinessName(data.data.customer.business_name);
          }

          toast.success("Presupuesto cargado al carrito");
        }
      } catch (error) {
        appLogger.error("Quote load error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al cargar presupuesto",
        );
      }
    },
    [branchId, addToCart, setCustomer, setCustomerRUT, setCustomerBusinessName],
  );

  const handlePartialPaymentChange = useCallback(
    (isPartial: boolean, amount?: number, total?: number) => {
      if (isPartial && amount !== undefined) {
        // use provided amount
      } else if (isPartial && total) {
        // Default to 30% minimum
        // ponytail: per-org min-deposit config when needed
      }
    },
    [],
  );

  const handleProductKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      productResults: POSProduct[],
      selectedProductIndex: number,
      addToCartFn: (product: POSProduct) => void,
      clearProductSearchFn: () => void,
      setSelectedProductIndexFn: (i: number) => void,
    ) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedProductIndex >= 0 && productResults[selectedProductIndex]) {
          addToCartFn(productResults[selectedProductIndex]);
        } else if (productResults.length > 0) {
          addToCartFn(productResults[0]);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedProductIndexFn(
          selectedProductIndex < productResults.length - 1
            ? selectedProductIndex + 1
            : selectedProductIndex,
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedProductIndexFn(
          selectedProductIndex > 0 ? selectedProductIndex - 1 : -1,
        );
        return;
      }

      if (e.key === "Escape") {
        clearProductSearchFn();
        setSelectedProductIndexFn(-1);
      }
    },
    [],
  );

  return {
    handlePaymentShortcut,
    handleSearchShortcut,
    handleClearCartShortcut,
    handleCompleteSaleShortcut,
    handleCloseDialogs,
    handleProcessPayment,
    handleLoadQuote,
    handlePartialPaymentChange,
    handleProductKeyDown,
  };
}
