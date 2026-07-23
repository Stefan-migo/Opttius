"use client";

import type { DiscountType } from "../hooks";
import type { POSCartItem } from "../types";
import { POMPaymentSection } from "./POMPaymentSection";
import { POSCart } from "./POSCart";

export interface POSCartPanelProps {
  cart: POSCartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  change: number;
  paymentMethod: string;
  cashReceived: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onPaymentMethodChange: (method: string) => void;
  onCashReceivedChange: (amount: number) => void;
  onQuickCash: (amount: number) => void;
  onOpenPaymentDialog: () => void;

  // Discount
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  onDiscountTypeChange: (type: DiscountType) => void;
  onDiscountValueChange: (value: number) => void;
  onClearDiscount: () => void;
}

export function POSCartPanel({
  cart,
  subtotal,
  taxAmount,
  total,
  change,
  paymentMethod,
  cashReceived,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onPaymentMethodChange,
  onCashReceivedChange,
  onQuickCash,
  onOpenPaymentDialog,
  discountType,
  discountValue,
  discountAmount,
  onDiscountTypeChange,
  onDiscountValueChange,
  onClearDiscount,
}: POSCartPanelProps) {
  return (
    <div className="w-1/3 border-l flex flex-col bg-card">
      <div className="flex-1 overflow-hidden">
        <POSCart
          discountAmount={discountAmount}
          discountType={discountType}
          discountValue={discountValue}
          items={cart}
          subtotal={subtotal}
          taxAmount={taxAmount}
          total={total}
          onClear={onClearCart}
          onClearDiscount={onClearDiscount}
          onDiscountTypeChange={onDiscountTypeChange}
          onDiscountValueChange={onDiscountValueChange}
          onRemove={onRemoveFromCart}
          onUpdateQuantity={onUpdateQuantity}
        />
      </div>

      <POMPaymentSection
        cartLength={cart.length}
        cashReceived={cashReceived}
        change={change}
        paymentMethod={paymentMethod}
        total={total}
        onCashReceivedChange={onCashReceivedChange}
        onOpenPaymentDialog={onOpenPaymentDialog}
        onPaymentMethodChange={onPaymentMethodChange}
        onQuickCash={onQuickCash}
      />
    </div>
  );
}
