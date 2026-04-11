"use client";

import { memo, useCallback, useState } from "react";

import { Minus, Plus, ShoppingCart, Trash2, Percent, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

import type { POSCartItem } from "../types";
import type { DiscountType } from "../hooks/usePOSDiscount";

interface POSCartProps {
  items: POSCartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear?: () => void;
  // Discount props
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  onDiscountTypeChange?: (type: DiscountType) => void;
  onDiscountValueChange?: (value: number) => void;
  onClearDiscount?: () => void;
}

// Memoized CartItem component for individual items
const CartItemRow = memo(function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: POSCartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}) {
  const handleDecrease = useCallback(
    () => onUpdateQuantity(item.product.id, item.quantity - 1),
    [onUpdateQuantity, item.product.id, item.quantity],
  );

  const handleIncrease = useCallback(
    () => onUpdateQuantity(item.product.id, item.quantity + 1),
    [onUpdateQuantity, item.product.id, item.quantity],
  );

  const handleRemove = useCallback(
    () => onRemove(item.product.id),
    [onRemove, item.product.id],
  );

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.product.name}</p>
        <p className="text-xs text-gray-500">
          {formatCurrency(item.unitPrice)} × {item.quantity}
        </p>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button
          className="h-7 w-7"
          size="icon"
          variant="ghost"
          onClick={handleDecrease}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="text-sm font-medium w-6 text-center">
          {item.quantity}
        </span>
        <Button
          className="h-7 w-7"
          size="icon"
          variant="ghost"
          onClick={handleIncrease}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          className="h-7 w-7 text-red-600 hover:text-red-700"
          size="icon"
          variant="ghost"
          onClick={handleRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-sm font-semibold ml-2 w-20 text-right">
        {formatCurrency(item.subtotal)}
      </div>
    </div>
  );
});

CartItemRow.displayName = "CartItemRow";

export const POSCart = memo(function POSCart({
  items,
  subtotal,
  taxAmount,
  total,
  onUpdateQuantity,
  onRemove,
  // Discount props
  discountType = "percentage",
  discountValue = 0,
  discountAmount = 0,
  onDiscountTypeChange,
  onDiscountValueChange,
  onClearDiscount,
}: POSCartProps) {
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [inputValue, setInputValue] = useState(discountValue.toString());

  const hasDiscount = discountAmount > 0;

  // Update local input when prop changes
  const handleApplyDiscount = () => {
    const value = parseFloat(inputValue) || 0;
    onDiscountValueChange?.(value);
    setShowDiscountInput(false);
  };

  const handleClearDiscount = () => {
    onClearDiscount?.();
    setInputValue("0");
  };
  return (
    <Card className="flex flex-col h-full bg-[var(--admin-bg-tertiary)]">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5" />
          Carrito
          {items.length > 0 && (
            <Badge className="ml-2" variant="secondary">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 flex flex-col min-h-0">
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-500">
            <div>
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm">El carrito está vacío</p>
              <p className="text-xs mt-1">Busca productos para agregar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {items.map((item, index) => (
              <CartItemRow
                key={`${item.product.id}-${index}`}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-auto p-4 border-t space-y-1 flex-shrink-0">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount section */}
            {hasDiscount && (
              <div className="flex justify-between text-sm text-red-600">
                <span className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Descuento
                </span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            {/* Discount input toggle */}
            <div className="flex justify-between text-sm">
              {!showDiscountInput ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-gray-500 -ml-2"
                  onClick={() => setShowDiscountInput(true)}
                >
                  <Percent className="h-3 w-3 mr-1" />
                  Aplicar descuento
                </Button>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <Select
                    value={discountType}
                    onValueChange={(v) =>
                      onDiscountTypeChange?.(v as DiscountType)
                    }
                  >
                    <SelectTrigger className="h-7 w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="amount">$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="h-7 w-20 text-xs"
                    placeholder={
                      discountType === "percentage" ? "0-100" : "Monto"
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    min={0}
                    max={discountType === "percentage" ? 100 : undefined}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-7"
                    onClick={handleApplyDiscount}
                  >
                    OK
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => setShowDiscountInput(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Clear discount button */}
            {hasDiscount && !showDiscountInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-red-600 -ml-2"
                onClick={handleClearDiscount}
              >
                <X className="h-3 w-3 mr-1" />
                Quitar descuento
              </Button>
            )}

            {/* IVA */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IVA</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>

            {/* Total */}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

POSCart.displayName = "POSCart";
