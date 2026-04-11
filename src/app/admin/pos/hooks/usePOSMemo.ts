/**
 * POS Memoization Utilities
 * Optimized hooks and utilities for POS performance
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Memoized callback that stable across renders
 * Useful for passing callbacks to child components
 */
export function usePOSMemoizedCallback<
  T extends (...args: unknown[]) => unknown,
>(callback: T, deps: React.DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, deps) as T;
}

/**
 * Stable reference that only changes when value actually changes
 * Prevents unnecessary re-renders of child components
 */
export function useStableRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * Memoized cart item key for stable list rendering
 */
export function getCartItemKey(
  item: { product: { id: string } },
  index: number,
): string {
  return `${item.product.id}-${index}`;
}

/**
 * Memoized product display text
 */
export function useProductDisplayName(product: {
  name: string;
  brand?: string;
  sku?: string;
}): string {
  return useMemo(() => {
    const parts = [product.name];
    if (product.brand) parts.push(`(${product.brand})`);
    if (product.sku) parts.push(`[${product.sku}]`);
    return parts.join(" ");
  }, [product.name, product.brand, product.sku]);
}

/**
 * Memoized price formatter with currency
 */
export function useFormattedPrice(price: number, currency = "CLP"): string {
  return useMemo(() => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }, [price, currency]);
}

/**
 * Memoized cart totals calculation
 */
export function useCartTotals(
  items: Array<{
    quantity: number;
    unitPrice: number;
    priceIncludesTax: boolean;
  }>,
  taxRate: number = 0.19,
) {
  return useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // Calculate tax for items that don't include tax
    const taxAmount = items.reduce((sum, item) => {
      if (!item.priceIncludesTax) {
        return sum + item.quantity * item.unitPrice * taxRate;
      }
      return sum;
    }, 0);

    const total = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal),
      taxAmount: Math.round(taxAmount),
      total: Math.round(total),
    };
  }, [items, taxRate]);
}

/**
 * Memoized customer display name
 */
export function useCustomerDisplayName(customer: {
  name?: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
}): string {
  return useMemo(() => {
    if (customer.business_name) {
      return customer.business_name;
    }
    if (customer.name) {
      return customer.name;
    }
    if (customer.first_name || customer.last_name) {
      return [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" ");
    }
    return "Cliente sin nombre";
  }, [
    customer.name,
    customer.first_name,
    customer.last_name,
    customer.business_name,
  ]);
}

/**
 * Memoized payment change calculation
 */
export function usePaymentChange(cashReceived: number, total: number): number {
  return useMemo(() => {
    return Math.max(0, cashReceived - total);
  }, [cashReceived, total]);
}

/**
 * Memoized payment sufficiency check
 */
export function useIsPaymentSufficient(
  cashReceived: number,
  total: number,
): boolean {
  return useMemo(() => {
    return cashReceived >= total;
  }, [cashReceived, total]);
}

/**
 * Debounced search with memoization
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Stable event handler that prevents memory leaks
 */
export function useStableEventHandler<T extends (...args: unknown[]) => void>(
  handler: T,
  deps: React.DependencyList,
): T {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  return useCallback(
    (...args: unknown[]) => {
      return handlerRef.current(...args);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  ) as T;
}
