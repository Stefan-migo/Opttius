/**
 * Custom hook extracted from CreateQuoteForm.tsx.
 * Manages all state, effects, and handlers for the quote creation form.
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useBranch } from "@/hooks/useBranch";
import { useLensPriceCalculation } from "@/hooks/useLensPriceCalculation";
import {
  contactLensFamilyService,
  contactLensMatrixService,
  customerService,
  lensFamilyService,
  productService,
  quoteService,
  quoteSettingsService,
} from "@/lib/api/services";
import {
  getCylinder,
  getDefaultPresbyopiaSolution,
  getFarSphere,
  getMaxAddition,
  getNearSphere,
  hasAddition,
  type PresbyopiaSolution,
} from "@/lib/presbyopia-helpers";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";
import { calculatePriceWithTax } from "@/lib/utils/tax";
import { getTaxPercentage } from "@/lib/utils/tax-config";

import type {
  CreateQuoteFormProps,
  QuoteFormData,
  QuoteSettings,
} from "./CreateQuoteForm.types";
import {
  MATERIAL_INDICES,
  DEFAULT_QUOTE_SETTINGS,
  formatPrice,
  roundCurrency,
} from "./CreateQuoteForm.constants";
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

export interface UseCreateQuoteFormReturn {
  // State
  loading: boolean;
  saving: boolean;
  discountType: "percentage" | "amount";
  quoteSettings: unknown;
  loadingSettings: boolean;
  customerSearch: string;
  customerResults: unknown[];
  selectedCustomer: unknown;
  searchingCustomers: boolean;
  prescriptions: unknown[];
  selectedPrescription: unknown;
  loadingPrescriptions: boolean;
  showCreatePrescription: boolean;
  frameSearch: string;
  frameResults: unknown[];
  selectedFrame: unknown;
  searchingFrames: boolean;
  nearFrameSearch: string;
  nearFrameResults: unknown[];
  selectedNearFrame: unknown;
  searchingNearFrames: boolean;
  taxPercentage: number;
  customerOwnFrame: boolean;
  customerOwnNearFrame: boolean;
  manualLensPrice: boolean;
  lensFamilies: unknown[];
  loadingFamilies: boolean;
  contactLensFamilies: unknown[];
  loadingContactLensFamilies: boolean;
  lensType: "optical" | "contact";
  calculatingContactLensPrice: boolean;
  presbyopiaSolution: PresbyopiaSolution;
  farLensFamilyId: string;
  nearLensFamilyId: string;
  farLensCost: number;
  nearLensCost: number;
  formData: QuoteFormData;

  // Brand context
  effectiveBranchId: string | undefined;

  // Computed
  availableTreatments: {
    value: string;
    label: string;
    cost: number;
    enabled: boolean;
  }[];
  calculatingPrice: boolean;

  // Setters
  setCustomerSearch: (v: string) => void;
  setSelectedCustomer: (v: unknown) => void;
  setSelectedPrescription: (v: unknown) => void;
  setShowCreatePrescription: (v: boolean) => void;
  setFrameSearch: (v: string) => void;
  setSelectedFrame: (v: unknown) => void;
  setNearFrameSearch: (v: string) => void;
  setSelectedNearFrame: (v: unknown) => void;
  setCustomerOwnFrame: (v: boolean) => void;
  setCustomerOwnNearFrame: (v: boolean) => void;
  setManualLensPrice: (v: boolean) => void;
  setLensType: (v: "optical" | "contact") => void;
  setPresbyopiaSolution: (v: PresbyopiaSolution) => void;
  setFarLensFamilyId: (v: string) => void;
  setNearLensFamilyId: (v: string) => void;
  setDiscountType: (v: "percentage" | "amount") => void;
  setFormData: React.Dispatch<React.SetStateAction<QuoteFormData>>;

  // Handlers
  handleTreatmentToggle: (treatment: {
    value: string;
    label: string;
    cost: number;
    enabled: boolean;
  }) => void;
  handleFrameSelect: (frame: unknown) => void;
  handleNearFrameSelect: (frame: unknown) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  calculateTotal: () => void;
  fetchPrescriptions: (customerId: string) => Promise<void>;
}

export function useCreateQuoteForm(
  props: CreateQuoteFormProps,
): UseCreateQuoteFormReturn {
  const {
    onSuccess,
    initialCustomerId,
    initialPrescriptionId,
    initialFieldOperationId,
    initialBranchId,
  } = props;

  // Branch context: use operativo branch when in operativo context
  const { currentBranchId } = useBranch();
  const effectiveBranchId =
    initialFieldOperationId && initialBranchId
      ? initialBranchId
      : (currentBranchId ?? undefined);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "amount">(
    "amount",
  );
  const [quoteSettings, setQuoteSettings] = useState<unknown>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<unknown[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<unknown>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Prescription selection
  const [prescriptions, setPrescriptions] = useState<unknown[]>([]);
  const [selectedPrescription, setSelectedPrescription] =
    useState<unknown>(null);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);

  // Frame selection
  const [frameSearch, setFrameSearch] = useState("");
  const [frameResults, setFrameResults] = useState<unknown[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<unknown>(null);
  const [searchingFrames, setSearchingFrames] = useState(false);

  // Second frame for two separate lenses (near vision)
  const [nearFrameSearch, setNearFrameSearch] = useState("");
  const [nearFrameResults, setNearFrameResults] = useState<unknown[]>([]);
  const [selectedNearFrame, setSelectedNearFrame] = useState<unknown>(null);
  const [searchingNearFrames, setSearchingNearFrames] = useState(false);
  const [taxPercentage, setTaxPercentage] = useState<number>(19.0);
  const [customerOwnFrame, setCustomerOwnFrame] = useState<boolean>(false);
  const [customerOwnNearFrame, setCustomerOwnNearFrame] =
    useState<boolean>(false);
  const [manualLensPrice, setManualLensPrice] = useState<boolean>(false);

  // Lens families and price calculation
  const [lensFamilies, setLensFamilies] = useState<unknown[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const { calculateLensPrice, loading: calculatingPrice } =
    useLensPriceCalculation();

  // Contact lens families and price calculation
  const [contactLensFamilies, setContactLensFamilies] = useState<unknown[]>([]);
  const [loadingContactLensFamilies, setLoadingContactLensFamilies] =
    useState(false);
  const [lensType, setLensType] = useState<"optical" | "contact">("optical");
  const [calculatingContactLensPrice, setCalculatingContactLensPrice] =
    useState(false);

  // Presbyopia solution
  const [presbyopiaSolution, setPresbyopiaSolution] =
    useState<PresbyopiaSolution>("none");
  const [farLensFamilyId, setFarLensFamilyId] = useState<string>("");
  const [nearLensFamilyId, setNearLensFamilyId] = useState<string>("");
  const [farLensCost, setFarLensCost] = useState<number>(0);
  const [nearLensCost, setNearLensCost] = useState<number>(0);

  // Form data
  const [formData, setFormData] = useState<QuoteFormData>(DEFAULT_FORM_DATA);

  // Fetch quote settings on mount and when branch changes
  const fetchQuoteSettings = async () => {
    try {
      setLoadingSettings(true);
      const settings = await quoteSettingsService.get();
      const newSettings = settings ? ({ ...settings } as unknown) : null;
      setQuoteSettings(newSettings);
      if (newSettings) {
        setFormData((prev) => ({
          ...prev,
          labor_cost:
            (newSettings as QuoteSettings).default_labor_cost ?? 15000,
          expiration_days:
            (newSettings as QuoteSettings).validity_days ??
            (newSettings as QuoteSettings).default_expiration_days ??
            30,
        }));
      }
    } catch {
      console.error("Error fetching quote settings");
      setQuoteSettings(DEFAULT_QUOTE_SETTINGS);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchQuoteSettings();
    getTaxPercentage(19.0).then(setTaxPercentage);
    fetchLensFamilies();
    fetchContactLensFamilies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranchId]);

  const fetchLensFamilies = async () => {
    try {
      setLoadingFamilies(true);
      const families = await lensFamilyService.getAll();
      setLensFamilies(families || []);
    } catch (error) {
      console.error("Error fetching lens families:", error);
    } finally {
      setLoadingFamilies(false);
    }
  };

  const fetchContactLensFamilies = async () => {
    try {
      setLoadingContactLensFamilies(true);
      const families = await contactLensFamilyService.getAll();
      setContactLensFamilies(families || []);
    } catch (error) {
      console.error("Error fetching contact lens families:", error);
    } finally {
      setLoadingContactLensFamilies(false);
    }
  };

  // Listen for settings updates from other tabs/windows
  useEffect(() => {
    const handleSettingsUpdate = () => {
      fetchQuoteSettings();
      toast.info("Configuración actualizada", {
        description: "Los valores por defecto se han actualizado",
        duration: 3000,
      });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranchId]);

  // Periodic settings refresh fallback
  useEffect(() => {
    if (!loadingSettings) {
      const interval = setInterval(() => {
        fetchQuoteSettings();
      }, 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranchId, loadingSettings]);

  // Lens family inheritance
  useEffect(() => {
    if (!formData.lens_family_id) return;
    const family = lensFamilies.find(
      (f: any) => f.id === formData.lens_family_id,
    );
    if (!family) return;
    const materialIndex = family.lens_material
      ? MATERIAL_INDICES[
          family.lens_material as keyof typeof MATERIAL_INDICES
        ] || null
      : null;

    setFormData((prev) => ({
      ...prev,
      lens_type: family.lens_type || prev.lens_type,
      lens_material: family.lens_material || prev.lens_material,
      lens_index: materialIndex !== null ? materialIndex : prev.lens_index,
      lens_treatments: [],
      treatments_cost: 0,
    }));
  }, [formData.lens_family_id, lensFamilies]);

  // Calculate lens price from matrix
  const calculateLensPriceFromMatrix = async () => {
    if (!formData.lens_family_id || !selectedPrescription) return;
    if (presbyopiaSolution === "two_separate") return;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formData.lens_family_id)) return;

    const farSphere = getFarSphere(selectedPrescription as any);
    const cylinder = getCylinder(selectedPrescription as any);
    let addition: number | undefined;
    if (["progressive", "bifocal", "trifocal"].includes(presbyopiaSolution)) {
      addition = getMaxAddition(selectedPrescription as any);
    }

    try {
      await fetch(
        `/api/admin/lens-matrices/debug?lens_family_id=${formData.lens_family_id}&sphere=${farSphere}&cylinder=${cylinder}`,
      );
      const result = await calculateLensPrice({
        lens_family_id: formData.lens_family_id,
        sphere: farSphere,
        cylinder,
        addition,
      });
      if (result && result.price) {
        setFormData((prev) => ({ ...prev, lens_cost: result.price }));
      }
    } catch {
      // Silently fail — manual price entry available
    }
  };

  // Calculate contact lens price from matrix
  const calculateContactLensPriceFromMatrix = async () => {
    if (!formData.contact_lens_family_id || !selectedPrescription) return;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formData.contact_lens_family_id)) return;

    try {
      setCalculatingContactLensPrice(true);
      const sphereOD = (selectedPrescription as any).od_sphere || 0;
      const cylinderOD = (selectedPrescription as any).od_cylinder || 0;
      const axisOD = (selectedPrescription as any).od_axis || null;
      const additionOD = (selectedPrescription as any).od_add || null;

      const calculation = await contactLensMatrixService.calculate(
        formData.contact_lens_family_id,
        sphereOD,
        cylinderOD,
        axisOD,
        additionOD,
      );
      if (calculation && calculation.price) {
        const quantity = formData.contact_lens_quantity || 1;
        setFormData((prev) => ({
          ...prev,
          contact_lens_price: calculation.price * quantity,
          contact_lens_cost: calculation.cost * quantity,
        }));
      }
    } catch {
      toast.error("No se pudo calcular el precio del lente de contacto");
    } finally {
      setCalculatingContactLensPrice(false);
    }
  };

  // Detect presbyopia and set default solution
  useEffect(() => {
    if (selectedPrescription) {
      const hasAdd = hasAddition(selectedPrescription as any);
      if (hasAdd && presbyopiaSolution === "none") {
        const defaultSolution = getDefaultPresbyopiaSolution(
          selectedPrescription as any,
        );
        setPresbyopiaSolution(defaultSolution);
        setFormData((prev) => ({
          ...prev,
          presbyopia_solution: defaultSolution,
        }));
        if (["progressive", "bifocal", "trifocal"].includes(defaultSolution)) {
          setFormData((prev) => ({ ...prev, lens_type: defaultSolution }));
        }
      } else if (!hasAdd) {
        setPresbyopiaSolution("none");
        setFormData((prev) => ({ ...prev, presbyopia_solution: "none" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrescription]);

  // Sync quote settings to formData
  useEffect(() => {
    if (quoteSettings) {
      const s = quoteSettings as QuoteSettings;
      const newLaborCost = s.default_labor_cost ?? 15000;
      const newExpirationDays = s.default_expiration_days ?? 30;
      setFormData((prev) => {
        const updates: Partial<QuoteFormData> = {};
        if (prev.labor_cost !== newLaborCost) updates.labor_cost = newLaborCost;
        if (prev.expiration_days !== newExpirationDays)
          updates.expiration_days = newExpirationDays;
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    }
  }, [
    (quoteSettings as QuoteSettings)?.default_labor_cost,
    (quoteSettings as QuoteSettings)?.default_expiration_days,
  ]);

  // Recalculate lens price when params change
  useEffect(() => {
    if (formData.lens_family_id && selectedPrescription) {
      const timer = setTimeout(() => {
        calculateLensPriceFromMatrix();
      }, 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.lens_family_id,
    (selectedPrescription as any)?.id,
    presbyopiaSolution,
  ]);

  // Recalculate contact lens price
  useEffect(() => {
    if (
      formData.contact_lens_family_id &&
      selectedPrescription &&
      lensType === "contact"
    ) {
      const timer = setTimeout(() => {
        calculateContactLensPriceFromMatrix();
      }, 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.contact_lens_family_id,
    formData.contact_lens_quantity,
    (selectedPrescription as any)?.id,
    lensType,
  ]);

  // Calculate prices for two separate lenses
  useEffect(() => {
    if (presbyopiaSolution === "two_separate" && selectedPrescription) {
      const calculateTwoLenses = async () => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (farLensFamilyId && uuidRegex.test(farLensFamilyId)) {
          const farSphere = getFarSphere(selectedPrescription as any);
          const cylinder = getCylinder(selectedPrescription as any);
          try {
            const result = await calculateLensPrice({
              lens_family_id: farLensFamilyId,
              sphere: farSphere,
              cylinder,
            });
            if (result && result.price) {
              setFarLensCost(result.price);
              setFormData((prev) => ({ ...prev, far_lens_cost: result.price }));
            }
          } catch {
            /* silent */
          }
        }

        if (nearLensFamilyId && uuidRegex.test(nearLensFamilyId)) {
          const nearSphere = getNearSphere(selectedPrescription as any);
          const cylinder = getCylinder(selectedPrescription as any);
          try {
            const result = await calculateLensPrice({
              lens_family_id: nearLensFamilyId,
              sphere: nearSphere,
              cylinder,
            });
            if (result && result.price) {
              setNearLensCost(result.price);
              setFormData((prev) => ({
                ...prev,
                near_lens_cost: result.price,
              }));
            }
          } catch {
            /* silent */
          }
        }

        const totalLensCost = (farLensCost || 0) + (nearLensCost || 0);
        setFormData((prev) => ({ ...prev, lens_cost: totalLensCost }));
      };
      calculateTwoLenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    farLensFamilyId,
    nearLensFamilyId,
    selectedPrescription,
    presbyopiaSolution,
  ]);

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

  const handleFrameSelect = (frame: any) => {
    setSelectedFrame(frame);
    setFormData((prev) => ({
      ...prev,
      frame_product_id: frame.id,
      frame_name: frame.name,
      frame_brand: frame.frame_brand || "",
      frame_model: frame.frame_model || "",
      frame_color: frame.frame_color || "",
      frame_size: frame.frame_size || "",
      frame_sku: frame.sku || "",
      frame_price: frame.price || 0,
      frame_price_includes_tax: frame.price_includes_tax || false,
      frame_cost: frame.price || 0,
    }));
    setFrameSearch("");
    setFrameResults([]);
  };

  const handleNearFrameSelect = (frame: any) => {
    setSelectedNearFrame(frame);
    const nearFrameCost = frame.price || 0;
    setFormData((prev) => ({
      ...prev,
      near_frame_product_id: frame.id,
      near_frame_name: frame.name,
      near_frame_brand: frame.frame_brand || "",
      near_frame_model: frame.frame_model || "",
      near_frame_color: frame.frame_color || "",
      near_frame_size: frame.frame_size || "",
      near_frame_sku: frame.sku || "",
      near_frame_price: frame.price || 0,
      near_frame_price_includes_tax: frame.price_includes_tax || false,
      near_frame_cost: nearFrameCost,
    }));
    setNearFrameSearch("");
    setNearFrameResults([]);
  };

  // Load initial customer
  useEffect(() => {
    if (
      initialCustomerId &&
      (!selectedCustomer || (selectedCustomer as any).id !== initialCustomerId)
    ) {
      fetchCustomer(initialCustomerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomerId]);

  const fetchCustomer = async (customerId: string) => {
    try {
      const customer = await customerService.getCustomer(customerId);
      setSelectedCustomer(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  // Load prescriptions when customer is selected
  const fetchPrescriptionsAction = async (customerId: string) => {
    try {
      setLoadingPrescriptions(true);
      const result = await customerService.getPrescriptions(customerId);
      setPrescriptions(result);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  useEffect(() => {
    if ((selectedCustomer as any)?.id) {
      fetchPrescriptionsAction((selectedCustomer as any).id);
    }
  }, [selectedCustomer]);

  // Load prescription if initialPrescriptionId provided
  useEffect(() => {
    if (initialPrescriptionId && prescriptions.length > 0) {
      const prescription = prescriptions.find(
        (p: any) => p.id === initialPrescriptionId,
      );
      if (prescription) setSelectedPrescription(prescription);
    }
  }, [initialPrescriptionId, prescriptions]);

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomerResults([]);
        return;
      }
      setSearchingCustomers(true);
      try {
        const customers = await customerService.searchCustomers(
          customerSearch,
          effectiveBranchId,
          initialFieldOperationId,
        );
        setCustomerResults(customers || []);
      } catch (error) {
        console.error("Error searching customers:", error);
      } finally {
        setSearchingCustomers(false);
      }
    };
    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch, effectiveBranchId, initialFieldOperationId]);

  // Search frames
  useEffect(() => {
    const searchFrames = async () => {
      if (frameSearch.length < 2) {
        setFrameResults([]);
        return;
      }
      setSearchingFrames(true);
      try {
        const frames = await productService.searchProducts(
          frameSearch,
          effectiveBranchId,
          "frame",
          initialFieldOperationId,
        );
        setFrameResults(frames || []);
      } catch (error) {
        console.error("Error searching frames:", error);
      } finally {
        setSearchingFrames(false);
      }
    };
    const debounce = setTimeout(searchFrames, 300);
    return () => clearTimeout(debounce);
  }, [frameSearch, effectiveBranchId, initialFieldOperationId]);

  // Search near frames
  useEffect(() => {
    const searchNearFrames = async () => {
      if (nearFrameSearch.length < 2) {
        setNearFrameResults([]);
        return;
      }
      setSearchingNearFrames(true);
      try {
        const results = await productService.searchProducts(
          nearFrameSearch,
          effectiveBranchId,
          "frame",
          initialFieldOperationId,
        );
        setNearFrameResults(results || []);
      } catch (error) {
        console.error("Error searching near frames:", error);
      } finally {
        setSearchingNearFrames(false);
      }
    };
    const debounce = setTimeout(searchNearFrames, 300);
    return () => clearTimeout(debounce);
  }, [nearFrameSearch, effectiveBranchId, initialFieldOperationId]);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (!selectedPrescription) {
      toast.error("Selecciona una receta");
      return;
    }

    if (lensType === "contact") {
      if (
        !formData.contact_lens_family_id &&
        formData.contact_lens_cost === 0
      ) {
        toast.error(
          "Selecciona una familia de lentes de contacto o ingresa el precio manualmente",
        );
        return;
      }
    } else {
      if (presbyopiaSolution === "two_separate") {
        if (!farLensFamilyId && !nearLensFamilyId && formData.lens_cost === 0) {
          toast.error(
            "Selecciona familias de lentes o ingresa el precio manualmente",
          );
          return;
        }
      } else if (!formData.lens_family_id && formData.lens_cost === 0) {
        toast.error(
          "Selecciona una familia de lentes o ingresa el precio manualmente",
        );
        return;
      }
    }

    setSaving(true);
    try {
      const expirationDate = new Date();
      expirationDate.setDate(
        expirationDate.getDate() + formData.expiration_days,
      );

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchAndOperativoHeaders(
          effectiveBranchId ?? null,
          initialFieldOperationId,
        ),
      };

      const nearFrameDataPayload =
        presbyopiaSolution === "two_separate"
          ? {
              near_frame_product_id: (selectedNearFrame as any)?.id || null,
              near_frame_name:
                formData.near_frame_name ||
                (selectedNearFrame as any)?.name ||
                null,
              near_frame_brand:
                formData.near_frame_brand ||
                (selectedNearFrame as any)?.frame_brand ||
                null,
              near_frame_model:
                formData.near_frame_model ||
                (selectedNearFrame as any)?.frame_model ||
                null,
              near_frame_color:
                formData.near_frame_color ||
                (selectedNearFrame as any)?.frame_color ||
                null,
              near_frame_size:
                formData.near_frame_size ||
                (selectedNearFrame as any)?.frame_size ||
                null,
              near_frame_sku:
                formData.near_frame_sku ||
                (selectedNearFrame as any)?.sku ||
                null,
              near_frame_price:
                formData.near_frame_price ||
                (selectedNearFrame as any)?.price ||
                0,
              near_frame_price_includes_tax:
                formData.near_frame_price_includes_tax ??
                (selectedNearFrame as any)?.price_includes_tax ??
                false,
              near_frame_cost:
                formData.near_frame_cost ||
                (selectedNearFrame as any)?.price ||
                0,
              customer_own_near_frame: customerOwnNearFrame || false,
            }
          : {
              near_frame_product_id: null,
              near_frame_name: null,
              near_frame_brand: null,
              near_frame_model: null,
              near_frame_color: null,
              near_frame_size: null,
              near_frame_sku: null,
              near_frame_price: 0,
              near_frame_price_includes_tax: false,
              near_frame_cost: 0,
              customer_own_near_frame: false,
            };

      await quoteService.createQuote({
        customer_id: (selectedCustomer as any).id,
        status: "draft",
        subtotal: formData.subtotal,
        tax_amount: formData.tax_amount,
        discount_amount: formData.discount_amount,
        total_amount: formData.total_amount,
        valid_until: expirationDate.toISOString().split("T")[0],
        notes: formData.notes,
        branch_id: effectiveBranchId || undefined,
        field_operation_id: initialFieldOperationId || undefined,
        prescription_id: (selectedPrescription as any).id,
        frame_product_id: (selectedFrame as any)?.id,
        customer_own_frame: customerOwnFrame,
        frame_name: formData.frame_name,
        frame_brand: formData.frame_brand,
        frame_model: formData.frame_model,
        frame_color: formData.frame_color,
        frame_size: formData.frame_size,
        frame_sku: formData.frame_sku,
        frame_price: formData.frame_price,
        ...nearFrameDataPayload,
        lens_family_id:
          presbyopiaSolution === "two_separate"
            ? null
            : formData.lens_family_id || null,
        lens_type:
          lensType === "contact"
            ? "Lentes de contacto"
            : formData.lens_type || null,
        lens_material: formData.lens_material || null,
        lens_index:
          formData.lens_index !== null && formData.lens_index !== undefined
            ? formData.lens_index
            : null,
        lens_treatments: lensType === "contact" ? [] : formData.lens_treatments,
        lens_tint_color: formData.lens_tint_color || null,
        lens_tint_percentage: formData.lens_tint_percentage || null,
        lens_sourcing_type: formData.lens_sourcing_type || "surfaced",
        presbyopia_solution: formData.presbyopia_solution || "none",
        far_lens_family_id:
          presbyopiaSolution === "two_separate"
            ? farLensFamilyId || null
            : null,
        near_lens_family_id:
          presbyopiaSolution === "two_separate"
            ? nearLensFamilyId || null
            : null,
        far_lens_cost:
          presbyopiaSolution === "two_separate" ? farLensCost || 0 : undefined,
        near_lens_cost:
          presbyopiaSolution === "two_separate" ? nearLensCost || 0 : undefined,
        contact_lens_family_id:
          lensType === "contact"
            ? formData.contact_lens_family_id || null
            : null,
        contact_lens_rx_sphere_od:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as any).od_sphere ?? null)
            : null,
        contact_lens_rx_cylinder_od:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as any).od_cylinder ?? null)
            : null,
        contact_lens_rx_axis_od:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as any).od_axis ?? null)
            : null,
        contact_lens_rx_add_od:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as any).od_add ?? null)
            : null,
        contact_lens_rx_base_curve_od:
          lensType === "contact"
            ? formData.contact_lens_rx_base_curve_od
            : null,
        contact_lens_rx_diameter_od:
          lensType === "contact" ? formData.contact_lens_rx_diameter_od : null,
        contact_lens_rx_sphere_os:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as any).os_sphere ?? null)
            : null,
        contact_lens_rx_cylinder_os:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as any).os_cylinder ?? null)
            : null,
        contact_lens_rx_axis_os:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as any).os_axis ?? null)
            : null,
        contact_lens_rx_add_os:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as any).os_add ?? null)
            : null,
        contact_lens_rx_base_curve_os:
          lensType === "contact"
            ? formData.contact_lens_rx_base_curve_os
            : null,
        contact_lens_rx_diameter_os:
          lensType === "contact" ? formData.contact_lens_rx_diameter_os : null,
        contact_lens_quantity:
          lensType === "contact" ? formData.contact_lens_quantity || 1 : 1,
        contact_lens_cost:
          lensType === "contact" ? formData.contact_lens_cost || 0 : 0,
        contact_lens_price:
          lensType === "contact" ? formData.contact_lens_price || 0 : 0,
        frame_cost: formData.frame_cost,
        lens_cost: lensType === "contact" ? 0 : formData.lens_cost,
        treatments_cost: lensType === "contact" ? 0 : formData.treatments_cost,
        labor_cost: formData.labor_cost,
      });

      toast.success("Presupuesto creado exitosamente");
      onSuccess();
    } catch (error: any) {
      console.error("Error creating quote:", error);
      toast.error(error.message || "Error al crear presupuesto");
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    discountType,
    quoteSettings,
    loadingSettings,
    customerSearch,
    customerResults,
    selectedCustomer,
    searchingCustomers,
    prescriptions,
    selectedPrescription,
    loadingPrescriptions,
    showCreatePrescription,
    frameSearch,
    frameResults,
    selectedFrame,
    searchingFrames,
    nearFrameSearch,
    nearFrameResults,
    selectedNearFrame,
    searchingNearFrames,
    taxPercentage,
    customerOwnFrame,
    customerOwnNearFrame,
    manualLensPrice,
    lensFamilies,
    loadingFamilies,
    contactLensFamilies,
    loadingContactLensFamilies,
    lensType,
    calculatingContactLensPrice,
    presbyopiaSolution,
    farLensFamilyId,
    nearLensFamilyId,
    farLensCost,
    nearLensCost,
    formData,
    effectiveBranchId,
    availableTreatments,
    calculatingPrice,
    setCustomerSearch,
    setSelectedCustomer,
    setSelectedPrescription,
    setShowCreatePrescription,
    setFrameSearch,
    setSelectedFrame,
    setNearFrameSearch,
    setSelectedNearFrame,
    setCustomerOwnFrame,
    setCustomerOwnNearFrame,
    setManualLensPrice,
    setLensType,
    setPresbyopiaSolution,
    setFarLensFamilyId,
    setNearLensFamilyId,
    setDiscountType,
    setFormData,
    handleTreatmentToggle,
    handleFrameSelect,
    handleNearFrameSelect,
    handleSubmit,
    calculateTotal,
    fetchPrescriptions: fetchPrescriptionsAction,
  };
}
