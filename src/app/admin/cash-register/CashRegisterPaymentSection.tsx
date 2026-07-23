"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import type { DailySummary, Movement } from "./cashRegister.types";

import { CashReconciliationForm } from "./_components/CashReconciliationForm";
import { DailySummaryCard } from "./_components/DailySummaryCard";

interface PaymentSectionProps {
  loadingSummary: boolean;
  dailySummary: DailySummary | null;
  movements: Movement[];
  loadingMovements: boolean;
  movementFilter: string;
  movementTypeFilter: string;
  openingCash: number;
  actualCash: number | null;
  cardMachineDebit: number;
  cardMachineCredit: number;
  transferTotal: number;
  notes: string;
  discrepancies: string;
  cashDifference: number | null;
  isOperativoMode: boolean;
  fieldOperationIdFromUrl: string | null;
  setOpeningCash: (v: number) => void;
  setActualCash: (v: number | null) => void;
  setCardMachineDebit: (v: number) => void;
  setCardMachineCredit: (v: number) => void;
  setTransferTotal: (v: number) => void;
  setNotes: (v: string) => void;
  setDiscrepancies: (v: string) => void;
  setMovementFilter: (v: string) => void;
  setMovementTypeFilter: (v: string) => void;
}

export function CashRegisterPaymentSection(props: PaymentSectionProps) {
  const {
    loadingSummary,
    dailySummary,
    movements,
    loadingMovements,
    movementFilter,
    movementTypeFilter,
    openingCash,
    actualCash,
    cardMachineDebit,
    cardMachineCredit,
    transferTotal,
    notes,
    discrepancies,
    cashDifference,
    setOpeningCash,
    setActualCash,
    setCardMachineDebit,
    setCardMachineCredit,
    setTransferTotal,
    setNotes,
    setDiscrepancies,
    setMovementFilter,
    setMovementTypeFilter,
  } = props;

  if (loadingSummary) {
    return (
      <div className="text-center py-6 sm:py-8">
        <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-epoch-primary mx-auto mb-3 sm:mb-4" />
        <p className="text-xs sm:text-sm text-admin-text-tertiary">Cargando resumen del día...</p>
      </div>
    );
  }

  if (!dailySummary) {
    return (
      <div className="text-center py-6 sm:py-8">
        <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-admin-text-tertiary mx-auto mb-3 sm:mb-4" />
        <p className="text-xs sm:text-sm text-admin-text-tertiary">No hay datos disponibles para cerrar la caja</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <DailySummaryCard
        dailySummary={dailySummary}
        movements={movements}
        loadingMovements={loadingMovements}
        movementFilter={movementFilter}
        movementTypeFilter={movementTypeFilter}
        setMovementFilter={setMovementFilter}
        setMovementTypeFilter={setMovementTypeFilter}
      />

      <CashReconciliationForm
        openingCash={openingCash}
        actualCash={actualCash}
        cardMachineDebit={cardMachineDebit}
        cardMachineCredit={cardMachineCredit}
        transferTotal={transferTotal}
        notes={notes}
        discrepancies={discrepancies}
        cashDifference={cashDifference}
        dailySummary={dailySummary}
        setOpeningCash={setOpeningCash}
        setActualCash={setActualCash}
        setCardMachineDebit={setCardMachineDebit}
        setCardMachineCredit={setCardMachineCredit}
        setTransferTotal={setTransferTotal}
        setNotes={setNotes}
        setDiscrepancies={setDiscrepancies}
      />
    </div>
  );
}
