/**
 * POSPageContent — orchestrator for the POS page.
 *
 * Composition: header + content panel (left) + cart panel (right) + dialogs.
 * State managed via usePOS() provider and local UI state.
 */
"use client";

import { useSearchParams } from "next/navigation";
import { useCallback,useEffect, useRef, useState } from "react";

import type { SaleMode } from "./components";
import { POSCartPanel } from "./components/POSCartPanel";
import { POSContentPanel } from "./components/POSContentPanel";
import { POSHeader } from "./components/POSHeader";
import { POSPaymentDialog } from "./components/POSPaymentDialog";
import { POSPendingBalanceDialog } from "./components/POSPendingBalanceDialog";
import { POSRefundDialog } from "./components/POSRefundDialog";
import type { DiscountType } from "./hooks";
import { usePOS, usePOSKeyboardShortcuts } from "./hooks";
import { usePOSPageActions } from "./hooks/usePOSPageActions";

export function POSPageContent() {
  const searchParams = useSearchParams();
  const {
    branchId,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    customer,
    setCustomer,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    paymentTotals,
    isPaymentSufficient,
    handleQuickCash,
    resetPayment,
    isCashOpen,
    isCashChecking,
    customerBusinessName,
    customerRUT,
  } = usePOS();

  // UI state
  const [saleMode, setSaleMode] = useState<SaleMode>("quick");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPendingBalanceDialog, setShowPendingBalanceDialog] =
    useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialAmount, setPartialAmount] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastProcessedOrder, setLastProcessedOrder] = useState<unknown>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  // Discount state
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Extract handlers to hook
  const {
    handlePaymentShortcut,
    handleSearchShortcut,
    handleClearCartShortcut,
    handleCompleteSaleShortcut,
    handleCloseDialogs,
    handleProcessPayment,
    handleLoadQuote,
    handlePartialPaymentChange,
    handleProductKeyDown,
  } = usePOSPageActions({
    setShowPaymentDialog,
    setShowPendingBalanceDialog,
    setShowRefundDialog,
    setProcessingPayment,
    setLastProcessedOrder,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  usePOSKeyboardShortcuts({
    onCashPayment: () => handlePaymentShortcut("cash"),
    onCardPayment: () => handlePaymentShortcut("debit_card"),
    onTransferPayment: () => handlePaymentShortcut("transfer"),
    onOtherPayment: () => handlePaymentShortcut("other"),
    onOpenSearch: () => searchInputRef.current?.focus(),
    onClearCart: handleClearCartShortcut,
    onOpenPaymentDialog: handleCompleteSaleShortcut,
    onCloseDialog: handleCloseDialogs,
    productInputRef: searchInputRef,
    isPaymentDialogOpen: showPaymentDialog,
  });

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Discount calculations
  const calculateDiscount = useCallback(
    (subtotalValue: number) => {
      if (discountValue <= 0 || subtotalValue <= 0) return 0;
      if (discountType === "percentage") {
        return Math.round((subtotalValue * Math.min(discountValue, 100)) / 100);
      }
      return Math.min(discountValue, subtotalValue);
    },
    [discountType, discountValue],
  );

  const handleDiscountValueChange = useCallback(
    (value: number) => {
      setDiscountValue(value);
      setDiscountAmount(calculateDiscount(subtotal));
    },
    [calculateDiscount],
  );

  const handleClearDiscount = useCallback(() => {
    setDiscountValue(0);
    setDiscountAmount(0);
  }, []);

  // Derived totals
  const subtotalBeforeDiscount = paymentTotals.subtotal;
  const calculatedDiscountAmount = calculateDiscount(subtotalBeforeDiscount);
  const subtotal = Math.max(0, subtotalBeforeDiscount - calculatedDiscountAmount);
  const taxAmount = paymentTotals.taxAmount;
  const total = subtotal + taxAmount;
  const change = Math.max(0, cashReceived - total);

  return (
    <div className="flex flex-col h-screen bg-background">
      <POSHeader
        cartLength={cart.length}
        checkingCashStatus={isCashChecking}
        isCashOpen={isCashOpen}
        total={total}
        onClearCart={clearCart}
        onOpenPendingBalance={() => setShowPendingBalanceDialog(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — customer + toggle + product/advanced content */}
        <div className="w-2/3 flex flex-col overflow-hidden">
          <POSContentPanel
            saleMode={saleMode}
            selectedProductIndex={selectedProductIndex}
            setSelectedProductIndex={setSelectedProductIndex}
            onLoadQuote={handleLoadQuote}
            onProductKeyDown={handleProductKeyDown}
            onSaleModeChange={setSaleMode}
          />
        </div>

        {/* Right panel — cart + payment */}
        <POSCartPanel
          cart={cart}
          cashReceived={cashReceived}
          change={change}
          discountAmount={calculatedDiscountAmount}
          discountType={discountType}
          discountValue={discountValue}
          paymentMethod={paymentMethod}
          subtotal={subtotal}
          taxAmount={taxAmount}
          total={total}
          onCashReceivedChange={setCashReceived}
          onClearCart={clearCart}
          onClearDiscount={handleClearDiscount}
          onDiscountTypeChange={(t) => {
            setDiscountType(t);
            setDiscountAmount(calculateDiscount(subtotalBeforeDiscount));
          }}
          onDiscountValueChange={handleDiscountValueChange}
          onOpenPaymentDialog={() => setShowPaymentDialog(true)}
          onPaymentMethodChange={(v) =>
            setPaymentMethod(v as Parameters<typeof setPaymentMethod>[0])
          }
          onQuickCash={handleQuickCash}
          onRemoveFromCart={removeFromCart}
          onUpdateQuantity={updateCartQuantity}
        />
      </div>

      {/* Dialogs */}
      <POSPaymentDialog
        canProcess={cart.length > 0 && isPaymentSufficient}
        cashReceived={cashReceived}
        customer={customer}
        customerBusinessName={customerBusinessName}
        customerRUT={customerRUT}
        isCashOpen={isCashOpen ?? false}
        isPartialPayment={isPartialPayment}
        isProcessing={processingPayment}
        items={cart}
        open={showPaymentDialog}
        partialAmount={partialAmount}
        paymentMethod={paymentMethod}
        subtotal={subtotal}
        taxAmount={taxAmount}
        total={total}
        onCashReceivedChange={setCashReceived}
        onConfirm={handleProcessPayment}
        onOpenChange={setShowPaymentDialog}
        onPartialPaymentChange={(isPartial, amount) =>
          handlePartialPaymentChange(isPartial, amount, total)
        }
        onPaymentMethodChange={setPaymentMethod}
      />

      <POSPendingBalanceDialog
        allOrders={[]}
        loading={false}
        open={showPendingBalanceDialog}
        orders={[]}
        pendingFiscalReference=""
        pendingPaymentAmount=""
        pendingPaymentMethod="cash"
        processingPayment={false}
        searchTerm=""
        selectedOrder={null}
        onFetchOrders={async () => {}}
        onFilterSearch={() => {}}
        onFiscalReferenceChange={() => {}}
        onOpenChange={setShowPendingBalanceDialog}
        onPaymentAmountChange={() => {}}
        onPaymentMethodChange={() => {}}
        onProcessPayment={async () => {}}
        onRefundClick={() => {}}
        onSelectOrder={() => {}}
      />

      <POSRefundDialog
        branchId={branchId || ""}
        open={showRefundDialog}
        orderId=""
        orderNumber=""
        onOpenChange={setShowRefundDialog}
        onSuccess={async () => {}}
      />
    </div>
  );
}
