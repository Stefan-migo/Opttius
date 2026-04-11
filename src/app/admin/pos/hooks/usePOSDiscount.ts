"use client";

import { useCallback, useMemo, useState } from "react";

export type DiscountType = "percentage" | "amount";

export interface UsePOSDiscountProps {
  /**
   * Subtotal base para calcular descuento
   */
  subtotal: number;
  /**
   * Callback opcional cuando cambia el descuento
   */
  onDiscountChange?: (discountAmount: number) => void;
}

export interface UsePOSDiscountReturn {
  /**
   * Tipo de descuento: porcentaje o monto fijo
   */
  discountType: DiscountType;
  /**
   * Valor del descuento (porcentaje o monto)
   */
  discountValue: number;
  /**
   * Monto de descuento calculado
   */
  discountAmount: number;
  /**
   * Subtotal después del descuento
   */
  effectiveSubtotal: number;
  /**
   * Si hay un descuento aplicado
   */
  hasDiscount: boolean;
  /**
   * Cambiar tipo de descuento
   */
  setDiscountType: (type: DiscountType) => void;
  /**
   * Establecer valor del descuento
   */
  setDiscountValue: (value: number) => void;
  /**
   * Aplicar descuento (calcula y notifica)
   */
  applyDiscount: (subtotal: number) => void;
  /**
   * Limpiar descuento
   */
  clearDiscount: () => void;
  /**
   * Validar que el descuento no exceda el subtotal
   */
  isValid: (subtotal: number) => boolean;
}

/**
 * Hook para gestionar descuentos en el carrito POS.
 *
 * @param subtotal - Subtotal base para cálculos
 * @param onDiscountChange - Callback opcional cuando cambia el descuento
 */
export function usePOSDiscount({
  subtotal,
  onDiscountChange,
}: UsePOSDiscountProps): UsePOSDiscountReturn {
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [hasDiscount, setHasDiscount] = useState<boolean>(false);

  /**
   * Calcular monto de descuento
   */
  const discountAmount = useMemo(() => {
    if (!hasDiscount || discountValue <= 0 || subtotal <= 0) {
      return 0;
    }

    if (discountType === "percentage") {
      // Porcentaje: no puede exceder 100%
      const percentage = Math.min(discountValue, 100);
      return Math.round((subtotal * percentage) / 100);
    }

    // Monto fijo: no puede exceder el subtotal
    return Math.min(discountValue, subtotal);
  }, [discountType, discountValue, hasDiscount, subtotal]);

  /**
   * Subtotal después del descuento
   */
  const effectiveSubtotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  /**
   * Validar que el descuento no exceda el subtotal
   */
  const isValid = useCallback(
    (currentSubtotal: number): boolean => {
      if (!hasDiscount || discountValue <= 0 || currentSubtotal <= 0) {
        return true;
      }

      if (discountType === "percentage") {
        return discountValue <= 100;
      }

      return discountValue <= currentSubtotal;
    },
    [discountType, discountValue, hasDiscount],
  );

  /**
   * Aplicar descuento
   */
  const applyDiscount = useCallback(
    (currentSubtotal: number) => {
      if (!isValid(currentSubtotal)) {
        // No aplicar si es inválido
        return;
      }
      setHasDiscount(true);
      onDiscountChange?.(discountAmount);
    },
    [isValid, discountAmount, onDiscountChange],
  );

  /**
   * Limpiar descuento
   */
  const clearDiscount = useCallback(() => {
    setDiscountValue(0);
    setHasDiscount(false);
    onDiscountChange?.(0);
  }, [onDiscountChange]);

  /**
   * Establecer valor del descuento (para uso directo)
   */
  const setDiscountValueInternal = useCallback((value: number) => {
    const cleanValue = Math.max(0, value);
    setDiscountValue(cleanValue);
    if (cleanValue > 0) {
      setHasDiscount(true);
    }
  }, []);

  return {
    discountType,
    discountValue,
    discountAmount,
    effectiveSubtotal,
    hasDiscount,
    setDiscountType,
    setDiscountValue: setDiscountValueInternal,
    applyDiscount,
    clearDiscount,
    isValid,
  };
}
