"use client";

import { AlertCircle,Loader2  } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

import type { POSCartItem, POSCustomer, POSPaymentMethod } from "../types";
import { PaymentForm } from "./_components/PaymentForm";
import { PaymentMethodFields } from "./_components/PaymentMethodFields";

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Cart data
  items: POSCartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;

  // Customer
  customer: POSCustomer | null;
  customerBusinessName?: string;
  customerRUT?: string;

  // Payment state
  paymentMethod: POSPaymentMethod;
  cashReceived: number;
  onPaymentMethodChange: (method: POSPaymentMethod) => void;
  onCashReceivedChange: (amount: number) => void;

  // Partial payment
  isPartialPayment: boolean;
  partialAmount: number;
  onPartialPaymentChange: (isPartial: boolean, amount?: number) => void;

  // Actions
  onConfirm: () => Promise<void>;
  onCancel?: () => void;

  // Cash register status
  isCashOpen?: boolean;

  // Loading
  isProcessing?: boolean;
  canProcess?: boolean;
}

export function POSPaymentDialog({
  open,
  onOpenChange,
  items,
  subtotal,
  taxAmount,
  total,
  customer,
  customerBusinessName,
  customerRUT,
  paymentMethod,
  cashReceived,
  onPaymentMethodChange,
  onCashReceivedChange,
  isPartialPayment,
  partialAmount,
  onPartialPaymentChange,
  onConfirm,
  onCancel,
  isCashOpen = true,
  isProcessing = false,
  canProcess = true,
}: POSPaymentDialogProps) {
  // Alert when cash register is closed
  useEffect(() => {
    if (open && !isCashOpen) {
      // We can't show toast here directly, but we disable the button
    }
  }, [open, isCashOpen]);

  const showAgreementFields = paymentMethod === "agreement";
  const showPaymentFields = !showAgreementFields;
  const showCashInput = paymentMethod === "cash";

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
      onCancel?.();
    }
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  // Calculate what should be paid
  const effectiveTotal = isPartialPayment ? partialAmount : total;
  const change = Math.max(0, cashReceived - effectiveTotal);
  const isPaymentSufficient = isPartialPayment
    ? cashReceived >= partialAmount
    : cashReceived >= total;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Procesar Pago</DialogTitle>
        </DialogHeader>

        {/* Cash register closed alert */}
        {!isCashOpen && (
          <Alert className="m-4 mb-0" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              La caja está cerrada. Debe abrir la caja para procesar pagos.
            </AlertDescription>
          </Alert>
        )}

        <PaymentForm
          cashReceived={cashReceived}
          change={change}
          customer={customer}
          customerBusinessName={customerBusinessName}
          customerRUT={customerRUT}
          effectiveTotal={effectiveTotal}
          isPartialPayment={isPartialPayment}
          isPaymentSufficient={isPaymentSufficient}
          items={items}
          partialAmount={partialAmount}
          showCashInput={showCashInput}
          showPaymentFields={showPaymentFields}
          subtotal={subtotal}
          taxAmount={taxAmount}
          total={total}
          onPartialPaymentChange={onPartialPaymentChange}
        />

        <PaymentMethodFields
          cashReceived={cashReceived}
          effectiveTotal={effectiveTotal}
          paymentMethod={paymentMethod}
          onCashReceivedChange={onCashReceivedChange}
          onChange={onPaymentMethodChange}
        />

        <DialogFooter>
          <Button
            disabled={isProcessing}
            variant="outline"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button
            disabled={
              !canProcess ||
              isProcessing ||
              !isCashOpen ||
              (!showAgreementFields && !isPaymentSufficient)
            }
            onClick={handleConfirm}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : showAgreementFields ? (
              <>Confirmar Venta ({formatCurrency(effectiveTotal)})</>
            ) : (
              <>Confirmar Pago ({formatCurrency(effectiveTotal)})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
