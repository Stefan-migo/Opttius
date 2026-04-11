"use client";

import { useState, useEffect } from "react";

import { Loader2 } from "lucide-react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import {
  getAgreements,
  type Agreement,
} from "@/lib/api/services/agreementService";

import { POSCashInput } from "./POSCashInput";
import { POSPaymentMethods } from "./POSPaymentMethods";
import { POSAgreementSelector } from "./POSAgreementSelector";
import type { POSCartItem, POSCustomer, POSPaymentMethod } from "../types";

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
  isCashOpen = true,
  isProcessing = false,
  canProcess = true,
}: POSPaymentDialogProps) {
  const [transferReference, setTransferReference] = useState("");

  // Alert when cash register is closed
  useEffect(() => {
    if (open && !isCashOpen) {
      // We can't show toast here directly, but we disable the button
    }
  }, [open, isCashOpen]);
  const [fiscalReference, setFiscalReference] = useState("");

  // Agreement state
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(
    null,
  );
  const [agreementsLoading, setAgreementsLoading] = useState(false);
  const [agreementReference, setAgreementReference] = useState("");

  // Fetch agreements when opening with agreement payment method
  useEffect(() => {
    if (open && paymentMethod === "agreement" && agreements.length === 0) {
      setAgreementsLoading(true);
      getAgreements({ status: "active" })
        .then((response) => {
          setAgreements(response.data);
        })
        .catch((error) => {
          console.error("Error loading agreements:", error);
          setAgreements([]);
        })
        .finally(() => {
          setAgreementsLoading(false);
        });
    }
  }, [open, paymentMethod, agreements.length]);

  // Reset selected agreement when payment method changes
  useEffect(() => {
    if (paymentMethod !== "agreement") {
      setSelectedAgreementId(null);
    }
  }, [paymentMethod]);

  // Show agreement fields
  const showAgreementFields = paymentMethod === "agreement";

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

  // Show cash input only for cash payment
  const showCashInput = paymentMethod === "cash";

  // Show card/transfer fields for card/transfer payments
  const showCardFields =
    paymentMethod === "debit_card" || paymentMethod === "credit_card";
  const showTransferFields = paymentMethod === "transfer";

  // For agreement payment, no cash input needed
  const showPaymentFields = !showAgreementFields;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Procesar Pago</DialogTitle>
        </DialogHeader>

        {/* Cash register closed alert */}
        {!isCashOpen && (
          <Alert variant="destructive" className="m-4 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              La caja está cerrada. Debe abrir la caja para procesar pagos.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Customer summary */}
          {(customer || customerBusinessName) && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Cliente</p>
              <p className="text-sm text-muted-foreground">
                {/* Build display name: first_name + last_name, then name, then business_name, then manual entry */}
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
                value={isPartialPayment ? "partial" : "full"}
                onValueChange={(v) =>
                  onPartialPaymentChange(v === "partial", partialAmount)
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="text-sm cursor-pointer">
                    Pago completo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partial" id="partial" />
                  <Label htmlFor="partial" className="text-sm cursor-pointer">
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
                  id="partial-amount"
                  type="number"
                  min={0}
                  step={100}
                  value={partialAmount || ""}
                  onChange={(e) =>
                    onPartialPaymentChange(true, parseInt(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo requerido: {formatCurrency(total * 0.3)} (30%)
              </p>
            </div>
          )}

          {/* Payment method */}
          <div className="space-y-3">
            <Label>Método de pago</Label>
            <POSPaymentMethods
              value={paymentMethod}
              onChange={onPaymentMethodChange}
              compact
            />
          </div>

          {/* Cash input */}
          {showCashInput && (
            <POSCashInput
              value={cashReceived}
              onChange={onCashReceivedChange}
              total={effectiveTotal}
            />
          )}

          {/* Card fields - only fiscal reference, no last 4 digits */}
          {showCardFields && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fiscal-reference">
                  Referencia fiscal / Número de boleta
                </Label>
                <Input
                  id="fiscal-reference"
                  value={fiscalReference}
                  onChange={(e) => setFiscalReference(e.target.value)}
                  placeholder="Número de transacción o boleta"
                />
              </div>
            </div>
          )}

          {/* Transfer fields */}
          {showTransferFields && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="transfer-reference">
                  Referencia de transferencia
                </Label>
                <Input
                  id="transfer-reference"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  placeholder="Número de transferencia"
                />
              </div>
            </div>
          )}

          {/* Agreement/Convenio fields */}
          {showAgreementFields && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  El pago será gestionado mediante el convenio institucional del
                  cliente. No se requiere pago inmediato.
                </p>
              </div>

              {/* Agreement selector dropdown */}
              <div className="space-y-2">
                <Label>Seleccionar Convenio</Label>
                {agreementsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando convenios...
                  </div>
                ) : (
                  <POSAgreementSelector
                    agreements={agreements.map((a) => ({
                      id: a.id,
                      name: a.name,
                      business_name: a.institution_name,
                      discount_percentage: a.discount_percent ?? undefined,
                      status: a.status,
                    }))}
                    selectedAgreementId={selectedAgreementId}
                    onSelect={(agreement) => {
                      setSelectedAgreementId(agreement?.id ?? null);
                    }}
                    placeholder="Seleccionar convenio..."
                  />
                )}
              </div>

              {/* Optional reference input */}
              <div className="space-y-2">
                <Label htmlFor="agreement-reference">
                  Referencia / Orden de compra (opcional)
                </Label>
                <Input
                  id="agreement-reference"
                  value={agreementReference}
                  onChange={(e) => setAgreementReference(e.target.value)}
                  placeholder="Número de orden de compra, código de convenio..."
                />
              </div>
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !canProcess ||
              isProcessing ||
              !isCashOpen ||
              (!showAgreementFields && !isPaymentSufficient)
            }
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
