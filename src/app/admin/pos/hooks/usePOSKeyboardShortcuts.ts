/**
 * usePOSKeyboardShortcuts - Keyboard shortcuts for POS system
 * Provides F1-F4 for payment methods and Ctrl+K for search
 */

import { useCallback, useEffect } from "react";

import type { POSPaymentMethod } from "../types";

interface UsePOSKeyboardShortcutsProps {
  // Payment method actions
  onCashPayment?: () => void;
  onCardPayment?: () => void;
  onTransferPayment?: () => void;
  onOtherPayment?: () => void;

  // Search actions
  onOpenSearch?: () => void;
  onSearchCustomer?: () => void;
  onSearchProduct?: () => void;

  // Cart actions
  onClearCart?: () => void;
  onCompleteSale?: () => void;

  // Modal/Dialog actions
  onOpenPaymentDialog?: () => void;
  onCloseDialog?: () => void;

  // Focus targets
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  customerInputRef?: React.RefObject<HTMLInputElement | null>;
  productInputRef?: React.RefObject<HTMLInputElement | null>;

  // State
  isPaymentDialogOpen?: boolean;
  isSearchOpen?: boolean;
  disabled?: boolean;
}

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function usePOSKeyboardShortcuts({
  onCashPayment,
  onCardPayment,
  onTransferPayment,
  onOtherPayment,
  onOpenSearch,
  onSearchCustomer,
  onSearchProduct,
  onClearCart,
  onCompleteSale,
  onOpenPaymentDialog,
  onCloseDialog,
  searchInputRef,
  customerInputRef,
  productInputRef,
  isPaymentDialogOpen = false,
  isSearchOpen = false,
  disabled = false,
}: UsePOSKeyboardShortcutsProps) {
  // Handle key press
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape always closes dialogs
      if (event.key === "Escape") {
        if (isPaymentDialogOpen) {
          onCloseDialog?.();
          event.preventDefault();
          return;
        }
      }

      // F1-F4: Payment methods (only when not in input)
      if (!isInput || target.classList.contains("pos-payment-trigger")) {
        switch (event.key) {
          case "F1":
            // Cash payment
            if (onCashPayment) {
              onCashPayment();
              event.preventDefault();
            }
            break;
          case "F2":
            // Card payment
            if (onCardPayment) {
              onCardPayment();
              event.preventDefault();
            }
            break;
          case "F3":
            // Transfer payment
            if (onTransferPayment) {
              onTransferPayment();
              event.preventDefault();
            }
            break;
          case "F4":
            // Other payment
            if (onOtherPayment) {
              onOtherPayment();
              event.preventDefault();
            }
            break;
        }
      }

      // Ctrl+K: Open global search
      if (event.ctrlKey && event.key === "k") {
        if (onOpenSearch) {
          onOpenSearch();
          event.preventDefault();
        }
      }

      // Ctrl+Shift+C: Clear cart
      if (event.ctrlKey && event.shiftKey && event.key === "C") {
        if (onClearCart) {
          onClearCart();
          event.preventDefault();
        }
      }

      // Ctrl+Enter: Complete sale / Open payment dialog
      if (event.ctrlKey && event.key === "Enter") {
        if (isPaymentDialogOpen) {
          if (onCompleteSale) {
            onCompleteSale();
            event.preventDefault();
          }
        } else {
          if (onOpenPaymentDialog) {
            onOpenPaymentDialog();
            event.preventDefault();
          }
        }
      }

      // 1-9: Quick quantity (when product is selected)
      if (!isInput && /^[1-9]$/.test(event.key)) {
        // This could trigger quantity update for selected item
        // Implementation depends on cart state
      }
    },
    [
      disabled,
      isPaymentDialogOpen,
      onCashPayment,
      onCardPayment,
      onTransferPayment,
      onOtherPayment,
      onOpenSearch,
      onCloseDialog,
      onClearCart,
      onCompleteSale,
      onOpenPaymentDialog,
    ],
  );

  // Focus search with keyboard
  const focusSearch = useCallback(() => {
    // Try to focus the most relevant input
    if (customerInputRef?.current) {
      customerInputRef.current.focus();
    } else if (productInputRef?.current) {
      productInputRef.current.focus();
    } else if (searchInputRef?.current) {
      searchInputRef.current.focus();
    }
  }, [customerInputRef, productInputRef, searchInputRef]);

  // Get available shortcuts (for help display)
  const getShortcuts = useCallback((): KeyboardShortcut[] => {
    const shortcuts: KeyboardShortcut[] = [];

    if (onCashPayment) {
      shortcuts.push({
        key: "F1",
        action: onCashPayment,
        description: "Pago en efectivo",
      });
    }
    if (onCardPayment) {
      shortcuts.push({
        key: "F2",
        action: onCardPayment,
        description: "Pago con tarjeta",
      });
    }
    if (onTransferPayment) {
      shortcuts.push({
        key: "F3",
        action: onTransferPayment,
        description: "Transferencia",
      });
    }
    if (onOtherPayment) {
      shortcuts.push({
        key: "F4",
        action: onOtherPayment,
        description: "Otro pago",
      });
    }
    if (onOpenSearch) {
      shortcuts.push({
        key: "Ctrl+K",
        action: onOpenSearch,
        description: "Buscar",
      });
    }
    if (onClearCart) {
      shortcuts.push({
        key: "Ctrl+Shift+C",
        action: onClearCart,
        description: "Limpiar carrito",
      });
    }
    if (onOpenPaymentDialog || onCompleteSale) {
      shortcuts.push({
        key: "Ctrl+Enter",
        action: onOpenPaymentDialog || onCompleteSale || (() => {}),
        description: "Completar venta",
      });
    }
    shortcuts.push({
      key: "Escape",
      action: onCloseDialog || (() => {}),
      description: "Cerrar diálogo",
    });

    return shortcuts;
  }, [
    onCashPayment,
    onCardPayment,
    onTransferPayment,
    onOtherPayment,
    onOpenSearch,
    onClearCart,
    onOpenPaymentDialog,
    onCompleteSale,
    onCloseDialog,
  ]);

  // Set up global keyboard listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    focusSearch,
    getShortcuts,
  };
}

// Payment method to shortcut mapping
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

// Shortcut to payment method mapping
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
