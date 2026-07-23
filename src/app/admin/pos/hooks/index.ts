// POS Hooks exports
export {
  getPaymentMethodShortcut,
  getShortcutPaymentMethod,
} from "./posShortcutMappings";
export { usePOSKeyboardShortcuts } from "./usePOSKeyboardShortcuts";
export { POSProvider,usePOS } from "./usePOSProvider";

// Memoization utilities
export {
  useCartTotals,
  useCustomerDisplayName,
  useFormattedPrice,
  useIsPaymentSufficient,
  usePaymentChange,
  useProductDisplayName,
} from "./usePOSMemo";

// Re-export individual hooks
export { usePOSCart } from "./usePOSCart";
export { usePOSCashStatus } from "./usePOSCashStatus";
export { usePOSCustomer } from "./usePOSCustomer";
export { type DiscountType,usePOSDiscount } from "./usePOSDiscount";
export { usePOSPayment } from "./usePOSPayment";
export { usePOSPendingBalance } from "./usePOSPendingBalance";
export { usePOSPrescription } from "./usePOSPrescription";
export { usePOSProducts } from "./usePOSProducts";
