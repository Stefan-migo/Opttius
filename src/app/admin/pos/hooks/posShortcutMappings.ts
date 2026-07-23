/**
 * POS keyboard shortcut to payment method mapping helpers.
 *
 * Extracted from usePOSKeyboardShortcuts.ts to reduce file size.
 */
import type { POSPaymentMethod } from "../types";

export function getPaymentMethodShortcut(method: POSPaymentMethod): string {
  switch (method) {
    case "cash":
      return "F1";
    case "debit_card":
      return "F2";
    case "credit_card":
      return "F2";
    case "transfer":
      return "F3";
    default:
      return "";
  }
}

export function getShortcutPaymentMethod(
  shortcut: string,
): POSPaymentMethod | null {
  switch (shortcut) {
    case "F1":
      return "cash";
    case "F2":
      return "debit_card";
    case "F3":
      return "transfer";
    default:
      return null;
  }
}
