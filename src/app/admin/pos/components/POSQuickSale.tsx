"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

import { POSCart } from "./POSCart";
import type { POSCartItem, POSCustomer, POSProduct } from "../types";

// Inline simple search input component to avoid prop mismatch
function SimpleProductSearch({
  onProductSelect,
}: {
  onProductSelect: (product: POSProduct) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar productos..."
        className="w-full px-3 py-2 border rounded-md"
      />
      <p className="text-sm text-muted-foreground">
        Use la búsqueda de productos en el panel principal
      </p>
    </div>
  );
}

// Inline simple customer search
function SimpleCustomerSearch({
  selectedCustomer,
  onCustomerSelect,
}: {
  selectedCustomer: POSCustomer | null;
  onCustomerSelect: (customer: POSCustomer | null) => void;
}) {
  return (
    <div className="space-y-2">
      {selectedCustomer ? (
        <div className="p-3 border rounded-md">
          <p className="font-medium">{selectedCustomer.name}</p>
          <button
            onClick={() => onCustomerSelect(null)}
            className="text-sm text-red-600"
          >
            Quitar
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Use la búsqueda de clientes en el panel principal
        </p>
      )}
    </div>
  );
}

interface POSQuickSaleProps {
  // Cart
  cart: POSCartItem[];
  onAddToCart: (product: POSProduct) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;

  // Customer
  customer: POSCustomer | null;
  onCustomerSelect: (customer: POSCustomer | null) => void;
  branchId?: string | null;

  // Totals
  subtotal: number;
  taxAmount: number;
  total: number;

  // Actions
  onCheckout?: () => void;
  canCheckout?: boolean;

  // Loading states
  isProcessing?: boolean;
}

export function POSQuickSale({
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  customer,
  onCustomerSelect,
  branchId,
  subtotal,
  taxAmount,
  total,
  onCheckout,
  canCheckout = false,
  isProcessing = false,
}: POSQuickSaleProps) {
  const [activeTab, setActiveTab] = useState<"products" | "customer">(
    "products",
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left Panel - Products & Customer */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Tabs for Products/Customer */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "products" | "customer")}
          className="flex-1 flex flex-col"
        >
          <TabsList className="w-full justify-start">
            <TabsTrigger value="products" className="gap-2">
              <span className="hidden sm:inline">Productos</span>
              <span className="sm:hidden">Prod</span>
            </TabsTrigger>
            <TabsTrigger value="customer" className="gap-2">
              <span className="hidden sm:inline">Cliente</span>
              <span className="sm:hidden">Cli</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex-1 mt-0">
            <SimpleProductSearch onProductSelect={onAddToCart} />
          </TabsContent>

          <TabsContent value="customer" className="flex-1 mt-0">
            <SimpleCustomerSearch
              selectedCustomer={customer}
              onCustomerSelect={onCustomerSelect}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        {/* Cart */}
        <Card className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
          <POSCart
            items={cart}
            subtotal={subtotal}
            taxAmount={taxAmount}
            total={total}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemoveFromCart}
            onClear={onClearCart}
          />
        </Card>

        {/* Customer Summary (if selected) */}
        {customer && (
          <Card className="bg-muted/50">
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium truncate ml-2">
                  {customer.name || customer.business_name || "Cliente"}
                </span>
              </div>
              {customer.rut && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">RUT:</span>
                  <span className="font-mono text-xs">{customer.rut}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Checkout Button */}
        <Card>
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <button
                className={`
                  w-full py-3 px-4 rounded-lg font-semibold transition-all
                  flex items-center justify-center gap-2
                  ${
                    canCheckout && !isProcessing
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }
                `}
                onClick={onCheckout}
                disabled={!canCheckout || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Procesando...
                  </>
                ) : (
                  <>Cobrar {total > 0 && `(${formatCurrency(total)})`}</>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
