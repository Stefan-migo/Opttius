/**
 * Payment-related utility functions for the cash register page.
 *
 * Extracted from page.tsx to enable independent testing and reuse.
 * Contains: payment method formatting, closure status badge config,
 * cash difference computation, and filter map constants.
 */

// ponytail: static map — add new payment methods here as they're needed
export const PAYMENT_METHOD_FILTER_MAP: Record<string, string[]> = {
  cash: ["cash"],
  debit: ["debit", "debit_card"],
  credit: ["credit", "credit_card"],
  transfer: ["transfer"],
};

export interface StatusBadgeInfo {
  variant: string;
  label: string;
}

/** Static config for closure status display labels and badge variants. */
export const STATUS_BADGE_CONFIG: Record<string, StatusBadgeInfo> = {
  draft: { variant: "secondary", label: "Abierta" },
  confirmed: { variant: "default", label: "Confirmado" },
  reviewed: { variant: "secondary", label: "Revisado" },
  closed: { variant: "default", label: "Cerrada" },
  reopened: { variant: "secondary", label: "Abierta" },
};

/**
 * Resolves the display status for a closure based on its current state
 * and whether it has an active POS session.
 */
export function resolveClosureStatus(
  status: string,
  posSessionId?: string | null,
): StatusBadgeInfo {
  if (status === "closed") {
    // closed always shows "Cerrada", even if reopened historically
    return STATUS_BADGE_CONFIG.closed;
  }
  if (status === "draft" && posSessionId) {
    // draft with session = currently open
    return STATUS_BADGE_CONFIG.reopened;
  }
  return (
    STATUS_BADGE_CONFIG[status] || {
      variant: "outline",
      label: status,
    }
  );
}

/** Maps payment method codes to human-readable Spanish labels. */
export function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    cash: "Efectivo",
    debit: "Débito",
    credit: "Crédito",
    transfer: "Transf.",
    deposit: "Abono",
    installments: "Cuotas",
  };
  return map[method] || method;
}

/**
 * Computes the cash difference between actual physical cash and expected cash.
 * Returns null when actualCash hasn't been entered yet.
 */
export function computeCashDifference(
  actualCash: number | null | undefined,
  expectedCash: number,
): number | null {
  if (actualCash === null || actualCash === undefined) return null;
  return actualCash - (expectedCash || 0);
}
