/**
 * Shared types and errors for cash register closure.
 *
 * Extracted from closure-service.ts to reduce parent to <300 lines.
 */

import { NextResponse } from "next/server";

import type { PaymentAggregatorInput } from "@/lib/cash-register/payment-aggregator";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

// ─── Error ───────────────────────────────────────────────────────────────────

export class ClosureError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ClosureError";
    this.statusCode = statusCode;
  }
}

export function handleClosureError(error: unknown): NextResponse {
  if (error instanceof ClosureError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }
  logger.error("Error in cash register closure API:", { error });
  const message = (error as Error)?.message ?? "Unknown error";
  return NextResponse.json(
    { error: "Internal server error", details: message },
    { status: 500 },
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClosureContext {
  userId: string;
  effectiveBranchId: string | null;
  fieldOperationId: string | null;
  isSuperAdmin: boolean;
  supabaseServiceRole: ReturnType<typeof createServiceRoleClient>;
}

export interface SessionData {
  sessionId: string | null;
  openingCash: number;
  sessionPayments: PaymentAggregatorInput["sessionPayments"];
}

export interface OrderTotals {
  totalSales: number;
  totalSubtotal: number;
  totalTax: number;
  totalDiscounts: number;
}

export interface ClosureInputRaw {
  branch_id: string;
  closure_date: string;
  closed_by: string;
  pos_session_id: string | null;
  field_operation_id?: string;
  opening_cash_amount: number;
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  debitCardSales: number;
  creditCardSales: number;
  installmentsSales: number;
  otherPaymentSales: number;
  transferSales: number;
  expectedCash: number;
  actual_cash: number | undefined | null;
  cashDifference: number;
  card_machine_debit_total: number | undefined | null;
  card_machine_credit_total: number | undefined | null;
  cardMachineDifference: number;
  totalSubtotal: number;
  totalTax: number;
  totalDiscounts: number;
  notes: string | null | undefined;
  discrepancies: Record<string, unknown> | null | undefined;
  openedAt: string;
}
