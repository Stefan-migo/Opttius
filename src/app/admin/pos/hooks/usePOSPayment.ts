/**
 * usePOSPayment - Hook para gestión de pagos en el POS
 * Maneja métodos de pago, cálculos de vuelto, y pagos parciales
 */

import { useCallback, useMemo, useState } from "react";

import type { POSPaymentMethod, POSCartItem } from "../types";

interface UsePOSPaymentProps {
  cart?: POSCartItem[];
  onPaymentSubmit?: (paymentData: PaymentData) => void;
}

export interface PaymentData {
  method: POSPaymentMethod;
  cashReceived: number;
  change: number;
  depositAmount?: number;
  isPartial?: boolean;
  fiscalReference?: string;
  cardLastFour?: string;
  cardBrand?: string;
  transferReference?: string;
}

export function usePOSPayment({
  cart = [],
  onPaymentSubmit,
}: UsePOSPaymentProps = {}) {
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState(0);
  const [fiscalReference, setFiscalReference] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [cardBrand, setCardBrand] = useState("");
  const [transferReference, setTransferReference] = useState("");

  // Calculate totals from cart
  const totals = useMemo(() => {
    const taxRate = 0.19; // IVA 19% Chile

    // Calculate the actual tax amount based on each item's priceIncludesTax flag
    // - If priceIncludesTax is true: the unitPrice already includes IVA, extract it (tax = price * 19 / 119)
    // - If priceIncludesTax is false: the unitPrice is without tax, calculate it (tax = price * 19 / 100)
    let taxAmount = 0;
    let totalBeforeTax = 0;

    for (const item of cart) {
      const itemSubtotal = item.unitPrice * item.quantity;

      if (item.priceIncludesTax) {
        // Price already includes tax - extract the IVA portion for display
        const extractedTax = (itemSubtotal * taxRate) / (1 + taxRate);
        taxAmount += extractedTax;
        // The base price (without tax) is the subtotal minus extracted tax
        totalBeforeTax += itemSubtotal - extractedTax;
      } else {
        // Price doesn't include tax - calculate IVA on top
        taxAmount += itemSubtotal * taxRate;
        totalBeforeTax += itemSubtotal;
      }
    }

    // Subtotal is the sum of base prices (without tax)
    const subtotal = Math.round(totalBeforeTax);
    // Total is what the customer pays (subtotal + tax for items without included tax)
    const total = Math.round(subtotal + taxAmount);

    return {
      subtotal,
      taxAmount: Math.round(taxAmount),
      total,
    };
  }, [cart]);

  // Calculate change
  const change = useMemo(() => {
    return Math.max(0, cashReceived - totals.total);
  }, [cashReceived, totals.total]);

  // Calculate minimum deposit (30% by default)
  const minDeposit = useMemo(() => {
    return totals.total * 0.3;
  }, [totals.total]);

  // Check if payment is sufficient - depends on payment method
  const isPaymentSufficient = useMemo(() => {
    // For cash payments, need to check cash received
    if (paymentMethod === "cash") {
      if (isPartial) {
        return partialAmount >= minDeposit;
      }
      return cashReceived >= totals.total;
    }
    // For non-cash payments (card, transfer, etc.), payment is always sufficient
    // because they don't use the cash input
    return true;
  }, [
    cashReceived,
    partialAmount,
    isPartial,
    totals.total,
    minDeposit,
    paymentMethod,
  ]);

  // Effective amount being paid
  const effectivePaymentAmount = useMemo(() => {
    return isPartial ? partialAmount : totals.total;
  }, [isPartial, partialAmount, totals.total]);

  // Effective change
  const effectiveChange = useMemo(() => {
    return Math.max(0, cashReceived - effectivePaymentAmount);
  }, [cashReceived, effectivePaymentAmount]);

  // Reset payment states
  const resetPayment = useCallback(() => {
    setCashReceived(0);
    setIsPartial(false);
    setPartialAmount(0);
    setFiscalReference("");
    setCardLastFour("");
    setCardBrand("");
    setTransferReference("");
  }, []);

  // Handle quick cash amounts
  const handleQuickCash = useCallback((amount: number) => {
    setCashReceived(amount);
  }, []);

  // Quick cash amounts for common values
  const quickCashAmounts = useMemo(() => {
    const total = totals.total;
    return [
      Math.ceil(total / 1000) * 1000, // Round up to nearest 1000
      Math.ceil(total / 5000) * 5000, // Round up to nearest 5000
      Math.ceil(total / 10000) * 10000, // Round up to nearest 10000
      Math.ceil(total / 20000) * 20000, // Round up to nearest 20000
    ].filter((amount, index, self) => self.indexOf(amount) === index); // Remove duplicates
  }, [totals.total]);

  // Handle payment submission
  const handlePayment = useCallback(() => {
    const paymentData: PaymentData = {
      method: paymentMethod,
      cashReceived,
      change: effectiveChange,
      depositAmount: isPartial ? partialAmount : undefined,
      isPartial,
      fiscalReference: fiscalReference || undefined,
      cardLastFour: cardLastFour || undefined,
      cardBrand: cardBrand || undefined,
      transferReference: transferReference || undefined,
    };

    if (!isPaymentSufficient) {
      throw new Error("Monto insuficiente");
    }

    onPaymentSubmit?.(paymentData);
    return paymentData;
  }, [
    paymentMethod,
    cashReceived,
    effectiveChange,
    isPartial,
    partialAmount,
    fiscalReference,
    cardLastFour,
    cardBrand,
    transferReference,
    isPaymentSufficient,
    onPaymentSubmit,
  ]);

  // Validate payment method specific fields
  const validatePayment = useCallback((): string | null => {
    if (paymentMethod === "cash" && cashReceived < totals.total && !isPartial) {
      return "Monto en efectivo insuficiente";
    }
    if (paymentMethod === "debit_card" || paymentMethod === "credit_card") {
      // Card validation if needed
    }
    if (paymentMethod === "transfer" && !transferReference.trim()) {
      return "Ingrese referencia de transferencia";
    }
    return null;
  }, [paymentMethod, cashReceived, totals.total, isPartial, transferReference]);

  return {
    // Payment method
    paymentMethod,
    setPaymentMethod,

    // Cash
    cashReceived,
    setCashReceived,
    change,

    // Partial payment
    isPartial,
    setIsPartial,
    partialAmount,
    setPartialAmount,
    minDeposit,

    // Additional fields
    fiscalReference,
    setFiscalReference,
    cardLastFour,
    setCardLastFour,
    cardBrand,
    setCardBrand,
    transferReference,
    setTransferReference,

    // Totals
    totals,

    // Computed
    isPaymentSufficient,
    effectivePaymentAmount,
    effectiveChange,

    // Quick actions
    handleQuickCash,
    quickCashAmounts,

    // Actions
    resetPayment,
    handlePayment,
    validatePayment,
  };
}
