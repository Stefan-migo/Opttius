import { useState, useEffect } from "react";
import { useBranch } from "@/hooks/useBranch";
import { getTaxPercentage } from "@/lib/utils/tax-config";
import {
  QuoteFormData,
  QuoteSettings,
  PresbyopiaSolution,
} from "../types/quote.types";

const DEFAULT_FORM_DATA: QuoteFormData = {
  // Frame fields
  frame_name: "",
  frame_brand: "",
  frame_model: "",
  frame_color: "",
  frame_size: "",
  frame_sku: "",
  frame_price: 0,
  frame_price_includes_tax: false,
  customer_own_frame: false,

  // Lens fields
  lens_family_id: "",
  lens_type: "",
  lens_material: "",
  lens_index: null,
  lens_treatments: [],
  lens_tint_color: "",
  lens_tint_percentage: 0,

  // Cost fields
  frame_cost: 0,
  lens_cost: 0,
  treatments_cost: 0,
  labor_cost: 0,
  subtotal: 0,
  tax_amount: 0,
  discount_amount: 0,
  discount_percentage: 0,
  total_amount: 0,

  // Other fields
  notes: "",
  customer_notes: "",
  expiration_days: 30,
  presbyopia_solution: "none",

  // Progressive/Bifocal fields
  far_lens_family_id: "",
  near_lens_family_id: "",
  far_lens_cost: 0,
  near_lens_cost: 0,

  // Contact lens fields
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

  // Near frame fields
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
  customer_own_near_frame: false,
};

export function useQuoteForm(
  initialCustomerId?: string,
  initialPrescriptionId?: string,
) {
  const { currentBranchId } = useBranch();

  // Form state
  const [formData, setFormData] = useState<QuoteFormData>(DEFAULT_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings
  const [quoteSettings, setQuoteSettings] = useState<QuoteSettings | null>(
    null,
  );
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [taxPercentage, setTaxPercentage] = useState<number>(19.0);

  // Presbyopia solution
  const [presbyopiaSolution, setPresbyopiaSolution] =
    useState<PresbyopiaSolution>("none");

  // Lens type toggle
  const [lensType, setLensType] = useState<"optical" | "contact">("optical");

  // Discount type
  const [discountType, setDiscountType] = useState<"percentage" | "amount">(
    "amount",
  );

  // Fetch quote settings
  const fetchQuoteSettings = async () => {
    try {
      setLoadingSettings(true);
      const response = await fetch(
        `/api/admin/quote-settings?branch_id=${currentBranchId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setQuoteSettings(data.settings || {});

        // Apply default values
        setFormData((prev) => ({
          ...prev,
          expiration_days: data.settings?.default_expiration_days || 30,
          labor_cost: data.settings?.default_labor_cost || 0,
        }));
      }
    } catch (error) {
      console.error("Error fetching quote settings:", error);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Initialize form with default settings
  useEffect(() => {
    if (currentBranchId) {
      fetchQuoteSettings();
      getTaxPercentage(19.0).then(setTaxPercentage);
    }
  }, [currentBranchId]);

  // Handle settings updates from other tabs
  useEffect(() => {
    const handleSettingsUpdate = () => {
      fetchQuoteSettings();
    };

    window.addEventListener("quote-settings-updated", handleSettingsUpdate);

    const checkStorage = setInterval(() => {
      const lastUpdate = localStorage.getItem("quote-settings-updated");
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate, 10);
        const now = Date.now();
        if (now - updateTime < 2000) {
          handleSettingsUpdate();
          localStorage.removeItem("quote-settings-updated");
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener(
        "quote-settings-updated",
        handleSettingsUpdate,
      );
      clearInterval(checkStorage);
    };
  }, [currentBranchId]);

  // Periodic settings refresh
  useEffect(() => {
    if (!loadingSettings) {
      const interval = setInterval(fetchQuoteSettings, 30000);
      return () => clearInterval(interval);
    }
  }, [currentBranchId, loadingSettings]);

  // Update form field
  const updateField = <K extends keyof QuoteFormData>(
    field: K,
    value: QuoteFormData[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Update multiple fields
  const updateFields = (fields: Partial<QuoteFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...fields,
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setPresbyopiaSolution("none");
    setLensType("optical");
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal =
      formData.frame_price +
      formData.lens_cost +
      formData.treatments_cost +
      formData.labor_cost;
    const taxAmount = subtotal * (taxPercentage / 100);
    const discountAmount =
      discountType === "percentage"
        ? subtotal * (formData.discount_percentage / 100)
        : formData.discount_amount;
    const totalAmount = subtotal + taxAmount - discountAmount;

    setFormData((prev) => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
    }));
  };

  // Debounced calculation effect
  useEffect(() => {
    const timer = setTimeout(calculateTotals, 500);
    return () => clearTimeout(timer);
  }, [
    formData.frame_price,
    formData.lens_cost,
    formData.treatments_cost,
    formData.labor_cost,
    formData.discount_amount,
    formData.discount_percentage,
    taxPercentage,
    discountType,
  ]);

  return {
    // State
    formData,
    loading,
    saving,
    quoteSettings,
    loadingSettings,
    taxPercentage,
    presbyopiaSolution,
    lensType,
    discountType,

    // Actions
    updateField,
    updateFields,
    resetForm,
    setSaving,
    setLoading,
    setPresbyopiaSolution,
    setLensType,
    setDiscountType,
    setTaxPercentage,

    // Helpers
    calculateTotals,
  };
}
