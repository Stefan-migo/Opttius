"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { type QuoteSettings,quoteSettingsService } from "@/lib/api/services/quoteSettingsService";

import type { ContactLensOrderConfig } from "./ContactLensSelector";
import { DEFAULT_LENS_FAMILIES, DEFAULT_TREATMENTS } from "./POSAdvancedSale.constants";
import type { OrderFormData, POSAdvancedSaleProps, Treatment } from "./POSAdvancedSale.types";
import { buildCartItems, type CartBuilderInput } from "./posCartBuilder";
import { handleCreateQuoteAction, loadSettingsAction } from "./posDataLoader";
import { filterTreatmentsByLensType,updateTreatmentPrice as updateTreatmentPricePure } from "./posPricingUtils";
import { usePOSAdvancedFrame } from "./usePOSAdvancedFrame";
import { usePOSAdvancedPrescription } from "./usePOSAdvancedPrescription";
import { usePOSAdvancedPricing } from "./usePOSAdvancedPricing";

export function usePOSAdvancedSale({
  customer,
  onCustomerChange,
  onAddToCart,
  branchId,
  selectedQuote,
  quickCustomerName,
  quickCustomerRUT,
  quickCustomerEmail,
  quickCustomerPhone,
}: POSAdvancedSaleProps) {
  const [orderFormTab, setOrderFormTab] = useState<
    "customer" | "frame" | "lenses" | "pricing"
  >("customer");


  const [orderFormData, setOrderFormData] = useState<OrderFormData>({
    lens_family_id: null,
    lens_family_name: null,
    near_lens_family_id: null,
    near_lens_family_name: null,
    lens_type: "vision",
    lens_sourcing_type: "surfaced",
    presbyopia_solution: "single",
    treatment_ids: [],
    labor_cost: 0,
    frame_name: "",
    frame_sku: "",
    near_frame_name: "",
    near_frame_sku: "",
    customer_own_frame: false,
    notes: "",
  });

  const lensFamilies = DEFAULT_LENS_FAMILIES;
  const [treatments, setTreatments] = useState<Treatment[]>(DEFAULT_TREATMENTS);
  const [quoteSettings, setQuoteSettings] = useState<QuoteSettings | null>(null);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [contactLensConfig, setContactLensConfig] =
    useState<ContactLensOrderConfig | null>(null);



  const frame = usePOSAdvancedFrame({ branchId });
  const prescription = usePOSAdvancedPrescription({
    customerId: customer?.id,
    quickCustomerName,
    quickCustomerRUT,
    orderFormData,
    setOrderFormData,
  });
  const pricing = usePOSAdvancedPricing({
    orderFormData,
    treatments,
    lensFamilies,
    selectedFrame: frame.selectedFrame,
  });

  useEffect(() => {
    loadSettingsAction(
      quoteSettingsService,
      setQuoteSettings,
      (updater) => setTreatments((prev) => updater(prev)),
      (cost) => setOrderFormData((prev) => ({ ...prev, labor_cost: cost })),
    );
  }, []);

  useEffect(() => {
    if (selectedQuote) {
      setOrderFormData((prev) => ({
        ...prev,
        labor_cost: selectedQuote.labor_cost || prev.labor_cost,
      }));
      if (selectedQuote.lens_type) {
        setOrderFormData((prev) => ({
          ...prev,
          lens_type:
            selectedQuote.lens_type === "contact" ? "contact" : "vision",
        }));
      }
    }
  }, [selectedQuote]);

  // ── Handlers ──
  const handleCreateQuote = async () => {
    await handleCreateQuoteAction(
      {
        customer,
        quickCustomerName,
        quickCustomerRUT,
        quickCustomerEmail,
        quickCustomerPhone,
        branchId,
        selectedPrescription: prescription.selectedPrescription,
        selectedFrame: frame.selectedFrame,
        selectedNearFrame: frame.selectedNearFrame,
        orderFormData,
        customerOwnNearFrame: frame.customerOwnNearFrame,
        lensPrice: pricing.lensPrice,
        treatmentsPrice: pricing.treatmentsPrice,
        totalPrice: pricing.totalPrice,
        discountAmount: pricing.discountAmount,
      },
      { setCreatingQuote, onCustomerChange },
    );
  };

  const handleUpdateTreatmentPrice = useCallback(
    (treatmentId: string, newPrice: number) => {
      setTreatments((prev) =>
        updateTreatmentPricePure(prev, treatmentId, newPrice),
      );
    },
    [],
  );

  const filteredTreatments = useMemo(
    () =>
      filterTreatmentsByLensType(treatments, orderFormData.lens_type as "vision" | "contact"),
    [treatments, orderFormData.lens_type],
  );

  const toggleTreatment = useCallback(
    (treatmentId: string) => {
      setOrderFormData((prev) => ({
        ...prev,
        treatment_ids: prev.treatment_ids.includes(treatmentId)
          ? prev.treatment_ids.filter((id) => id !== treatmentId)
          : [...prev.treatment_ids, treatmentId],
      }));
    },
    [],
  );

  const handleAddToCart = useCallback(() => {
    const currentLensPrice = pricing.lensPrice();

    const items = buildCartItems({
      orderFormData,
      selectedFrame: frame.selectedFrame,
      selectedNearFrame: frame.selectedNearFrame,
      customerOwnNearFrame: frame.customerOwnNearFrame,
      lensFamilies,
      treatments,
      currentLensPrice,
      treatmentsPrice: pricing.treatmentsPrice,
      contactLensConfig: contactLensConfig as CartBuilderInput["contactLensConfig"],
      useExternalPrescription: prescription.useExternalPrescription,
      externalPrescriptionData: prescription.externalPrescriptionData,
    });

    if (items.length === 0) {
      toast.warning("Seleccione al menos un producto (armazón o lentes)");
      return;
    }

    onAddToCart(items);
    toast.success("Productos agregados al carrito");

    // Reset form
    frame.setSelectedFrame(null);
    frame.setFrameSearchTerm("");
    frame.setSelectedNearFrame(null);
    frame.setNearFrameSearchTerm("");
    frame.setCustomerOwnNearFrame(false);
    setOrderFormData({
      lens_family_id: null,
      lens_family_name: null,
      near_lens_family_id: null,
      near_lens_family_name: null,
      lens_type: "vision",
      lens_sourcing_type: "surfaced",
      presbyopia_solution: "single",
      treatment_ids: [],
      labor_cost: 0,
      frame_name: "",
      frame_sku: "",
      near_frame_name: "",
      near_frame_sku: "",
      customer_own_frame: false,
      notes: "",
    });
    prescription.setUseExternalPrescription(false);
    prescription.setExternalPrescriptionData({
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
  }, [
    orderFormData,
    frame.selectedFrame,
    frame.selectedNearFrame,
    frame.customerOwnNearFrame,
    frame.setSelectedFrame,
    frame.setFrameSearchTerm,
    frame.setSelectedNearFrame,
    frame.setNearFrameSearchTerm,
    frame.setCustomerOwnNearFrame,
    lensFamilies,
    treatments,
    pricing.lensPrice,
    pricing.treatmentsPrice,
    contactLensConfig,
    prescription.useExternalPrescription,
    prescription.externalPrescriptionData,
    prescription.setUseExternalPrescription,
    prescription.setExternalPrescriptionData,
    onAddToCart,
  ]);

  return {
    orderFormTab, setOrderFormTab,
    ...frame,
    lensFamilies, treatments, setTreatments, quoteSettings,
    ...prescription,
    discountType: pricing.discountType, setDiscountType: pricing.setDiscountType,
    discountValue: pricing.discountValue, setDiscountValue: pricing.setDiscountValue,
    treatmentsPrice: pricing.treatmentsPrice, lensPriceValue: pricing.lensPriceValue,
    nearLensPriceValue: pricing.nearLensPriceValue, lensPrice: pricing.lensPrice,
    totalPrice: pricing.totalPrice, discountAmount: pricing.discountAmount,
    handleUpdateTreatmentPrice, filteredTreatments,
    orderFormData, setOrderFormData,
    creatingQuote, contactLensConfig, setContactLensConfig,
    toggleTreatment, handleCreateQuote, handleAddToCart,
  };
}
