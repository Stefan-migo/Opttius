/**
 * usePOSAdvancedPrescription — prescription loading and external prescription state.
 *
 * Extracted from usePOSAdvancedSale.ts to reduce file size.
 * Delegates to posDataLoader actions for zero-behavior-change refactor.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getPrescriptions,
  type Prescription,
} from "@/lib/api/services/customerService";

import { DEFAULT_LENS_FAMILIES } from "./POSAdvancedSale.constants";
import type {
  ExternalPrescriptionData,
  OrderFormData,
} from "./POSAdvancedSale.types";
import { loadPrescriptionsAction } from "./posDataLoader";
import { suggestLensFamily as suggestLensFamilyPure } from "./posPricingUtils";

export interface UsePOSAdvancedPrescriptionProps {
  customerId: string | undefined;
  quickCustomerName?: string | null;
  quickCustomerRUT?: string | null;
  orderFormData: OrderFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
}

export interface UsePOSAdvancedPrescriptionReturn {
  prescriptions: Prescription[];
  selectedPrescription: Prescription | null;
  setSelectedPrescription: (v: Prescription | null) => void;
  loadingPrescriptions: boolean;
  externalPrescriptionData: ExternalPrescriptionData;
  setExternalPrescriptionData: React.Dispatch<
    React.SetStateAction<ExternalPrescriptionData>
  >;
  useExternalPrescription: boolean;
  setUseExternalPrescription: (v: boolean) => void;
  suggestLensFamily: () => void;
}

export function usePOSAdvancedPrescription({
  customerId,
  quickCustomerName,
  quickCustomerRUT,
  orderFormData,
  setOrderFormData,
}: UsePOSAdvancedPrescriptionProps): UsePOSAdvancedPrescriptionReturn {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  const [externalPrescriptionData, setExternalPrescriptionData] =
    useState<ExternalPrescriptionData>({
      prescription_date: "",
      expiration_date: "",
      prescription_number: "",
      issued_by: "",
      issued_by_license: "",
      od_sphere: "",
      od_cylinder: "",
      od_axis: "",
      od_add: "",
      os_sphere: "",
      os_cylinder: "",
      os_axis: "",
      os_add: "",
      pd: "",
      near_pd: "",
      frame_pd: "",
      height_segmentation: "",
    });
  const [useExternalPrescription, setUseExternalPrescription] = useState(false);

  // Auto-enable external prescription when quick customer but no registered customer
  useEffect(() => {
    if (!customerId && (quickCustomerName || quickCustomerRUT)) {
      setUseExternalPrescription(true);
    }
  }, [customerId, quickCustomerName, quickCustomerRUT]);

  // Load prescriptions when customer changes (delegates to posDataLoader for exact behavior)
  useEffect(() => {
    loadPrescriptionsAction(
      customerId,
      getPrescriptions,
      setPrescriptions,
      setSelectedPrescription,
      setLoadingPrescriptions,
    );
  }, [customerId]);

  const suggestLensFamily = useCallback(() => {
    const suggestion = suggestLensFamilyPure(
      selectedPrescription,
      DEFAULT_LENS_FAMILIES,
      orderFormData.lens_type,
    );
    if (!suggestion || !selectedPrescription) return;

    const hasAddition =
      (selectedPrescription.od_add && selectedPrescription.od_add > 0) ||
      (selectedPrescription.os_add && selectedPrescription.os_add > 0);

    setOrderFormData((prev) => ({
      ...prev,
      lens_family_id: suggestion.lens_family_id,
      lens_family_name: suggestion.lens_family_name,
      near_lens_family_id:
        prev.near_lens_family_id || suggestion.near_lens_family_id,
      near_lens_family_name:
        prev.near_lens_family_name || suggestion.near_lens_family_name,
      presbyopia_solution: hasAddition
        ? suggestion.presbyopia_solution
        : prev.presbyopia_solution,
    }));
  }, [selectedPrescription, orderFormData.lens_type, setOrderFormData]);

  return {
    prescriptions,
    selectedPrescription,
    setSelectedPrescription,
    loadingPrescriptions,
    externalPrescriptionData,
    setExternalPrescriptionData,
    useExternalPrescription,
    setUseExternalPrescription,
    suggestLensFamily,
  };
}
