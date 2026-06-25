/**
 * usePOSAdvancedSale — Custom hook for POSAdvancedSale state, effects, and handlers.
 *
 * Extracted from POSAdvancedSale.tsx to reduce component size.
 * Returns all state values, setters, computed values, and callbacks the tab components need.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  getPrescriptions,
  type Prescription,
} from "@/lib/api/services/customerService";
import { searchProducts } from "@/lib/api/services/productService";
import {
  type QuoteSettings,
  quoteSettingsService,
} from "@/lib/api/services/quoteSettingsService";

import type {
  POSProduct,
  OrderFormData,
  ExternalPrescriptionData,
  Treatment,
  POSAdvancedSaleProps,
} from "./POSAdvancedSale.types";
import {
  DEFAULT_LENS_FAMILIES,
  DEFAULT_TREATMENTS,
} from "./POSAdvancedSale.constants";
import {
  suggestLensFamily as suggestLensFamilyPure,
  computeTreatmentsPrice,
  computeLensPrice,
  computeNearLensPrice,
  computeTotalPrice,
  computeDiscountAmount,
  updateTreatmentPrice as updateTreatmentPricePure,
  filterTreatmentsByLensType,
} from "./posPricingUtils";
import { buildCartItems } from "./posCartBuilder";
import {
  handleCreateQuoteAction,
  loadSettingsAction,
  loadPrescriptionsAction,
  createSearchFramesAction,
} from "./posDataLoader";
import type { ContactLensOrderConfig } from "./ContactLensSelector";

export interface UsePOSAdvancedSaleReturn {
  // Tab
  orderFormTab: "customer" | "frame" | "lenses" | "pricing";
  setOrderFormTab: (tab: "customer" | "frame" | "lenses" | "pricing") => void;

  // Frame — distance
  frameSearchTerm: string;
  setFrameSearchTerm: (v: string) => void;
  frameResults: POSProduct[];
  frameLoading: boolean;
  selectedFrame: POSProduct | null;
  setSelectedFrame: (v: POSProduct | null) => void;

  // Frame — near
  nearFrameSearchTerm: string;
  setNearFrameSearchTerm: (v: string) => void;
  nearFrameResults: POSProduct[];
  nearFrameLoading: boolean;
  selectedNearFrame: POSProduct | null;
  setSelectedNearFrame: (v: POSProduct | null) => void;
  customerOwnNearFrame: boolean;
  setCustomerOwnNearFrame: (v: boolean) => void;

  // Lens families & treatments
  lensFamilies: typeof DEFAULT_LENS_FAMILIES;
  treatments: Treatment[];
  setTreatments: React.Dispatch<React.SetStateAction<Treatment[]>>;

  // Quote settings
  quoteSettings: QuoteSettings | null;

  // Prescriptions
  prescriptions: Prescription[];
  selectedPrescription: Prescription | null;
  setSelectedPrescription: (v: Prescription | null) => void;
  loadingPrescriptions: boolean;

  // Discount
  discountType: "none" | "percentage" | "fixed";
  setDiscountType: (v: "none" | "percentage" | "fixed") => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;

  // Order form data
  orderFormData: OrderFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;

  // External prescription
  externalPrescriptionData: ExternalPrescriptionData;
  setExternalPrescriptionData: React.Dispatch<
    React.SetStateAction<ExternalPrescriptionData>
  >;
  useExternalPrescription: boolean;
  setUseExternalPrescription: (v: boolean) => void;

  // Creating quote
  creatingQuote: boolean;

  // Contact lens
  contactLensConfig: ContactLensOrderConfig | null;
  setContactLensConfig: (v: ContactLensOrderConfig | null) => void;

  // Computed / handlers
  suggestLensFamily: () => void;
  treatmentsPrice: number;
  lensPriceValue: number;
  nearLensPriceValue: number;
  lensPrice: () => number;
  totalPrice: () => number;
  discountAmount: () => number;
  handleUpdateTreatmentPrice: (id: string, price: number) => void;
  filteredTreatments: Treatment[];
  toggleTreatment: (id: string) => void;
  handleCreateQuote: () => Promise<void>;
  handleAddToCart: () => void;
}

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
}: POSAdvancedSaleProps): UsePOSAdvancedSaleReturn {
  // Form tabs
  const [orderFormTab, setOrderFormTab] = useState<
    "customer" | "frame" | "lenses" | "pricing"
  >("customer");

  // Frame selection
  const [frameSearchTerm, setFrameSearchTerm] = useState("");
  const [frameResults, setFrameResults] = useState<POSProduct[]>([]);
  const [frameLoading, setFrameLoading] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<POSProduct | null>(null);

  // Second frame (for near vision in two_separate solution)
  const [nearFrameSearchTerm, setNearFrameSearchTerm] = useState("");
  const [nearFrameResults, setNearFrameResults] = useState<POSProduct[]>([]);
  const [nearFrameLoading, setNearFrameLoading] = useState(false);
  const [selectedNearFrame, setSelectedNearFrame] = useState<POSProduct | null>(
    null,
  );
  // Whether customer brings their own near frame/lens
  const [customerOwnNearFrame, setCustomerOwnNearFrame] = useState(false);

  // Lens families (using defaults for now)
  const lensFamilies = DEFAULT_LENS_FAMILIES;

  // Treatment prices (loaded from settings or defaults)
  const [treatments, setTreatments] = useState<Treatment[]>(DEFAULT_TREATMENTS);

  // Quote settings
  const [quoteSettings, setQuoteSettings] = useState<QuoteSettings | null>(
    null,
  );

  // Customer prescriptions
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  // Discount state
  const [discountType, setDiscountType] = useState<
    "none" | "percentage" | "fixed"
  >("none");
  const [discountValue, setDiscountValue] = useState(0);

  // Form data
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

  // External prescription
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
  const [creatingQuote, setCreatingQuote] = useState(false);

  // Contact Lens configuration from selector
  const [contactLensConfig, setContactLensConfig] =
    useState<ContactLensOrderConfig | null>(null);

  // Auto-enable external prescription when quick customer data is entered but no registered customer
  useEffect(() => {
    if (!customer && (quickCustomerName || quickCustomerRUT)) {
      setUseExternalPrescription(true);
    }
  }, [customer, quickCustomerName, quickCustomerRUT]);

  // Handle create quote from sale form
  const handleCreateQuote = async () => {
    await handleCreateQuoteAction(
      {
        customer,
        quickCustomerName,
        quickCustomerRUT,
        quickCustomerEmail,
        quickCustomerPhone,
        branchId,
        selectedPrescription,
        selectedFrame,
        selectedNearFrame,
        orderFormData,
        customerOwnNearFrame,
        lensPrice,
        treatmentsPrice,
        totalPrice,
        discountAmount,
      },
      { setCreatingQuote, onCustomerChange },
    );
  };

  // Load quote settings on mount
  useEffect(() => {
    loadSettingsAction(
      quoteSettingsService,
      setQuoteSettings,
      setTreatments,
      (cost) => setOrderFormData((prev) => ({ ...prev, labor_cost: cost })),
    );
  }, []);

  // Load prescriptions when customer changes
  useEffect(() => {
    loadPrescriptionsAction(
      customer?.id,
      getPrescriptions,
      setPrescriptions,
      setSelectedPrescription,
      setLoadingPrescriptions,
    );
  }, [customer?.id]);

  // Load quote data when selectedQuote changes
  useEffect(() => {
    if (selectedQuote) {
      // Pre-populate form with quote data
      setOrderFormData((prev) => ({
        ...prev,
        labor_cost: selectedQuote.labor_cost || prev.labor_cost,
      }));

      // If quote has lens info, try to set lens type
      if (selectedQuote.lens_type) {
        setOrderFormData((prev) => ({
          ...prev,
          lens_type:
            selectedQuote.lens_type === "contact" ? "contact" : "vision",
        }));
      }
    }
  }, [selectedQuote]);

  // Suggest lens family and presbyopia solution based on prescription (when selected)
  const suggestLensFamily = useCallback(() => {
    const suggestion = suggestLensFamilyPure(
      selectedPrescription,
      lensFamilies,
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
  }, [selectedPrescription, lensFamilies, orderFormData.lens_type]);

  // Calculate prices
  const treatmentsPrice = useMemo(
    () => computeTreatmentsPrice(orderFormData.treatment_ids, treatments),
    [orderFormData.treatment_ids, treatments],
  );

  // Calculate lens price based on family and solution type
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

  // Calculate near lens price for two_separate solution
  const nearLensPriceValue = useMemo(
    () => computeNearLensPrice(orderFormData.near_lens_family_id, lensFamilies),
    [orderFormData.near_lens_family_id, lensFamilies],
  );

  // Wrapper function for lens price
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

  // Calculate discount amount for display
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

  // Update treatment price
  const handleUpdateTreatmentPrice = (
    treatmentId: string,
    newPrice: number,
  ) => {
    setTreatments((prev) =>
      updateTreatmentPricePure(prev, treatmentId, newPrice),
    );
  };

  // Filter treatments based on lens type
  const filteredTreatments = useMemo(
    () => filterTreatmentsByLensType(treatments, orderFormData.lens_type),
    [treatments, orderFormData.lens_type],
  );

  // Search frames
  const searchFrames = useCallback(
    createSearchFramesAction(
      branchId,
      setFrameResults,
      setFrameLoading,
      searchProducts,
    ),
    [branchId],
  );

  // Debounced frame search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchFrames(frameSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [frameSearchTerm, searchFrames]);

  // Search near frames (for two_separate solution)
  const searchNearFrames = useCallback(
    createSearchFramesAction(
      branchId,
      setNearFrameResults,
      setNearFrameLoading,
      searchProducts,
    ),
    [branchId],
  );

  // Debounced near frame search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchNearFrames(nearFrameSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [nearFrameSearchTerm, searchNearFrames]);

  // Toggle treatment
  const toggleTreatment = (treatmentId: string) => {
    setOrderFormData((prev) => ({
      ...prev,
      treatment_ids: prev.treatment_ids.includes(treatmentId)
        ? prev.treatment_ids.filter((id) => id !== treatmentId)
        : [...prev.treatment_ids, treatmentId],
    }));
  };

  // Handle add to cart
  const handleAddToCart = () => {
    const currentLensPrice = lensPrice();

    const items = buildCartItems({
      orderFormData,
      selectedFrame,
      selectedNearFrame,
      customerOwnNearFrame,
      lensFamilies,
      treatments,
      currentLensPrice,
      treatmentsPrice,
      contactLensConfig,
      useExternalPrescription,
      externalPrescriptionData,
    });

    if (items.length === 0) {
      toast.warning("Seleccione al menos un producto (armazón o lentes)");
      return;
    }

    onAddToCart(items);
    toast.success("Productos agregados al carrito");

    // Reset form
    setSelectedFrame(null);
    setFrameSearchTerm("");
    setSelectedNearFrame(null);
    setNearFrameSearchTerm("");
    setCustomerOwnNearFrame(false);
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
    setUseExternalPrescription(false);
    setExternalPrescriptionData({
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
  };

  return {
    orderFormTab,
    setOrderFormTab,
    frameSearchTerm,
    setFrameSearchTerm,
    frameResults,
    frameLoading,
    selectedFrame,
    setSelectedFrame,
    nearFrameSearchTerm,
    setNearFrameSearchTerm,
    nearFrameResults,
    nearFrameLoading,
    selectedNearFrame,
    setSelectedNearFrame,
    customerOwnNearFrame,
    setCustomerOwnNearFrame,
    lensFamilies,
    treatments,
    setTreatments,
    quoteSettings,
    prescriptions,
    selectedPrescription,
    setSelectedPrescription,
    loadingPrescriptions,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    orderFormData,
    setOrderFormData,
    externalPrescriptionData,
    setExternalPrescriptionData,
    useExternalPrescription,
    setUseExternalPrescription,
    creatingQuote,
    contactLensConfig,
    setContactLensConfig,
    suggestLensFamily,
    treatmentsPrice,
    lensPriceValue,
    nearLensPriceValue,
    lensPrice,
    totalPrice,
    discountAmount,
    handleUpdateTreatmentPrice,
    filteredTreatments,
    toggleTreatment,
    handleCreateQuote,
    handleAddToCart,
  };
}
