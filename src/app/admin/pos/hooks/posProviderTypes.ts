/**
 * POS Provider types — POSState interface and context definitions.
 *
 * Extracted from usePOSProvider.tsx to reduce file size.
 */

import { createContext, useContext } from "react";

import type {
  POSCartItem,
  POSCustomer,
  POSPaymentMethod,
  POSQuote,
} from "../types";

// Combined state interface
export interface POSState {
  // Branch
  branchId: string | null;
  isSuperAdmin: boolean;

  // Cart
  cart: POSCartItem[];
  addToCart: (product: POSCartItem["product"]) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Customer
  customer: POSCustomer | null;
  setCustomer: (customer: POSCustomer | null) => void;
  customerSearchTerm: string;
  setCustomerSearchTerm: (value: string) => void;
  customerResults: POSCustomer[];
  customerLoading: boolean;
  customerBusinessName: string;
  setCustomerBusinessName: (value: string) => void;
  customerRUT: string;
  setCustomerRUT: (value: string) => void;
  customerEmail: string;
  setCustomerEmail: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  clearCustomer: () => void;

  // Products
  productSearchTerm: string;
  setProductSearchTerm: (value: string) => void;
  productResults: POSCartItem["product"][];
  productLoading: boolean;
  handleSelectProduct: (product: POSCartItem["product"]) => void;
  clearProductSearch: () => void;

  // Payment
  paymentMethod: POSPaymentMethod;
  setPaymentMethod: (method: POSPaymentMethod) => void;
  cashReceived: number;
  setCashReceived: (amount: number) => void;
  paymentChange: number;
  isPartialPayment: boolean;
  setIsPartialPayment: (value: boolean) => void;
  partialAmount: number;
  setPartialAmount: (amount: number) => void;
  paymentTotals: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };
  isPaymentSufficient: boolean;
  handleQuickCash: (amount: number) => void;
  resetPayment: () => void;

  // Quotes & Prescriptions
  quotes: POSQuote[];
  selectedQuote: POSQuote | null;
  loadingQuotes: boolean;
  handleSelectQuote: (quote: POSQuote) => void;
  clearQuote: () => void;
  prescriptions: unknown[];
  selectedPrescription: unknown;
  loadingPrescriptions: boolean;
  refreshQuotes: () => Promise<void>;

  // Cash register
  isCashOpen: boolean | null;
  isCashChecking: boolean;
  refreshCashStatus: () => void;

  // Actions
  completeSale: () => Promise<unknown>;
}

const POSContext = createContext<POSState | null>(null);

export function usePOS() {
  const ctx = useContext(POSContext);
  if (!ctx) {
    throw new Error("usePOS must be used within POSProvider");
  }
  return ctx;
}

export { POSContext };
