"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { CashReconciliationForm } from "./_components/CashReconciliationForm";
import { DailySummaryCard } from "./_components/DailySummaryCard";
import type { DailySummary, Movement } from "./cashRegister.types";

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
        loadingMovements={loadingMovements}
        movementFilter={movementFilter}
        movements={movements}
        movementTypeFilter={movementTypeFilter}
        setMovementFilter={setMovementFilter}
        setMovementTypeFilter={setMovementTypeFilter}
      />

      <CashReconciliationForm
        actualCash={actualCash}
        cardMachineCredit={cardMachineCredit}
        cardMachineDebit={cardMachineDebit}
        cashDifference={cashDifference}
        dailySummary={dailySummary}
        discrepancies={discrepancies}
        notes={notes}
        openingCash={openingCash}
        setActualCash={setActualCash}
        setCardMachineCredit={setCardMachineCredit}
        setCardMachineDebit={setCardMachineDebit}
        setDiscrepancies={setDiscrepancies}
        setNotes={setNotes}
        setOpeningCash={setOpeningCash}
        setTransferTotal={setTransferTotal}
        transferTotal={transferTotal}
      />
    </div>
  );
}
