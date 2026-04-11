/**
 * usePOSProvider - Provider component that combines all POS hooks
 * Provides a unified interface for the POS page
 */

import React, { createContext, useContext, useMemo } from "react";

import { usePOSCart, type UsePOSCartProps } from "./usePOSCart";
import { usePOSCashStatus } from "./usePOSCashStatus";
import { usePOSCustomer } from "./usePOSCustomer";
import { usePOSPayment, type PaymentData } from "./usePOSPayment";
import { usePOSPrescription } from "./usePOSPrescription";
import { usePOSProducts } from "./usePOSProducts";
import type {
  POSCartItem,
  POSCustomer,
  POSPaymentMethod,
  POSQuote,
} from "../types";

interface UsePOSProviderProps {
  branchId?: string | null;
  isSuperAdmin?: boolean;
  onSaleComplete?: (order: unknown) => void;
}

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

export function POSProvider({
  children,
  branchId,
  isSuperAdmin = false,
  onSaleComplete,
}: {
  children: React.ReactNode;
} & UsePOSProviderProps) {
  // Cart hook
  const cartHook = usePOSCart({ cart: [], setCart: () => {} });

  // Create cart state at provider level
  const [cart, setCart] = React.useState<POSCartItem[]>([]);
  const cartWithState = usePOSCart({ cart, setCart });

  // Customer hook
  const customerHook = usePOSCustomer({
    onCustomerSelect: (customer) => {
      // Customer selected
    },
  });

  // Products hook
  const productHook = usePOSProducts({
    branchId,
    onProductSelect: (product) => {
      cartWithState.addToCart(product);
    },
  });

  // Payment hook
  const paymentHook = usePOSPayment({
    cart,
    onPaymentSubmit: async (paymentData: PaymentData) => {
      // This will be called when payment is submitted
      // The actual sale processing happens in the page component
      console.log("Payment submitted:", paymentData);
    },
  });

  // Prescription hook
  const prescriptionHook = usePOSPrescription({
    customer: customerHook.selectedCustomer,
    branchId,
    onQuoteSelect: (quote) => {
      // Load quote items into cart
    },
  });

  // Debug: log when customer changes
  React.useEffect(() => {
    console.log(
      "[usePOSProvider] customerHook.selectedCustomer:",
      customerHook.selectedCustomer,
    );
    console.log("[usePOSProvider] branchId:", branchId);
  }, [customerHook.selectedCustomer, branchId]);

  // Cash status hook
  const cashStatusHook = usePOSCashStatus(
    branchId as string | null,
    isSuperAdmin,
  );

  // Customer setter wrapper - handles both null and customer
  const setCustomerWrapper = (customer: POSCustomer | null) => {
    if (customer) {
      customerHook.handleSelectCustomer(customer);
    } else {
      customerHook.clearCustomer();
    }
  };

  // Complete sale handler
  const completeSale = React.useCallback(async () => {
    if (!branchId) {
      throw new Error("Branch ID is required");
    }

    if (cart.length === 0) {
      throw new Error("Cart is empty");
    }

    // Prepare sale data
    const saleData = {
      customer_id: customerHook.selectedCustomer?.id,
      customer_name:
        customerHook.businessName || customerHook.selectedCustomer?.name,
      customer_rut: customerHook.rut || customerHook.selectedCustomer?.rut,
      customer_email: customerHook.selectedCustomer?.email,
      customer_phone: customerHook.selectedCustomer?.phone,
      items: cart.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
      payment_method: paymentHook.paymentMethod,
      cash_received: paymentHook.cashReceived,
      subtotal: paymentHook.totals.subtotal,
      discount_amount: 0,
      tax_amount: paymentHook.totals.taxAmount,
      total: paymentHook.totals.total,
      branch_id: branchId,
    };

    // TODO: Call actual API to process sale
    console.log("Processing sale:", saleData);

    // Reset after sale
    setCart([]);
    customerHook.clearCustomer();
    paymentHook.resetPayment();
    prescriptionHook.clearQuote();

    return saleData;
  }, [branchId, cart, customerHook, paymentHook, prescriptionHook]);

  // Memoized value
  const value = useMemo<POSState>(
    () => ({
      // Branch
      branchId: branchId || null,
      isSuperAdmin,

      // Cart
      cart,
      addToCart: cartWithState.addToCart,
      updateCartQuantity: cartWithState.updateQuantity,
      removeFromCart: cartWithState.removeFromCart,
      clearCart: cartWithState.clearCart,

      // Customer
      customer: customerHook.selectedCustomer,
      setCustomer: setCustomerWrapper,
      customerSearchTerm: customerHook.searchTerm,
      setCustomerSearchTerm: customerHook.setSearchTerm,
      customerResults: customerHook.results,
      customerLoading: customerHook.loading,
      customerBusinessName: customerHook.businessName,
      setCustomerBusinessName: customerHook.setBusinessName,
      customerRUT: customerHook.rut,
      setCustomerRUT: customerHook.setRut,
      customerEmail: customerHook.email,
      setCustomerEmail: customerHook.setEmail,
      customerPhone: customerHook.phone,
      setCustomerPhone: customerHook.setPhone,
      clearCustomer: customerHook.clearCustomer,

      // Products
      productSearchTerm: productHook.searchTerm,
      setProductSearchTerm: productHook.setSearchTerm,
      productResults: productHook.results,
      productLoading: productHook.loading,
      handleSelectProduct: productHook.handleSelectProduct,
      clearProductSearch: productHook.clearSearch,

      // Payment
      paymentMethod: paymentHook.paymentMethod,
      setPaymentMethod: paymentHook.setPaymentMethod,
      cashReceived: paymentHook.cashReceived,
      setCashReceived: paymentHook.setCashReceived,
      paymentChange: paymentHook.change,
      isPartialPayment: paymentHook.isPartial,
      setIsPartialPayment: paymentHook.setIsPartial,
      partialAmount: paymentHook.partialAmount,
      setPartialAmount: paymentHook.setPartialAmount,
      paymentTotals: paymentHook.totals,
      isPaymentSufficient: paymentHook.isPaymentSufficient,
      handleQuickCash: paymentHook.handleQuickCash,
      resetPayment: paymentHook.resetPayment,

      // Quotes & Prescriptions
      quotes: prescriptionHook.quotes,
      selectedQuote: prescriptionHook.selectedQuote,
      loadingQuotes: prescriptionHook.loadingQuotes,
      handleSelectQuote: prescriptionHook.handleSelectQuote,
      clearQuote: prescriptionHook.clearQuote,
      prescriptions: prescriptionHook.prescriptions,
      selectedPrescription: prescriptionHook.selectedPrescription,
      loadingPrescriptions: prescriptionHook.loadingPrescriptions,
      refreshQuotes: prescriptionHook.refreshQuotes,

      // Cash register
      isCashOpen: cashStatusHook.isOpen,
      isCashChecking: cashStatusHook.checking,
      refreshCashStatus: cashStatusHook.refresh,

      // Actions
      completeSale,
    }),
    [
      branchId,
      isSuperAdmin,
      cart,
      cartWithState,
      customerHook,
      productHook,
      paymentHook,
      prescriptionHook,
      cashStatusHook,
      completeSale,
    ],
  );

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}
