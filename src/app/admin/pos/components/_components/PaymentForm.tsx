"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

import type { POSCartItem, POSCustomer } from "../../types";

interface PaymentFormProps {
  customer: POSCustomer | null;
  customerBusinessName?: string;
  customerRUT?: string;
  items: POSCartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  isPartialPayment: boolean;
  partialAmount: number;
  onPartialPaymentChange: (isPartial: boolean, amount?: number) => void;
  effectiveTotal: number;
  showPaymentFields: boolean;
  showCashInput: boolean;
  cashReceived: number;
  change: number;
  isPaymentSufficient: boolean;
}

export function PaymentForm({
  customer,
  customerBusinessName,
  customerRUT,
  items,
  subtotal,
  taxAmount,
  total,
  isPartialPayment,
  partialAmount,
  onPartialPaymentChange,
  effectiveTotal,
  showPaymentFields,
  showCashInput,
  cashReceived,
  change,
  isPaymentSufficient,
}: PaymentFormProps) {
  return (
    <div className="space-y-6 py-4">
      {/* Customer summary */}
      {(customer || customerBusinessName) && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium">Cliente</p>
          <p className="text-sm text-muted-foreground">
            {customer?.first_name && customer?.last_name
              ? `${customer.first_name} ${customer.last_name}`.trim()
              : customer?.name ||
                customer?.business_name ||
                customerBusinessName ||
                "Cliente sin nombre"}
            {(customer?.rut || customerRUT) &&
              ` (${customer?.rut || customerRUT})`}
          </p>
        </div>
      )}

      {/* Order summary */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Resumen</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Productos ({items.length})
            </span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA (19%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Partial payment toggle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <RadioGroup
            className="flex gap-4"
            value={isPartialPayment ? "partial" : "full"}
            onValueChange={(v) =>
              onPartialPaymentChange(v === "partial", partialAmount)
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="full" value="full" />
              <Label className="text-sm cursor-pointer" htmlFor="full">
                Pago completo
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="partial" value="partial" />
              <Label className="text-sm cursor-pointer" htmlFor="partial">
                Abono/Partial
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Partial amount input */}
      {isPartialPayment && (
        <div className="space-y-2">
          <Label htmlFor="partial-amount">Monto del abono</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              className="pl-8"
              id="partial-amount"
              min={0}
              placeholder="0"
              step={100}
              type="number"
              value={partialAmount || ""}
              onChange={(e) =>
                onPartialPaymentChange(true, parseInt(e.target.value) || 0)
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Mínimo requerido: {formatCurrency(total * 0.3)} (30%)
          </p>
        </div>
      )}

      {/* Payment summary */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monto a pagar</span>
            <span className="font-medium">
              {formatCurrency(effectiveTotal)}
            </span>
          </div>
          {showPaymentFields && showCashInput && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recibido</span>
                <span className="font-medium">
                  {formatCurrency(cashReceived)}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Vuelto</span>
                <span
                  className={
                    isPaymentSufficient
                      ? "text-green-600"
                      : "text-muted-foreground"
                  }
                >
                  {formatCurrency(change)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
