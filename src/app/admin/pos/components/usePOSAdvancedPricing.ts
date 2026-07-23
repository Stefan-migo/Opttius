/**
 * usePOSAdvancedPricing — pricing calculations and discount state for POSAdvancedSale.
 *
 * Extracted from usePOSAdvancedSale.ts to reduce file size.
 * Pure computations + discount state; no side effects.
 */
"use client";

import { useCallback, useMemo, useState } from "react";

import type { POSProduct } from "../types";
import type { OrderFormData, Treatment } from "./POSAdvancedSale.types";
import type { LensFamily } from "./posPricingUtils";
import {
  computeDiscountAmount,
  computeLensPrice,
  computeNearLensPrice,
  computeTotalPrice,
  computeTreatmentsPrice,
  filterTreatmentsByLensType,
} from "./posPricingUtils";

export interface UsePOSAdvancedPricingProps {
  orderFormData: OrderFormData;
  treatments: Treatment[];
  lensFamilies: readonly LensFamily[];
  selectedFrame: POSProduct | null;
}

export interface UsePOSAdvancedPricingReturn {
  discountType: "none" | "percentage" | "fixed";
  setDiscountType: (v: "none" | "percentage" | "fixed") => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  treatmentsPrice: number;
  lensPriceValue: number;
  nearLensPriceValue: number;
  lensPrice: () => number;
  totalPrice: () => number;
  discountAmount: () => number;
  filteredTreatments: Treatment[];
}

export function usePOSAdvancedPricing({
  orderFormData,
  treatments,
  lensFamilies,
  selectedFrame,
}: UsePOSAdvancedPricingProps): UsePOSAdvancedPricingReturn {
  const [discountType, setDiscountType] = useState<
    "none" | "percentage" | "fixed"
  >("none");
  const [discountValue, setDiscountValue] = useState(0);

  const treatmentsPrice = useMemo(
    () => computeTreatmentsPrice(orderFormData.treatment_ids, treatments),
    [orderFormData.treatment_ids, treatments],
  );

  const lensPriceValue = useMemo(
    () =>
      computeLensPrice(
        orderFormData.lens_family_id,
        orderFormData.presbyopia_solution,
        lensFamilies,
      ),
    [
      orderFormData.lens_family_id,
      orderFormData.presbyopia_solution,
      lensFamilies,
    ],
  );

  const nearLensPriceValue = useMemo(
    () => computeNearLensPrice(orderFormData.near_lens_family_id, lensFamilies),
    [orderFormData.near_lens_family_id, lensFamilies],
  );

  const lensPrice = useCallback(() => lensPriceValue, [lensPriceValue]);

  const totalPrice = useCallback(
    () =>
      computeTotalPrice(
        selectedFrame,
        orderFormData.customer_own_frame,
        lensPrice(),
        treatmentsPrice,
        orderFormData.labor_cost,
        discountType,
        discountValue,
      ),
    [
      selectedFrame,
      orderFormData.customer_own_frame,
      lensPrice,
      treatmentsPrice,
      orderFormData.labor_cost,
      discountType,
      discountValue,
    ],
  );

  const discountAmount = useCallback(
    () =>
      computeDiscountAmount(
        selectedFrame,
        orderFormData.customer_own_frame,
        lensPrice(),
        treatmentsPrice,
        orderFormData.labor_cost,
        discountType,
        discountValue,
      ),
    [
      selectedFrame,
      orderFormData.customer_own_frame,
      lensPrice,
      treatmentsPrice,
      orderFormData.labor_cost,
      discountType,
      discountValue,
    ],
  );

  const filteredTreatments = useMemo(
    () => filterTreatmentsByLensType(treatments, orderFormData.lens_type),
    [treatments, orderFormData.lens_type],
  );

  return {
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    treatmentsPrice,
    lensPriceValue,
    nearLensPriceValue,
    lensPrice,
    totalPrice,
    discountAmount,
    filteredTreatments,
  };
}
