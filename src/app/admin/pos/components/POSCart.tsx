"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { POSCartItem } from "../types";

interface POSCartProps {
  items: POSCartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear?: () => void;
}

export function POSCart({
  items,
  subtotal,
  taxAmount,
  total,
  onUpdateQuantity,
  onRemove,
}: POSCartProps) {
  return (
    <Card className="flex flex-col h-full bg-[var(--admin-bg-tertiary)]">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5" />
          Carrito
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-2">
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
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() =>
                      onUpdateQuantity(item.product.id, item.quantity - 1)
                    }
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-medium w-6 text-center">
                    {item.quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() =>
                      onUpdateQuantity(item.product.id, item.quantity + 1)
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-600 hover:text-red-700"
                    onClick={() => onRemove(item.product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-sm font-semibold ml-2 w-20 text-right">
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-auto p-4 border-t space-y-1 flex-shrink-0">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IVA</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
