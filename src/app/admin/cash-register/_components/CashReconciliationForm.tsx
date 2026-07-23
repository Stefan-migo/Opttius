"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

import type { DailySummary } from "../cashRegister.types";

interface CashReconciliationFormProps {
  openingCash: number;
  actualCash: number | null;
  cardMachineDebit: number;
  cardMachineCredit: number;
  transferTotal: number;
  notes: string;
  discrepancies: string;
  cashDifference: number | null;
  dailySummary: DailySummary;
  setOpeningCash: (v: number) => void;
  setActualCash: (v: number | null) => void;
  setCardMachineDebit: (v: number) => void;
  setCardMachineCredit: (v: number) => void;
  setTransferTotal: (v: number) => void;
  setNotes: (v: string) => void;
  setDiscrepancies: (v: string) => void;
}

export function CashReconciliationForm({
  openingCash,
  actualCash,
  cardMachineDebit,
  cardMachineCredit,
  transferTotal,
  notes,
  discrepancies,
  cashDifference,
  dailySummary,
  setOpeningCash,
  setActualCash,
  setCardMachineDebit,
  setCardMachineCredit,
  setTransferTotal,
  setNotes,
  setDiscrepancies,
}: CashReconciliationFormProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2">
        <Label className="text-xs sm:text-sm">Monto Inicial de Caja</Label>
        <Input
          className="h-11 sm:h-12 text-sm sm:text-base mt-1"
          placeholder="0"
          type="number"
          value={openingCash}
          onChange={(e) => setOpeningCash(Number(e.target.value))}
        />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs sm:text-sm">Efectivo Físico Contado *</Label>
        <Input
          required
          className="h-11 sm:h-12 text-sm sm:text-base mt-1"
          placeholder="Monto contado físicamente"
          type="number"
          value={actualCash ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            setActualCash(value === "" ? null : Number(value));
          }}
        />
        <p className="text-[10px] sm:text-xs text-admin-text-tertiary mt-1 break-words">
          Efectivo esperado: {formatCurrency(dailySummary.expected_cash || 0)} (Inicial {formatCurrency(dailySummary.opening_cash_amount || 0)} + efectivo {formatCurrency(dailySummary.cash_sales || 0)})
        </p>
        {actualCash !== null && actualCash !== undefined && cashDifference !== null && (
          <p className={`text-xs sm:text-sm mt-1 font-semibold ${cashDifference > 0 ? "text-green-600" : cashDifference < 0 ? "text-red-600" : "text-muted-foreground"}`}>
            Diferencia: {cashDifference > 0 ? "+" : ""}{formatCurrency(cashDifference)}
          </p>
        )}
      </div>
      <div>
        <Label className="text-xs sm:text-sm">Total Máquina Débito</Label>
        <Input className="h-11 sm:h-12 text-sm sm:text-base mt-1" placeholder="0" type="number" value={cardMachineDebit} onChange={(e) => setCardMachineDebit(Number(e.target.value))} />
      </div>
      <div>
        <Label className="text-xs sm:text-sm">Total Máquina Crédito</Label>
        <Input className="h-11 sm:h-12 text-sm sm:text-base mt-1" placeholder="0" type="number" value={cardMachineCredit} onChange={(e) => setCardMachineCredit(Number(e.target.value))} />
      </div>
      <div>
        <Label className="text-xs sm:text-sm">Total Transferencias</Label>
        <Input className="h-11 sm:h-12 text-sm sm:text-base mt-1" placeholder="0" type="number" value={transferTotal} onChange={(e) => setTransferTotal(Number(e.target.value))} />
      </div>
      <div>
        <Label className="text-xs sm:text-sm">Notas</Label>
        <Input className="h-11 sm:h-12 text-sm sm:text-base mt-1" placeholder="Notas adicionales..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs sm:text-sm">Discrepancias</Label>
        <Input className="h-11 sm:h-12 text-sm sm:text-base mt-1" placeholder="Describa discrepancia..." value={discrepancies} onChange={(e) => setDiscrepancies(e.target.value)} />
      </div>
    </div>
  );
}
