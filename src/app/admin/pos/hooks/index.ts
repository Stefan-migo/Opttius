// POS Hooks exports
export { usePOS, POSProvider } from "./usePOSProvider";
export { usePOSKeyboardShortcuts } from "./usePOSKeyboardShortcuts";
export {
  getPaymentMethodShortcut,
  getShortcutPaymentMethod,
} from "./usePOSKeyboardShortcuts";

// Memoization utilities
export {
  useCartTotals,
  useCustomerDisplayName,
  useFormattedPrice,
  usePaymentChange,
  useProductDisplayName,
  useIsPaymentSufficient,
} from "./usePOSMemo";

// Re-export individual hooks
export { usePOSCart } from "./usePOSCart";
export { usePOSCashStatus } from "./usePOSCashStatus";
export { usePOSCustomer } from "./usePOSCustomer";
export { usePOSPayment } from "./usePOSPayment";
export { usePOSPendingBalance } from "./usePOSPendingBalance";
export { usePOSPrescription } from "./usePOSPrescription";
export { usePOSProducts } from "./usePOSProducts";
export { usePOSDiscount, type DiscountType } from "./usePOSDiscount";
