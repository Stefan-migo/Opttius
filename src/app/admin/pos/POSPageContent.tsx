/**
 * POSPageContent - Main POS page content component
 * This component uses the POSProvider context via usePOS() hook
 *
 * Migration strategy:
 * 1. Uses usePOS() hook for all state management
 * 2. Integrates existing modular components
 * 3. Handles keyboard shortcuts
 * 4. Renders all dialogs
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { POSCustomerSearch } from "./components/POSCustomerSearch";
import { POSProductSearch } from "./components/POSProductSearch";
import { POSCart } from "./components/POSCart";
import { POSHeader } from "./components/POSHeader";
import { POSPaymentDialog } from "./components/POSPaymentDialog";
import { POSPendingBalanceDialog } from "./components/POSPendingBalanceDialog";
import { POSRefundDialog } from "./components/POSRefundDialog";
import { POSSaleToggle } from "./components/POSSaleToggle";
import { POSAdvancedSale } from "./components/POSAdvancedSale";
import { POMPaymentSection } from "./components/POMPaymentSection";
import { useBranch } from "@/hooks/useBranch";

import { usePOS, usePOSKeyboardShortcuts } from "./hooks";
import type { SaleMode } from "./components";
import type { POSProduct } from "./types";

export function POSPageContent() {
  const searchParams = useSearchParams();
  const {
    // Branch
    branchId,
    isSuperAdmin,

    // Cart
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,

    // Customer
    customer,
    setCustomer,
    customerSearchTerm,
    setCustomerSearchTerm,
    customerResults,
    customerLoading,
    customerBusinessName,
    setCustomerBusinessName,
    customerRUT,
    setCustomerRUT,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    clearCustomer,

    // Products
    productSearchTerm,
    setProductSearchTerm,
    productResults,
    productLoading,
    handleSelectProduct,
    clearProductSearch,

    // Payment
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    paymentTotals,
    isPaymentSufficient,
    handleQuickCash,
    resetPayment,

    // Cash register
    isCashOpen,
    isCashChecking,
    refreshCashStatus,

    // Quotes
    quotes,
    selectedQuote,
    loadingQuotes,
    handleSelectQuote,
    clearQuote,
    refreshQuotes,
  } = usePOS();

  // Discount state
  const [discountType, setDiscountType] = useState<"percentage" | "amount">(
    "percentage",
  );
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Calculate discount and adjusted totals
  const calculateDiscount = useCallback(
    (subtotalValue: number) => {
      if (discountValue <= 0 || subtotalValue <= 0) return 0;
      if (discountType === "percentage") {
        const pct = Math.min(discountValue, 100);
        return Math.round((subtotalValue * pct) / 100);
      }
      return Math.min(discountValue, subtotalValue);
    },
    [discountType, discountValue],
  );

  const handleDiscountValueChange = (value: number) => {
    setDiscountValue(value);
    setDiscountAmount(calculateDiscount(subtotal));
  };

  const handleClearDiscount = () => {
    setDiscountValue(0);
    setDiscountAmount(0);
  };

  // Additional local state not in provider yet
  const [saleMode, setSaleMode] = useState<SaleMode>("quick");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPendingBalanceDialog, setShowPendingBalanceDialog] =
    useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialAmount, setPartialAmount] = useState(0);

  // Refs for keyboard navigation
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const customerSuggestionsRef = useRef<HTMLDivElement>(null);

  // Additional refs
  const idempotencyKeyRef = useRef<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastProcessedOrder, setLastProcessedOrder] = useState<unknown>(null);

  // Get branch info
  const { branches } = useBranch();

  // Keyboard shortcuts
  const handlePaymentShortcut = useCallback(
    (method: string) => {
      if (cart.length === 0) {
        toast.warning("Agregue productos al carrito primero");
        return;
      }
      setPaymentMethod(method as typeof paymentMethod);
      setShowPaymentDialog(true);
    },
    [cart.length, setPaymentMethod],
  );

  const handleSearchShortcut = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleClearCartShortcut = useCallback(() => {
    if (cart.length === 0) return;
    clearCart();
    toast.info("Carrito limpiado");
  }, [cart.length, clearCart]);

  const handleCompleteSaleShortcut = useCallback(() => {
    if (cart.length === 0) return;
    setShowPaymentDialog(true);
  }, [cart.length]);

  // Register keyboard shortcuts
  usePOSKeyboardShortcuts({
    onCashPayment: () => handlePaymentShortcut("cash"),
    onCardPayment: () => handlePaymentShortcut("debit_card"),
    onTransferPayment: () => handlePaymentShortcut("transfer"),
    onOtherPayment: () => handlePaymentShortcut("other"),
    onOpenSearch: handleSearchShortcut,
    onClearCart: handleClearCartShortcut,
    onOpenPaymentDialog: handleCompleteSaleShortcut,
    onCloseDialog: () => {
      setShowPaymentDialog(false);
      setShowPendingBalanceDialog(false);
      setShowRefundDialog(false);
    },
    productInputRef: searchInputRef,
    customerInputRef: customerSearchInputRef,
    isPaymentDialogOpen: showPaymentDialog,
  });

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Product selection with keyboard
  const handleProductKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedProductIndex >= 0 && productResults[selectedProductIndex]) {
        addToCart(productResults[selectedProductIndex]);
      } else if (productResults.length > 0) {
        addToCart(productResults[0]);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedProductIndex((prev) =>
        prev < productResults.length - 1 ? prev + 1 : prev,
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedProductIndex((prev) => (prev > 0 ? prev - 1 : -1));
      return;
    }

    if (e.key === "Escape") {
      clearProductSearch();
      setSelectedProductIndex(-1);
      searchInputRef.current?.blur();
    }
  };

  // Customer keyboard navigation
  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Handle customer selection
    }
    // Add similar navigation as products
  };

  // Process payment handler
  const handleProcessPayment = async () => {
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
      // Generate idempotency key
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      idempotencyKeyRef.current = idempotencyKey;

      // Prepare sale data
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

      // Call API (placeholder - needs implementation)
      console.log("Processing sale:", saleData);

      // Simulate success for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setLastProcessedOrder({ ...saleData, order_number: `ORD-${Date.now()}` });
      toast.success("Venta procesada correctamente");

      // Reset after successful sale
      clearCart();
      setCustomer(null);
      resetPayment();
      setShowPaymentDialog(false);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Error al procesar el pago");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Calculate totals with discount
  const subtotalBeforeDiscount = paymentTotals.subtotal;
  const calculatedDiscountAmount = calculateDiscount(subtotalBeforeDiscount);
  const subtotal = Math.max(
    0,
    subtotalBeforeDiscount - calculatedDiscountAmount,
  );
  const taxAmount = paymentTotals.taxAmount;
  const total = subtotal + taxAmount;
  const change = Math.max(0, cashReceived - total);

  // Handle partial payment change
  const handlePartialPaymentChange = useCallback(
    (isPartial: boolean, amount?: number) => {
      setIsPartialPayment(isPartial);
      if (isPartial && amount !== undefined) {
        setPartialAmount(amount);
      } else if (isPartial && !amount) {
        // Default to 30% minimum
        setPartialAmount(Math.round((total * 0.3) / 100) * 100);
      }
    },
    [total],
  );

  // Handle quote loading
  const handleLoadQuote = useCallback(
    async (quoteInput: string) => {
      if (!branchId) {
        toast.error("Seleccione una sucursal");
        return;
      }

      try {
        // Try to parse as UUID or use as quote number
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
          // Add items to cart
          data.data.items.forEach(
            (item: {
              product_id: string;
              product_name: string;
              quantity: number;
              unit_price: number;
            }) => {
              // Create a minimal product object for the cart
              addToCart({
                id: item.product_id,
                name: item.product_name,
                price: item.unit_price,
              } as POSProduct);
            },
          );

          // If customer info is in the quote, set it
          if (data.data.customer) {
            setCustomer(data.data.customer);
            if (data.data.customer.rut) {
              setCustomerRUT(data.data.customer.rut);
            }
            if (data.data.customer.business_name) {
              setCustomerBusinessName(data.data.customer.business_name);
            }
          }

          toast.success("Presupuesto cargado al carrito");
        }
      } catch (error) {
        console.error("Quote load error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al cargar presupuesto",
        );
      }
    },
    [branchId, addToCart, setCustomer, setCustomerRUT, setCustomerBusinessName],
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with branch selector and status */}
      <POSHeader
        isCashOpen={isCashOpen}
        checkingCashStatus={isCashChecking}
        cartLength={cart.length}
        total={total}
        onOpenPendingBalance={() => setShowPendingBalanceDialog(true)}
        onClearCart={clearCart}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Customer, Sale Mode, and Products */}
        <div className="w-2/3 flex flex-col overflow-hidden">
          {/* Global Customer Section - outside both tabs */}
          <div className="p-4 border-b">
            <POSCustomerSearch
              searchTerm={customerSearchTerm}
              onSearchChange={setCustomerSearchTerm}
              results={customerResults}
              loading={customerLoading}
              selectedCustomer={customer}
              selectedIndex={-1}
              onSelectCustomer={(customer) => {
                console.log("[POS] Customer selected:", customer);
                setCustomer(customer);
                // Note: setCustomerSearchTerm is handled internally by handleSelectCustomer
                // in usePOSCustomer, which sets searchTerm to customer.name
                if (customer.rut) {
                  setCustomerRUT(customer.rut);
                }
                if (customer.business_name) {
                  setCustomerBusinessName(customer.business_name);
                }
              }}
              onClearCustomer={() => {
                clearCustomer();
                setCustomerRUT("");
                setCustomerBusinessName("");
                setCustomerEmail("");
                setCustomerPhone("");
              }}
              onKeyDown={handleCustomerKeyDown}
              customerBusinessName={customerBusinessName}
              onBusinessNameChange={setCustomerBusinessName}
              customerRUT={customerRUT}
              onRUTChange={setCustomerRUT}
              customerEmail={customerEmail}
              onCustomerEmailChange={setCustomerEmail}
              customerPhone={customerPhone}
              onCustomerPhoneChange={setCustomerPhone}
              inputRef={customerSearchInputRef}
              suggestionsRef={customerSuggestionsRef}
              quotes={quotes}
              loadingQuotes={loadingQuotes}
              selectedQuote={selectedQuote}
              onLoadQuote={handleLoadQuote}
              onSelectQuote={handleSelectQuote}
            />
          </div>

          {/* Sale Mode Toggle */}
          <div className="px-4 py-2 border-b">
            <POSSaleToggle mode={saleMode} onModeChange={setSaleMode} />
          </div>

          {/* Render based on sale mode */}
          {saleMode === "quick" ? (
            /* Quick Sale - Product Search Only */
            <div className="flex-1 p-4 overflow-y-auto">
              <POSProductSearch
                searchTerm={productSearchTerm}
                onSearchChange={setProductSearchTerm}
                products={productResults}
                loading={productLoading}
                selectedIndex={selectedProductIndex}
                onSelectProduct={(product) => {
                  handleSelectProduct(product);
                  setSelectedProductIndex(-1);
                }}
                onKeyDown={handleProductKeyDown}
                inputRef={searchInputRef}
                suggestionsRef={suggestionsRef}
              />
            </div>
          ) : (
            /* Advanced Sale - Venta Avanzada */
            <div className="flex-1 overflow-hidden">
              <POSAdvancedSale
                customer={
                  customer
                    ? {
                        id: customer.id,
                        name: customer.name || undefined,
                        first_name: customer.first_name || undefined,
                        last_name: customer.last_name || undefined,
                        email: customer.email || undefined,
                        rut: customer.rut || undefined,
                        business_name: customer.business_name || undefined,
                      }
                    : null
                }
                onCustomerChange={(c) => {
                  if (c) {
                    setCustomer({
                      id: c.id,
                      name: c.name ?? undefined,
                      first_name: c.first_name ?? undefined,
                      last_name: c.last_name ?? undefined,
                      email: c.email ?? undefined,
                      rut: c.rut ?? undefined,
                      business_name: c.business_name ?? undefined,
                      phone: null,
                    });
                    if (c.rut) {
                      setCustomerRUT(c.rut);
                    }
                    if (c.business_name) {
                      setCustomerBusinessName(c.business_name);
                    }
                  } else {
                    setCustomer(null);
                    setCustomerRUT("");
                    setCustomerBusinessName("");
                  }
                }}
                onAddToCart={(items) => {
                  items.forEach((item) => {
                    addToCart(item.product as POSProduct);
                  });
                }}
                branchId={branchId}
                quickCustomerName={customerBusinessName || null}
                quickCustomerRUT={customerRUT || null}
                quickCustomerEmail={customerEmail || null}
                quickCustomerPhone={customerPhone || null}
              />
            </div>
          )}
        </div>

        {/* Right Panel - Cart */}
        <div className="w-1/3 border-l flex flex-col bg-card">
          {/* Cart Items - POSCart handles title and totals internally */}
          <div className="flex-1 overflow-hidden">
            <POSCart
              items={cart}
              subtotal={subtotalBeforeDiscount}
              taxAmount={taxAmount}
              total={total}
              onUpdateQuantity={updateCartQuantity}
              onRemove={removeFromCart}
              onClear={clearCart}
              discountType={discountType}
              discountValue={discountValue}
              discountAmount={calculatedDiscountAmount}
              onDiscountTypeChange={(t) => {
                setDiscountType(t);
                setDiscountAmount(calculateDiscount(subtotalBeforeDiscount));
              }}
              onDiscountValueChange={handleDiscountValueChange}
              onClearDiscount={handleClearDiscount}
            />
          </div>

          <POMPaymentSection
            paymentMethod={paymentMethod}
            cashReceived={cashReceived}
            cartLength={cart.length}
            total={total}
            change={change}
            onPaymentMethodChange={(v) => setPaymentMethod(v as Parameters<typeof setPaymentMethod>[0])}
            onCashReceivedChange={setCashReceived}
            onQuickCash={handleQuickCash}
            onOpenPaymentDialog={() => setShowPaymentDialog(true)}
          />
        </div>
      </div>

      {/* Payment Dialog */}
      <POSPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        items={cart}
        subtotal={subtotal}
        taxAmount={taxAmount}
        total={total}
        customer={customer}
        customerBusinessName={customerBusinessName}
        customerRUT={customerRUT}
        paymentMethod={paymentMethod}
        cashReceived={cashReceived}
        onPaymentMethodChange={setPaymentMethod}
        onCashReceivedChange={setCashReceived}
        isPartialPayment={isPartialPayment}
        partialAmount={partialAmount}
        onPartialPaymentChange={handlePartialPaymentChange}
        onConfirm={handleProcessPayment}
        isCashOpen={isCashOpen ?? false}
        isProcessing={processingPayment}
        canProcess={cart.length > 0 && isPaymentSufficient}
      />

      {/* Pending Balance Dialog - Placeholder (needs integration with full component) */}
      <POSPendingBalanceDialog
        open={showPendingBalanceDialog}
        onOpenChange={setShowPendingBalanceDialog}
        orders={[]}
        allOrders={[]}
        loading={false}
        searchTerm=""
        selectedOrder={null}
        pendingPaymentAmount=""
        pendingPaymentMethod="cash"
        pendingFiscalReference=""
        processingPayment={false}
        onFetchOrders={async () => {}}
        onFilterSearch={() => {}}
        onSelectOrder={() => {}}
        onPaymentAmountChange={() => {}}
        onPaymentMethodChange={() => {}}
        onProcessPayment={async () => {}}
        onFiscalReferenceChange={() => {}}
        onRefundClick={() => {}}
      />

      {/* Refund Dialog - Placeholder (needs integration) */}
      <POSRefundDialog
        open={showRefundDialog}
        onOpenChange={setShowRefundDialog}
        branchId={branchId || ""}
        orderId=""
        orderNumber=""
        onSuccess={async () => {}}
      />
    </div>
  );
}
