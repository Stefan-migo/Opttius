"use client";

import { Loader2 } from "lucide-react";
import { useEffect,useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Agreement,getAgreements } from "@/lib/api/services/agreementService";

import type { POSPaymentMethod } from "../../types";
import { POSAgreementSelector } from "../POSAgreementSelector";
import { POSCashInput } from "../POSCashInput";
import { POSPaymentMethods } from "../POSPaymentMethods";

interface PaymentMethodFieldsProps {
  paymentMethod: POSPaymentMethod;
  onChange: (method: POSPaymentMethod) => void;
  cashReceived: number;
  onCashReceivedChange: (amount: number) => void;
  effectiveTotal: number;
}

export function PaymentMethodFields({
  paymentMethod,
  onChange,
  cashReceived,
  onCashReceivedChange,
  effectiveTotal,
}: PaymentMethodFieldsProps) {
  const [fiscalReference, setFiscalReference] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState<
    string | null
  >(null);
  const [agreementsLoading, setAgreementsLoading] = useState(false);
  const [agreementReference, setAgreementReference] = useState("");

  // Fetch agreements when opening with agreement payment method
  useEffect(() => {
    if (paymentMethod === "agreement" && agreements.length === 0) {
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
  }, [paymentMethod, agreements.length]);

  // Reset selected agreement when payment method changes
  useEffect(() => {
    if (paymentMethod !== "agreement") {
      setSelectedAgreementId(null);
    }
  }, [paymentMethod]);

  const showCashInput = paymentMethod === "cash";
  const showCardFields =
    paymentMethod === "debit_card" || paymentMethod === "credit_card";
  const showTransferFields = paymentMethod === "transfer";
  const showAgreementFields = paymentMethod === "agreement";

  return (
    <div className="space-y-3">
      <Label>Método de pago</Label>
      <POSPaymentMethods compact value={paymentMethod} onChange={onChange} />

      {showCashInput && (
        <POSCashInput
          total={effectiveTotal}
          value={cashReceived}
          onChange={onCashReceivedChange}
        />
      )}

      {showCardFields && (
        <div className="space-y-2">
          <Label htmlFor="fiscal-reference">
            Referencia fiscal / Número de boleta
          </Label>
          <Input
            id="fiscal-reference"
            placeholder="Número de transacción o boleta"
            value={fiscalReference}
            onChange={(e) => setFiscalReference(e.target.value)}
          />
        </div>
      )}

      {showTransferFields && (
        <div className="space-y-2">
          <Label htmlFor="transfer-reference">
            Referencia de transferencia
          </Label>
          <Input
            id="transfer-reference"
            placeholder="Número de transferencia"
            value={transferReference}
            onChange={(e) => setTransferReference(e.target.value)}
          />
        </div>
      )}

      {showAgreementFields && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              El pago será gestionado mediante el convenio institucional del
              cliente. No se requiere pago inmediato.
            </p>
          </div>

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
                placeholder="Seleccionar convenio..."
                selectedAgreementId={selectedAgreementId}
                onSelect={(agreement) => {
                  setSelectedAgreementId(agreement?.id ?? null);
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agreement-reference">
              Referencia / Orden de compra (opcional)
            </Label>
            <Input
              id="agreement-reference"
              placeholder="Número de orden de compra, código de convenio..."
              value={agreementReference}
              onChange={(e) => setAgreementReference(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
