"use client";

import { useEffect, useState } from "react";

import { calculatePriceWithTax } from "@/lib/utils/tax";
import { getTaxPercentage } from "@/lib/utils/tax-config";

import { DEFAULT_QUOTE_SETTINGS, roundCurrency } from "./CreateQuoteForm.constants";
import type { QuoteFormData, QuoteSettings } from "./CreateQuoteForm.types";
import { buildAvailableTreatments } from "./quotePricingUtils";

const DEFAULT_FORM_DATA: QuoteFormData = {
  frame_name: "",
  frame_brand: "",
  frame_model: "",
  frame_color: "",
  frame_size: "",
  frame_sku: "",
  frame_price: 0,
  frame_price_includes_tax: false,
  customer_own_frame: false,
  lens_family_id: "",
  lens_type: "",
  lens_material: "",
  lens_index: null,
  lens_treatments: [],
  lens_tint_color: "",
  lens_tint_percentage: 0,
  lens_sourcing_type: "surfaced",
  frame_cost: 0,
  lens_cost: 0,
  treatments_cost: 0,
  labor_cost: 0,
  subtotal: 0,
  tax_amount: 0,
  discount_amount: 0,
  discount_percentage: 0,
  total_amount: 0,
  notes: "",
  customer_notes: "",
  expiration_days: 30,
  presbyopia_solution: "none",
  far_lens_family_id: "",
  near_lens_family_id: "",
  far_lens_cost: 0,
  near_lens_cost: 0,
  contact_lens_family_id: "",
  contact_lens_rx_sphere_od: null,
  contact_lens_rx_cylinder_od: null,
  contact_lens_rx_axis_od: null,
  contact_lens_rx_add_od: null,
  contact_lens_rx_base_curve_od: null,
  contact_lens_rx_diameter_od: null,
  contact_lens_rx_sphere_os: null,
  contact_lens_rx_cylinder_os: null,
  contact_lens_rx_axis_os: null,
  contact_lens_rx_add_os: null,
  contact_lens_rx_base_curve_os: null,
  contact_lens_rx_diameter_os: null,
  contact_lens_quantity: 1,
  contact_lens_cost: 0,
  contact_lens_price: 0,
  near_frame_product_id: "",
  near_frame_name: "",
  near_frame_brand: "",
  near_frame_model: "",
  near_frame_color: "",
  near_frame_size: "",
  near_frame_sku: "",
  near_frame_price: 0,
  near_frame_price_includes_tax: false,
  near_frame_cost: 0,
};

