"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { POSCartItem, POSCustomer, PaymentMethod } from "../types";

export interface POSContextValue {
  branchId: string | null;
  cart: POSCartItem[];
  setCart: React.Dispatch<React.SetStateAction<POSCartItem[]>>;
  selectedCustomer: POSCustomer | null;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<POSCustomer | null>>;
  paymentMethod: PaymentMethod;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PaymentMethod>>;
  cashReceived: number;
  setCashReceived: React.Dispatch<React.SetStateAction<number>>;
  isCashOpen: boolean | null;
}

const POSContext = createContext<POSContextValue | null>(null);

export function usePOSContext() {
  const ctx = useContext(POSContext);
  if (!ctx) {
    throw new Error("usePOSContext must be used within POSProvider");
  }
  return ctx;
}

export function POSProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: POSContextValue;
}) {
  const memoValue = useMemo(
    () => value,
    [
      value.branchId,
      value.cart,
      value.selectedCustomer,
      value.paymentMethod,
      value.cashReceived,
      value.isCashOpen,
    ],
  );

  return (
    <POSContext.Provider value={memoValue}>{children}</POSContext.Provider>
  );
}
