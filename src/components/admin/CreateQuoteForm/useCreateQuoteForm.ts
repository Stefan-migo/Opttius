/**
 * Custom hook extracted from CreateQuoteForm.tsx.
 * Manages all state, effects, and handlers for the quote creation form.
 *
 * Composed from 7 domain hooks to reduce cognitive load.
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useBranch } from "@/hooks/useBranch";
import { quoteSettingsService } from "@/lib/api/services";
import { type PresbyopiaSolution } from "@/lib/presbyopia-helpers";

import { DEFAULT_QUOTE_SETTINGS } from "./CreateQuoteForm.constants";
import type {
  CreateQuoteFormProps,
  QuoteFormData,
  QuoteSettings,
} from "./CreateQuoteForm.types";

import { useContactLensSelection } from "./useContactLensSelection";
import { useCustomerSelection } from "./useCustomerSelection";
import { useFormPricing } from "./useFormPricing";
import { useFrameSelection } from "./useFrameSelection";
import { useLensConfiguration } from "./useLensConfiguration";
import { usePrescriptionSelection } from "./usePrescriptionSelection";
import { useQuoteSubmit } from "./useQuoteSubmit";

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

  // Quote settings (stays — manages loading/error states during init)
  const [quoteSettings, setQuoteSettings] = useState<unknown>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Bridge state — values produced by one sub-hook and consumed by another.
  // formPricing needs lensType/presbyopiaSolution from lensConfig and
  // customerOwnFrame/customerOwnNearFrame from frameSelection, but those
  // hooks need formData/setFormData from formPricing. We bridge the cycle
  // via local state + sync effects.
  const [lensType, setLensTypeState] = useState<"optical" | "contact">(
    "optical",
  );
  const [presbyopiaSolution, setPresbyopiaSolutionState] =
    useState<PresbyopiaSolution>("none");
  const [customerOwnFrame, setCustomerOwnFrameState] = useState(false);
  const [customerOwnNearFrame, setCustomerOwnNearFrameState] = useState(false);

  // ── Domain hooks ─────────────────────────────────────────────────

  // formPricing first — produces formData/setFormData consumed by others
  const formPricing = useFormPricing(
    quoteSettings,
    lensType,
    presbyopiaSolution,
    customerOwnFrame,
    customerOwnNearFrame,
  );

  const customerSelection = useCustomerSelection(
    effectiveBranchId,
    initialFieldOperationId,
    initialCustomerId,
  );

  const prescriptionSelection = usePrescriptionSelection(
    customerSelection.selectedCustomer,
    initialPrescriptionId,
  );

  const frameSelection = useFrameSelection(
    effectiveBranchId,
    initialFieldOperationId,
    formPricing.setFormData,
  );

  const contactLensSelection = useContactLensSelection(
    formPricing.setFormData,
  );

  const lensConfig = useLensConfiguration(
    prescriptionSelection.selectedPrescription,
    formPricing.formData,
    formPricing.setFormData,
  );

  // Sync lensConfig/frameSelection values back to bridge state
  useEffect(() => {
    setLensTypeState(lensConfig.lensType);
  }, [lensConfig.lensType]);
  useEffect(() => {
    setPresbyopiaSolutionState(lensConfig.presbyopiaSolution);
  }, [lensConfig.presbyopiaSolution]);
  useEffect(() => {
    setCustomerOwnFrameState(frameSelection.customerOwnFrame);
  }, [frameSelection.customerOwnFrame]);
  useEffect(() => {
    setCustomerOwnNearFrameState(frameSelection.customerOwnNearFrame);
  }, [frameSelection.customerOwnNearFrame]);

  // Quote submit (terminal — no other hook consumes its state)
  const quoteSubmit = useQuoteSubmit(
    customerSelection.selectedCustomer,
    prescriptionSelection.selectedPrescription,
    formPricing.formData,
    frameSelection.selectedFrame,
    frameSelection.selectedNearFrame,
    lensConfig.lensType,
    lensConfig.presbyopiaSolution,
    frameSelection.customerOwnFrame,
    frameSelection.customerOwnNearFrame,
    lensConfig.farLensFamilyId,
    lensConfig.nearLensFamilyId,
    lensConfig.farLensCost,
    lensConfig.nearLensCost,
    effectiveBranchId,
    initialFieldOperationId,
    onSuccess,
  );

  // ── Quote settings effects (stays in main hook) ──────────────────

  const fetchQuoteSettings = async () => {
    try {
      setLoadingSettings(true);
      const settings = await quoteSettingsService.get();
      const newSettings = settings ? ({ ...settings } as unknown) : null;
      setQuoteSettings(newSettings);
      if (newSettings) {
        formPricing.setFormData((prev) => ({
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

  // Fetch settings on mount and when branch changes
  useEffect(() => {
    fetchQuoteSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBranchId]);

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

  // Sync quote settings to formData
  useEffect(() => {
    if (quoteSettings) {
      const s = quoteSettings as QuoteSettings;
      const newLaborCost = s.default_labor_cost ?? 15000;
      const newExpirationDays = s.default_expiration_days ?? 30;
      formPricing.setFormData((prev) => {
        const updates: Partial<QuoteFormData> = {};
        if (prev.labor_cost !== newLaborCost) updates.labor_cost = newLaborCost;
        if (prev.expiration_days !== newExpirationDays)
          updates.expiration_days = newExpirationDays;
        return Object.keys(updates).length > 0
          ? { ...prev, ...updates }
          : prev;
      });
    }
  }, [
    (quoteSettings as QuoteSettings)?.default_labor_cost,
    (quoteSettings as QuoteSettings)?.default_expiration_days,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formPricing.setFormData,
  ]);

  // ── Delegate setters ─────────────────────────────────────────────

  // Setters for bridged values delegate directly to the sub-hook that owns them
  const setLensType = (v: "optical" | "contact") => {
    lensConfig.setLensType(v);
  };
  const setPresbyopiaSolution = (v: PresbyopiaSolution) => {
    lensConfig.setPresbyopiaSolution(v);
  };
  const setCustomerOwnFrame = (v: boolean) => {
    frameSelection.setCustomerOwnFrame(v);
  };
  const setCustomerOwnNearFrame = (v: boolean) => {
    frameSelection.setCustomerOwnNearFrame(v);
  };

  // ── Compose return value ─────────────────────────────────────────

  return {
    // From quote submit
    loading: quoteSubmit.loading,
    saving: quoteSubmit.saving,
    handleSubmit: quoteSubmit.handleSubmit,

    // From form pricing
    discountType: formPricing.discountType,
    setDiscountType: formPricing.setDiscountType,
    formData: formPricing.formData,
    setFormData: formPricing.setFormData,
    taxPercentage: formPricing.taxPercentage,
    availableTreatments: formPricing.availableTreatments,
    handleTreatmentToggle: formPricing.handleTreatmentToggle,
    calculateTotal: formPricing.calculateTotal,

    // From customer selection
    customerSearch: customerSelection.customerSearch,
    setCustomerSearch: customerSelection.setCustomerSearch,
    customerResults: customerSelection.customerResults,
    selectedCustomer: customerSelection.selectedCustomer,
    setSelectedCustomer: customerSelection.setSelectedCustomer,
    searchingCustomers: customerSelection.searchingCustomers,

    // From prescription selection
    prescriptions: prescriptionSelection.prescriptions,
    setSelectedPrescription: prescriptionSelection.setSelectedPrescription,
    selectedPrescription: prescriptionSelection.selectedPrescription,
    loadingPrescriptions: prescriptionSelection.loadingPrescriptions,
    showCreatePrescription: prescriptionSelection.showCreatePrescription,
    setShowCreatePrescription: prescriptionSelection.setShowCreatePrescription,
    fetchPrescriptions: prescriptionSelection.fetchPrescriptions,

    // From frame selection
    frameSearch: frameSelection.frameSearch,
    setFrameSearch: frameSelection.setFrameSearch,
    frameResults: frameSelection.frameResults,
    selectedFrame: frameSelection.selectedFrame,
    setSelectedFrame: frameSelection.setSelectedFrame,
    searchingFrames: frameSelection.searchingFrames,
    nearFrameSearch: frameSelection.nearFrameSearch,
    setNearFrameSearch: frameSelection.setNearFrameSearch,
    nearFrameResults: frameSelection.nearFrameResults,
    selectedNearFrame: frameSelection.selectedNearFrame,
    setSelectedNearFrame: frameSelection.setSelectedNearFrame,
    searchingNearFrames: frameSelection.searchingNearFrames,
    customerOwnFrame: frameSelection.customerOwnFrame,
    setCustomerOwnFrame,
    customerOwnNearFrame: frameSelection.customerOwnNearFrame,
    setCustomerOwnNearFrame,
    handleFrameSelect: frameSelection.handleFrameSelect,
    handleNearFrameSelect: frameSelection.handleNearFrameSelect,

    // From lens configuration
    manualLensPrice: lensConfig.manualLensPrice,
    setManualLensPrice: lensConfig.setManualLensPrice,
    lensFamilies: lensConfig.lensFamilies,
    loadingFamilies: lensConfig.loadingFamilies,
    contactLensFamilies: lensConfig.contactLensFamilies,
    loadingContactLensFamilies: lensConfig.loadingContactLensFamilies,
    lensType: lensConfig.lensType,
    setLensType,
    calculatingContactLensPrice: lensConfig.calculatingContactLensPrice,
    presbyopiaSolution: lensConfig.presbyopiaSolution,
    setPresbyopiaSolution,
    farLensFamilyId: lensConfig.farLensFamilyId,
    setFarLensFamilyId: lensConfig.setFarLensFamilyId,
    nearLensFamilyId: lensConfig.nearLensFamilyId,
    setNearLensFamilyId: lensConfig.setNearLensFamilyId,
    farLensCost: lensConfig.farLensCost,
    nearLensCost: lensConfig.nearLensCost,
    calculatingPrice: lensConfig.calculatingPrice,

    // From main hook (quote settings)
    quoteSettings,
    loadingSettings,
    effectiveBranchId,
  };
}