export function useFormPricing(
  quoteSettings: unknown,
  lensType: "optical" | "contact",
  presbyopiaSolution: string,
  customerOwnFrame: boolean,
  customerOwnNearFrame: boolean,
) {
  const [discountType, setDiscountType] = useState<"percentage" | "amount">(
    "amount",
  );
  const [taxPercentage, setTaxPercentage] = useState<number>(19.0);

  // Form data
  const [formData, setFormData] = useState<QuoteFormData>(DEFAULT_FORM_DATA);

  // Initialize tax percentage
  useEffect(() => {
    getTaxPercentage(19.0).then(setTaxPercentage);
  }, []);

  const availableTreatments = buildAvailableTreatments(
    quoteSettings as QuoteSettings,
  );

  const handleTreatmentToggle = (treatment: {
    value: string;
    label: string;
    cost: number;
    enabled: boolean;
  }) => {
    const isSelected = formData.lens_treatments.includes(treatment.value);
    setFormData((prev) => ({
      ...prev,
      lens_treatments: isSelected
        ? prev.lens_treatments.filter((t) => t !== treatment.value)
        : [...prev.lens_treatments, treatment.value],
      treatments_cost: isSelected
        ? prev.treatments_cost - treatment.cost
        : prev.treatments_cost + treatment.cost,
    }));
  };

  // Calculate total
  const calculateTotal = () => {
    const effectiveTaxRate =
      (quoteSettings as QuoteSettings)?.default_tax_percentage || taxPercentage;
    const lensIncludesTax =
      lensType === "contact"
        ? true
        : ((quoteSettings as QuoteSettings)?.lens_cost_includes_tax ?? true);
    const treatmentsIncludeTax =
      (quoteSettings as QuoteSettings)?.treatments_cost_includes_tax ?? true;
    const laborIncludesTax =
      (quoteSettings as QuoteSettings)?.labor_cost_includes_tax ?? true;

    const framePriceForCalculation = customerOwnFrame
      ? 0
      : formData.frame_price || 0;
    const framePriceBreakdown = calculatePriceWithTax(
      framePriceForCalculation,
      formData.frame_price_includes_tax || false,
      effectiveTaxRate,
    );

    const nearFramePriceForCalculation =
      presbyopiaSolution === "two_separate" && !customerOwnNearFrame
        ? formData.near_frame_price || 0
        : 0;
    const nearFramePriceBreakdown = calculatePriceWithTax(
      nearFramePriceForCalculation,
      formData.near_frame_price_includes_tax || false,
      effectiveTaxRate,
    );

    const effectiveLensCost =
      lensType === "contact"
        ? formData.contact_lens_price || formData.contact_lens_cost || 0
        : presbyopiaSolution === "two_separate"
          ? (formData.far_lens_cost || 0) + (formData.near_lens_cost || 0)
          : formData.lens_cost || 0;

    const lensBreakdown = calculatePriceWithTax(
      effectiveLensCost,
      lensIncludesTax,
      effectiveTaxRate,
    );
    const treatmentsBreakdown = calculatePriceWithTax(
      formData.treatments_cost || 0,
      treatmentsIncludeTax,
      effectiveTaxRate,
    );
    const laborBreakdown = calculatePriceWithTax(
      formData.labor_cost || 0,
      laborIncludesTax,
      effectiveTaxRate,
    );

    const subtotal =
      framePriceBreakdown.subtotal +
      nearFramePriceBreakdown.subtotal +
      lensBreakdown.subtotal +
      treatmentsBreakdown.subtotal +
      laborBreakdown.subtotal;

    const taxFromItemsWithTax =
      framePriceBreakdown.tax +
      nearFramePriceBreakdown.tax +
      (lensIncludesTax ? lensBreakdown.tax : 0) +
      (treatmentsIncludeTax ? treatmentsBreakdown.tax : 0) +
      (laborIncludesTax ? laborBreakdown.tax : 0);

    const itemsWithoutTax =
      (lensIncludesTax ? 0 : lensBreakdown.subtotal) +
      (treatmentsIncludeTax ? 0 : treatmentsBreakdown.subtotal) +
      (laborIncludesTax ? 0 : laborBreakdown.subtotal) +
      (formData.frame_price_includes_tax ? 0 : framePriceBreakdown.subtotal) +
      (formData.near_frame_price_includes_tax
        ? 0
        : nearFramePriceBreakdown.subtotal);

    const taxOnItemsWithoutTax = itemsWithoutTax * (effectiveTaxRate / 100);
    const totalTax = taxFromItemsWithTax + taxOnItemsWithoutTax;
    const totalWithTax = subtotal + totalTax;

    let discount = 0;
    let discountPercentage = 0;
    if (discountType === "percentage") {
      discount = totalWithTax * (formData.discount_percentage / 100);
      discountPercentage = formData.discount_percentage;
    } else {
      discount = formData.discount_amount || 0;
      if (totalWithTax > 0)
        discountPercentage = (discount / totalWithTax) * 100;
    }
    if (discount > totalWithTax) {
      discount = totalWithTax;
      if (discountType === "amount") discountPercentage = 100;
    }

    const total = totalWithTax - discount;
    setFormData((prev) => ({
      ...prev,
      subtotal: roundCurrency(subtotal),
      discount_amount: roundCurrency(discount),
      discount_percentage: roundCurrency(discountPercentage),
      tax_amount: roundCurrency(totalTax),
      total_amount: roundCurrency(total),
    }));
  };

  // Recalculate total on any price change
  useEffect(() => {
    calculateTotal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.frame_price,
    formData.frame_price_includes_tax,
    formData.frame_cost,
    formData.near_frame_price,
    formData.near_frame_price_includes_tax,
    formData.near_frame_cost,
    formData.lens_cost,
    formData.contact_lens_cost,
    formData.contact_lens_price,
    formData.treatments_cost,
    formData.labor_cost,
    formData.discount_percentage,
    formData.discount_amount,
    discountType,
    quoteSettings,
    taxPercentage,
    lensType,
    presbyopiaSolution,
    customerOwnFrame,
    customerOwnNearFrame,
  ]);

  return {
    formData,
    setFormData,
    discountType,
    setDiscountType,
    taxPercentage,
    setTaxPercentage,
    availableTreatments,
    handleTreatmentToggle,
    calculateTotal,
  };
}
