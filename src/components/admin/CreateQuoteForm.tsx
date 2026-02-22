"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  User,
  Eye,
  Package,
  Loader2,
  Calculator,
  Plus,
  X,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreatePrescriptionForm from "@/components/admin/CreatePrescriptionForm";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import {
  calculatePriceWithTax,
  calculateTotal as calculateTotalTax,
} from "@/lib/utils/tax";
import { getTaxPercentage } from "@/lib/utils/tax-config";
import { useLensPriceCalculation } from "@/hooks/useLensPriceCalculation";
import {
  hasAddition,
  getMaxAddition,
  getFarSphere,
  getCylinder,
  getNearSphere,
  getDefaultPresbyopiaSolution,
  getRecommendedLensTypes,
  type PresbyopiaSolution,
} from "@/lib/presbyopia-helpers";
import { translatePrescriptionType } from "@/lib/prescription-helpers";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { extractDataFromResponse } from "@/lib/api/response-helpers";
import {
  lensFamilyService,
  contactLensFamilyService,
  contactLensMatrixService,
  quoteSettingsService,
  customerService,
  productService,
  quoteService,
} from "@/lib/api/services";
import { LensFamilyCombobox } from "@/components/admin/lenses/LensFamilyCombobox";
import { ContactLensFamilyCombobox } from "@/components/admin/lenses/ContactLensFamilyCombobox";

interface CreateQuoteFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialCustomerId?: string;
  initialPrescriptionId?: string;
}

export default function CreateQuoteForm({
  onSuccess,
  onCancel,
  initialCustomerId,
  initialPrescriptionId,
}: CreateQuoteFormProps) {
  // Branch context
  const { currentBranchId } = useBranch();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "amount">(
    "amount",
  );
  const [quoteSettings, setQuoteSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Prescription selection
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);

  // Frame selection
  const [frameSearch, setFrameSearch] = useState("");
  const [frameResults, setFrameResults] = useState<any[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<any>(null);
  const [searchingFrames, setSearchingFrames] = useState(false);

  // Second frame for two separate lenses (near vision)
  const [nearFrameSearch, setNearFrameSearch] = useState("");
  const [nearFrameResults, setNearFrameResults] = useState<any[]>([]);
  const [selectedNearFrame, setSelectedNearFrame] = useState<any>(null);
  const [searchingNearFrames, setSearchingNearFrames] = useState(false);
  const [taxPercentage, setTaxPercentage] = useState<number>(19.0);
  const [customerOwnFrame, setCustomerOwnFrame] = useState<boolean>(false);
  const [customerOwnNearFrame, setCustomerOwnNearFrame] =
    useState<boolean>(false);
  const [manualLensPrice, setManualLensPrice] = useState<boolean>(false);

  // Lens families and price calculation
  const [lensFamilies, setLensFamilies] = useState<any[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const { calculateLensPrice, loading: calculatingPrice } =
    useLensPriceCalculation();

  // Contact lens families and price calculation
  const [contactLensFamilies, setContactLensFamilies] = useState<any[]>([]);
  const [loadingContactLensFamilies, setLoadingContactLensFamilies] =
    useState(false);
  const [lensType, setLensType] = useState<"optical" | "contact">("optical"); // Toggle between optical and contact lenses
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
  const [formData, setFormData] = useState({
    frame_name: "",
    frame_brand: "",
    frame_model: "",
    frame_color: "",
    frame_size: "",
    frame_sku: "",
    frame_price: 0,
    frame_price_includes_tax: false,
    customer_own_frame: false,
    lens_family_id: "" as string | "",
    lens_type: "",
    lens_material: "",
    lens_index: null as number | null,
    lens_treatments: [] as string[],
    lens_tint_color: "",
    lens_tint_percentage: 0,
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
    presbyopia_solution: "none" as PresbyopiaSolution,
    far_lens_family_id: "",
    near_lens_family_id: "",
    far_lens_cost: 0,
    near_lens_cost: 0,
    // Contact lens fields
    contact_lens_family_id: "",
    contact_lens_rx_sphere_od: null as number | null,
    contact_lens_rx_cylinder_od: null as number | null,
    contact_lens_rx_axis_od: null as number | null,
    contact_lens_rx_add_od: null as number | null,
    contact_lens_rx_base_curve_od: null as number | null,
    contact_lens_rx_diameter_od: null as number | null,
    contact_lens_rx_sphere_os: null as number | null,
    contact_lens_rx_cylinder_os: null as number | null,
    contact_lens_rx_axis_os: null as number | null,
    contact_lens_rx_add_os: null as number | null,
    contact_lens_rx_base_curve_os: null as number | null,
    contact_lens_rx_diameter_os: null as number | null,
    contact_lens_quantity: 1,
    contact_lens_cost: 0,
    contact_lens_price: 0,
    // Second frame for two separate lenses
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
  });

  // Mapa de materiales a índices de refracción
  const MATERIAL_INDICES: Record<string, number> = {
    cr39: 1.49, // Orgánico Standard
    mid_index: 1.56, // Índice medio (común en Blue Cut genérico)
    polycarbonate: 1.59, // Policarbonato
    high_index_1_60: 1.6, // Alto Índice 1.60 (gama media-alta)
    high_index_1_67: 1.67, // Alto Índice 1.67
    high_index_1_74: 1.74, // Alto Índice 1.74
    trivex: 1.53, // Trivex
    glass: 1.52, // Vidrio
  };

  // Fetch quote settings on mount and when branch changes
  useEffect(() => {
    fetchQuoteSettings();
    // Fetch tax percentage from system config
    getTaxPercentage(19.0).then(setTaxPercentage);
    // Fetch lens families
    fetchLensFamilies();
    // Fetch contact lens families
    fetchContactLensFamilies();
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

    // Listen for custom event
    window.addEventListener("quote-settings-updated", handleSettingsUpdate);

    // Also check localStorage periodically (for same-tab updates)
    const checkStorage = setInterval(() => {
      const lastUpdate = localStorage.getItem("quote-settings-updated");
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate, 10);
        const now = Date.now();
        // If update was within last 2 seconds, refresh
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

  // Reload settings periodically to catch updates (every 30 seconds as fallback)
  useEffect(() => {
    if (!loadingSettings) {
      const interval = setInterval(() => {
        fetchQuoteSettings();
      }, 30000); // Check every 30 seconds as fallback

      return () => clearInterval(interval);
    }
  }, [currentBranchId, loadingSettings]);

  // Fetch lens families
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

  // Fetch contact lens families
  const fetchContactLensFamilies = async () => {
    try {
      setLoadingContactLensFamilies(true);
      const families = await contactLensFamilyService.getAll();
      console.log(
        "Contact lens families loaded:",
        families?.length || 0,
        "families",
      );
      setContactLensFamilies(families || []);
    } catch (error) {
      console.error("Error fetching contact lens families:", error);
    } finally {
      setLoadingContactLensFamilies(false);
    }
  };

  // When a family is selected, inherit genetic properties (type/material) from that family
  useEffect(() => {
    if (!formData.lens_family_id) return;
    const family = lensFamilies.find((f) => f.id === formData.lens_family_id);
    if (!family) return;

    // Obtener el índice de refracción según el material de la familia
    const materialIndex = family.lens_material
      ? MATERIAL_INDICES[family.lens_material] || null
      : null;

    setFormData((prev) => ({
      ...prev,
      lens_type: family.lens_type || prev.lens_type,
      lens_material: family.lens_material || prev.lens_material,
      lens_index: materialIndex !== null ? materialIndex : prev.lens_index,
      // Treatments are included in family price (no extras)
      lens_treatments: [],
      treatments_cost: 0,
    }));
  }, [formData.lens_family_id, lensFamilies]);

  // Calculate lens price from matrix when parameters change
  const calculateLensPriceFromMatrix = async () => {
    if (!formData.lens_family_id || !selectedPrescription) {
      return;
    }

    // Skip if two separate lenses (handled separately)
    if (presbyopiaSolution === "two_separate") {
      return;
    }

    // Validate lens_family_id is a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formData.lens_family_id)) {
      return;
    }

    // Get sphere value from prescription (use average or highest absolute value)
    const farSphere = getFarSphere(selectedPrescription);
    const cylinder = getCylinder(selectedPrescription);

    // For progressive/bifocal/trifocal, include addition in calculation
    let addition: number | undefined = undefined;
    if (
      presbyopiaSolution === "progressive" ||
      presbyopiaSolution === "bifocal" ||
      presbyopiaSolution === "trifocal"
    ) {
      addition = getMaxAddition(selectedPrescription);
    }

    // Debug logging
    console.log("Calculating lens price:", {
      lens_family_id: formData.lens_family_id,
      sphere: farSphere,
      cylinder: cylinder,
      addition: addition,
      presbyopiaSolution,
    });

    try {
      // First, try to debug what matrices exist
      const debugResponse = await fetch(
        `/api/admin/lens-matrices/debug?lens_family_id=${formData.lens_family_id}&sphere=${farSphere}&cylinder=${cylinder}`,
      );
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log("Debug info:", debugData);
      }

      const result = await calculateLensPrice({
        lens_family_id: formData.lens_family_id,
        sphere: farSphere,
        cylinder: cylinder, // Always send cylinder, even if 0, to match ranges that include 0
        addition: addition,
      });

      console.log("Lens price calculation result:", result);

      if (result && result.price) {
        setFormData((prev) => ({ ...prev, lens_cost: result.price }));
      } else {
        console.warn("No price found in calculation result");
      }
    } catch (error) {
      // Silently fail - user can manually enter price if matrix doesn't exist
      console.warn("Could not calculate lens price from matrix:", error);
    }
  };

  // Calculate contact lens price from matrix
  const calculateContactLensPriceFromMatrix = async () => {
    if (!formData.contact_lens_family_id || !selectedPrescription) {
      return;
    }

    // Validate contact_lens_family_id is a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formData.contact_lens_family_id)) {
      return;
    }

    try {
      setCalculatingContactLensPrice(true);

      // Get sphere value from prescription (use OD sphere for calculation)
      const sphereOD = selectedPrescription.od_sphere || 0;
      const cylinderOD = selectedPrescription.od_cylinder || 0;
      const axisOD = selectedPrescription.od_axis || null;
      const additionOD = selectedPrescription.od_add || null;

      const calculation = await contactLensMatrixService.calculate(
        formData.contact_lens_family_id,
        sphereOD,
        cylinderOD,
        axisOD,
        additionOD,
      );

      if (calculation && calculation.price) {
        // Calculate total price: price per box * quantity
        const quantity = formData.contact_lens_quantity || 1;
        const totalPrice = calculation.price * quantity;
        const totalCost = calculation.cost * quantity;

        setFormData((prev) => ({
          ...prev,
          contact_lens_price: totalPrice,
          contact_lens_cost: totalCost,
        }));
      }
    } catch (error) {
      console.warn(
        "Could not calculate contact lens price from matrix:",
        error,
      );
      toast.error("No se pudo calcular el precio del lente de contacto");
    } finally {
      setCalculatingContactLensPrice(false);
    }
  };

  // Detect presbyopia and set default solution
  useEffect(() => {
    if (selectedPrescription) {
      const hasAdd = hasAddition(selectedPrescription);
      if (hasAdd && presbyopiaSolution === "none") {
        const defaultSolution =
          getDefaultPresbyopiaSolution(selectedPrescription);
        setPresbyopiaSolution(defaultSolution);
        setFormData((prev) => ({
          ...prev,
          presbyopia_solution: defaultSolution,
        }));
        if (
          defaultSolution === "progressive" ||
          defaultSolution === "bifocal" ||
          defaultSolution === "trifocal"
        ) {
          setFormData((prev) => ({ ...prev, lens_type: defaultSolution }));
        }
      } else if (!hasAdd) {
        setPresbyopiaSolution("none");
        setFormData((prev) => ({ ...prev, presbyopia_solution: "none" }));
      }
    }
  }, [selectedPrescription]);

  // Update form data when quote settings change
  useEffect(() => {
    if (quoteSettings) {
      // Use nullish coalescing (??) instead of || to allow 0 values
      const newLaborCost = quoteSettings.default_labor_cost ?? 15000;
      const newExpirationDays = quoteSettings.default_expiration_days ?? 30;

      setFormData((prev) => {
        // Only update if the value has actually changed
        const updates: any = {};
        if (prev.labor_cost !== newLaborCost) {
          updates.labor_cost = newLaborCost;
        }
        if (prev.expiration_days !== newExpirationDays) {
          updates.expiration_days = newExpirationDays;
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates };
        }
        return prev;
      });
    }
  }, [
    quoteSettings?.default_labor_cost,
    quoteSettings?.default_expiration_days,
  ]);

  // Recalculate price when relevant fields change
  useEffect(() => {
    if (formData.lens_family_id && selectedPrescription) {
      // Use a small delay to ensure state is updated
      const timer = setTimeout(() => {
        calculateLensPriceFromMatrix();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [formData.lens_family_id, selectedPrescription?.id, presbyopiaSolution]);

  // Recalculate contact lens price when relevant fields change
  useEffect(() => {
    if (
      formData.contact_lens_family_id &&
      selectedPrescription &&
      lensType === "contact"
    ) {
      // Use a small delay to ensure state is updated
      const timer = setTimeout(() => {
        calculateContactLensPriceFromMatrix();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [
    formData.contact_lens_family_id,
    formData.contact_lens_quantity,
    selectedPrescription?.id,
    lensType,
  ]);

  // Calculate prices for two separate lenses
  useEffect(() => {
    if (presbyopiaSolution === "two_separate" && selectedPrescription) {
      const calculateTwoLenses = async () => {
        // Validate UUID format
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        // Calculate far lens price
        if (farLensFamilyId && uuidRegex.test(farLensFamilyId)) {
          const farSphere = getFarSphere(selectedPrescription);
          const cylinder = getCylinder(selectedPrescription);
          try {
            const result = await calculateLensPrice({
              lens_family_id: farLensFamilyId,
              sphere: farSphere,
              cylinder: cylinder, // Always send cylinder, even if 0
            });
            if (result && result.price) {
              setFarLensCost(result.price);
              setFormData((prev) => ({ ...prev, far_lens_cost: result.price }));
            }
          } catch (error) {
            console.warn("Could not calculate far lens price:", error);
          }
        }

        // Calculate near lens price
        if (nearLensFamilyId && uuidRegex.test(nearLensFamilyId)) {
          const nearSphere = getNearSphere(selectedPrescription);
          const cylinder = getCylinder(selectedPrescription);
          try {
            const result = await calculateLensPrice({
              lens_family_id: nearLensFamilyId,
              sphere: nearSphere,
              cylinder: cylinder, // Always send cylinder, even if 0
            });
            if (result && result.price) {
              setNearLensCost(result.price);
              setFormData((prev) => ({
                ...prev,
                near_lens_cost: result.price,
              }));
            }
          } catch (error) {
            console.warn("Could not calculate near lens price:", error);
          }
        }

        // Update total lens cost
        const totalLensCost = (farLensCost || 0) + (nearLensCost || 0);
        setFormData((prev) => ({ ...prev, lens_cost: totalLensCost }));
      };
      calculateTwoLenses();
    }
  }, [
    farLensFamilyId,
    nearLensFamilyId,
    selectedPrescription,
    presbyopiaSolution,
    farLensCost,
    nearLensCost,
  ]);

  const fetchQuoteSettings = async () => {
    try {
      setLoadingSettings(true);
      const settings = await quoteSettingsService.get();

      // Always create a new object to ensure React detects the change
      const newSettings = settings ? ({ ...settings } as any) : null;
      setQuoteSettings(newSettings);

      // Set default values from settings
      if (newSettings) {
        setFormData((prev) => ({
          ...prev,
          // Use nullish coalescing (??) instead of || to allow 0 values
          labor_cost: newSettings.default_labor_cost ?? 15000,
          expiration_days:
            newSettings.validity_days ??
            newSettings.default_expiration_days ??
            30,
        }));
      }
    } catch (error) {
      console.error("Error fetching quote settings:", error);
      // Use default values if settings fetch fails
      setQuoteSettings({
        treatment_prices: {
          anti_reflective: { price: 15000, enabled: true },
          blue_light_filter: { price: 20000, enabled: true },
          uv_protection: { price: 10000, enabled: true },
          scratch_resistant: { price: 12000, enabled: true },
          anti_fog: { price: 8000, enabled: true },
          photochromic: { price: 35000, enabled: true },
          polarized: { price: 25000, enabled: true },
          tint: { price: 15000, enabled: true },
        },
        default_labor_cost: 15000,
        default_tax_percentage: 19.0,
        default_expiration_days: 30,
        labor_cost_includes_tax: true,
        lens_cost_includes_tax: true,
        treatments_cost_includes_tax: true,
        volume_discounts: [],
        currency: "CLP",
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  // Helper function to get treatment price (supports both old format: number, and new format: {price, enabled})
  const getTreatmentPrice = (value: any): number => {
    if (typeof value === "number") return value;
    if (value && typeof value === "object" && "price" in value)
      return value.price;
    return 0;
  };

  // Helper function to check if treatment is enabled (supports both formats)
  const isTreatmentEnabled = (value: any): boolean => {
    if (typeof value === "number") return true; // Backward compatibility: number = enabled
    if (value && typeof value === "object" && "enabled" in value)
      return value.enabled;
    return true; // Default to enabled if format is unknown
  };

  // Get available treatments from settings (only enabled ones)
  const availableTreatments = quoteSettings
    ? [
        {
          value: "anti_reflective",
          label: "Anti-reflejante",
          cost:
            getTreatmentPrice(
              quoteSettings.treatment_prices?.anti_reflective,
            ) || 15000,
          enabled: isTreatmentEnabled(
            quoteSettings.treatment_prices?.anti_reflective,
          ),
        },
        {
          value: "blue_light_filter",
          label: "Filtro Luz Azul",
          cost:
            getTreatmentPrice(
              quoteSettings.treatment_prices?.blue_light_filter,
            ) || 20000,
          enabled: isTreatmentEnabled(
            quoteSettings.treatment_prices?.blue_light_filter,
          ),
        },
        {
          value: "uv_protection",
          label: "Protección UV",
          cost:
            getTreatmentPrice(quoteSettings.treatment_prices?.uv_protection) ||
            10000,
          enabled: isTreatmentEnabled(
            quoteSettings.treatment_prices?.uv_protection,
          ),
        },
        {
          value: "scratch_resistant",
          label: "Anti-rayas",
          cost:
            getTreatmentPrice(
              quoteSettings.treatment_prices?.scratch_resistant,
            ) || 12000,
          enabled: isTreatmentEnabled(
            quoteSettings.treatment_prices?.scratch_resistant,
          ),
        },
        {
          value: "anti_fog",
          label: "Anti-empañamiento",
          cost:
            getTreatmentPrice(quoteSettings.treatment_prices?.anti_fog) || 8000,
          enabled: isTreatmentEnabled(quoteSettings.treatment_prices?.anti_fog),
        },
        {
          value: "photochromic",
          label: "Fotocromático",
          cost:
            getTreatmentPrice(quoteSettings.treatment_prices?.photochromic) ||
            35000,
          enabled: isTreatmentEnabled(
            quoteSettings.treatment_prices?.photochromic,
          ),
        },
        {
          value: "polarized",
          label: "Polarizado",
          cost:
            getTreatmentPrice(quoteSettings.treatment_prices?.polarized) ||
            25000,
          enabled: isTreatmentEnabled(
            quoteSettings.treatment_prices?.polarized,
          ),
        },
        {
          value: "tint",
          label: "Tinte",
          cost:
            getTreatmentPrice(quoteSettings.treatment_prices?.tint) || 15000,
          enabled: isTreatmentEnabled(quoteSettings.treatment_prices?.tint),
        },
        {
          value: "prism_extra",
          label: "Prisma (extra)",
          cost: 0,
          enabled: true,
        }, // Prisma always enabled
      ].filter((t) => t.enabled)
    : [
        {
          value: "anti_reflective",
          label: "Anti-reflejante",
          cost: 15000,
          enabled: true,
        },
        {
          value: "blue_light_filter",
          label: "Filtro Luz Azul",
          cost: 20000,
          enabled: true,
        },
        {
          value: "uv_protection",
          label: "Protección UV",
          cost: 10000,
          enabled: true,
        },
        {
          value: "scratch_resistant",
          label: "Anti-rayas",
          cost: 12000,
          enabled: true,
        },
        {
          value: "anti_fog",
          label: "Anti-empañamiento",
          cost: 8000,
          enabled: true,
        },
        {
          value: "photochromic",
          label: "Fotocromático",
          cost: 35000,
          enabled: true,
        },
        { value: "polarized", label: "Polarizado", cost: 25000, enabled: true },
        { value: "tint", label: "Tinte", cost: 15000, enabled: true },
        {
          value: "prism_extra",
          label: "Prisma (extra)",
          cost: 0,
          enabled: true,
        },
      ];

  useEffect(() => {
    if (
      initialCustomerId &&
      (!selectedCustomer || selectedCustomer.id !== initialCustomerId)
    ) {
      fetchCustomer(initialCustomerId);
    }
  }, [initialCustomerId]);

  // Load prescriptions when customer is selected
  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchPrescriptions(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  // Load prescription if initialPrescriptionId provided
  useEffect(() => {
    if (initialPrescriptionId && prescriptions.length > 0) {
      const prescription = prescriptions.find(
        (p) => p.id === initialPrescriptionId,
      );
      if (prescription) {
        setSelectedPrescription(prescription);
      }
    }
  }, [initialPrescriptionId, prescriptions]);

  const fetchCustomer = async (customerId: string) => {
    try {
      const customer = await customerService.getCustomer(customerId);
      setSelectedCustomer(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  const fetchPrescriptions = async (customerId: string) => {
    try {
      setLoadingPrescriptions(true);
      const prescriptions = await customerService.getPrescriptions(customerId);
      setPrescriptions(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomerResults([]);
        return;
      }

      setSearchingCustomers(true);
      try {
        const customers = await customerService.searchCustomers(customerSearch);
        setCustomerResults(customers || []);
      } catch (error) {
        console.error("Error searching customers:", error);
      } finally {
        setSearchingCustomers(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch]);

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
          currentBranchId ?? undefined,
          "frame",
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
  }, [frameSearch, currentBranchId]);

  // Search near frames (for two separate lenses)
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
          currentBranchId ?? undefined,
          "frame",
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
  }, [nearFrameSearch, currentBranchId]);

  const calculateTotal = () => {
    // Use tax percentage from settings or system config, default to 19% (IVA Chile)
    const effectiveTaxRate =
      quoteSettings?.default_tax_percentage || taxPercentage;

    // Get tax inclusion settings from quote settings (default to true - IVA incluido)
    // For contact lenses, price already includes tax
    const lensIncludesTax =
      lensType === "contact"
        ? true
        : (quoteSettings?.lens_cost_includes_tax ?? true);
    const treatmentsIncludeTax =
      quoteSettings?.treatments_cost_includes_tax ?? true;
    const laborIncludesTax = quoteSettings?.labor_cost_includes_tax ?? true;

    // Use frame_price (precio de venta) for calculation, but if customer brings frame, use 0
    const framePriceForCalculation = customerOwnFrame
      ? 0
      : formData.frame_price || 0;

    // Calculate frame price with tax consideration
    const framePriceBreakdown = calculatePriceWithTax(
      framePriceForCalculation,
      formData.frame_price_includes_tax || false,
      effectiveTaxRate,
    );

    // Calculate second frame price (for two separate lenses - near vision)
    // If customer brings near frame, use 0
    const nearFramePriceForCalculation =
      presbyopiaSolution === "two_separate" && !customerOwnNearFrame
        ? formData.near_frame_price || 0
        : 0;
    const nearFramePriceBreakdown = calculatePriceWithTax(
      nearFramePriceForCalculation,
      formData.near_frame_price_includes_tax || false,
      effectiveTaxRate,
    );

    // Calculate lens, treatments, and labor with tax consideration
    // Use costos internos (lens_cost, treatments_cost, labor_cost) for calculation
    // For two_separate solution, lens_cost should be the sum of far_lens_cost and near_lens_cost
    // For contact lenses, use contact_lens_price (precio venta con IVA) instead of lens_cost
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

    // Subtotal is the sum of all base prices (without tax)
    // Include second frame if two separate lenses
    const subtotal =
      framePriceBreakdown.subtotal +
      nearFramePriceBreakdown.subtotal +
      lensBreakdown.subtotal +
      treatmentsBreakdown.subtotal +
      laborBreakdown.subtotal;

    // Calculate total tax from all items
    // For items with tax included: tax is already extracted
    // For items without tax: tax needs to be calculated
    const taxFromItemsWithTax =
      framePriceBreakdown.tax +
      nearFramePriceBreakdown.tax +
      (lensIncludesTax ? lensBreakdown.tax : 0) +
      (treatmentsIncludeTax ? treatmentsBreakdown.tax : 0) +
      (laborIncludesTax ? laborBreakdown.tax : 0);

    // Calculate tax for items without tax
    const itemsWithoutTax =
      (lensIncludesTax ? 0 : lensBreakdown.subtotal) +
      (treatmentsIncludeTax ? 0 : treatmentsBreakdown.subtotal) +
      (laborIncludesTax ? 0 : laborBreakdown.subtotal) +
      (formData.frame_price_includes_tax ? 0 : framePriceBreakdown.subtotal) +
      (formData.near_frame_price_includes_tax
        ? 0
        : nearFramePriceBreakdown.subtotal);

    const taxOnItemsWithoutTax = itemsWithoutTax * (effectiveTaxRate / 100);

    // Total tax is the sum of both
    const totalTax = taxFromItemsWithTax + taxOnItemsWithoutTax;

    // Total with tax (before discount)
    const totalWithTax = subtotal + totalTax;

    // Calculate discount based on type - apply to total with tax
    let discount = 0;
    let discountPercentage = 0;

    if (discountType === "percentage") {
      // Apply discount to total with tax
      discount = totalWithTax * (formData.discount_percentage / 100);
      discountPercentage = formData.discount_percentage;
    } else {
      // Discount by amount
      discount = formData.discount_amount || 0;
      // Calculate percentage for display (based on total with tax)
      if (totalWithTax > 0) {
        discountPercentage = (discount / totalWithTax) * 100;
      }
    }

    // Ensure discount doesn't exceed total with tax
    if (discount > totalWithTax) {
      discount = totalWithTax;
      if (discountType === "amount") {
        discountPercentage = 100;
      }
    }

    // Total is: total with tax minus discount
    // Round all values at the end to avoid floating point precision errors
    const total = totalWithTax - discount;

    // Helper function to round to 2 decimal places (currency precision)
    const roundCurrency = (value: number): number => {
      return Math.round(value * 100) / 100;
    };

    setFormData((prev) => ({
      ...prev,
      subtotal: roundCurrency(subtotal),
      discount_amount: roundCurrency(discount),
      discount_percentage: roundCurrency(discountPercentage),
      tax_amount: roundCurrency(totalTax),
      total_amount: roundCurrency(total),
    }));
  };

  useEffect(() => {
    calculateTotal();
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
    presbyopiaSolution,
  ]);

  const handleTreatmentToggle = (
    treatment: (typeof availableTreatments)[0],
  ) => {
    const isSelected = formData.lens_treatments.includes(treatment.value);
    let newTreatments = [...formData.lens_treatments];
    let treatmentsCost = formData.treatments_cost;

    if (isSelected) {
      newTreatments = newTreatments.filter((t) => t !== treatment.value);
      treatmentsCost -= treatment.cost;
    } else {
      newTreatments.push(treatment.value);
      treatmentsCost += treatment.cost;
    }

    setFormData((prev) => ({
      ...prev,
      lens_treatments: newTreatments,
      treatments_cost: treatmentsCost,
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

    // Validate lens configuration based on lens type and presbyopia solution
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
        if (!farLensFamilyId && !nearLensFamilyId) {
          // If no families selected, require manual price entry
          if (formData.lens_cost === 0) {
            toast.error(
              "Selecciona familias de lentes o ingresa el precio manualmente",
            );
            return;
          }
        }
      } else {
        if (!formData.lens_family_id && formData.lens_cost === 0) {
          toast.error(
            "Selecciona una familia de lentes o ingresa el precio manualmente",
          );
          return;
        }
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
        ...getBranchHeader(currentBranchId),
      };

      // Prepare near frame data
      const nearFrameData =
        presbyopiaSolution === "two_separate"
          ? {
              near_frame_product_id: selectedNearFrame?.id || null,
              near_frame_name:
                formData.near_frame_name || selectedNearFrame?.name || null,
              near_frame_brand:
                formData.near_frame_brand ||
                selectedNearFrame?.frame_brand ||
                null,
              near_frame_model:
                formData.near_frame_model ||
                selectedNearFrame?.frame_model ||
                null,
              near_frame_color:
                formData.near_frame_color ||
                selectedNearFrame?.frame_color ||
                null,
              near_frame_size:
                formData.near_frame_size ||
                selectedNearFrame?.frame_size ||
                null,
              near_frame_sku:
                formData.near_frame_sku || selectedNearFrame?.sku || null,
              near_frame_price:
                formData.near_frame_price || selectedNearFrame?.price || 0,
              near_frame_price_includes_tax:
                formData.near_frame_price_includes_tax ??
                selectedNearFrame?.price_includes_tax ??
                false,
              near_frame_cost:
                formData.near_frame_cost || selectedNearFrame?.price || 0,
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

      console.log("Submitting quote with near frame data:", {
        presbyopiaSolution,
        selectedNearFrame: selectedNearFrame
          ? {
              id: selectedNearFrame.id,
              name: selectedNearFrame.name,
              price: selectedNearFrame.price,
            }
          : null,
        formDataNearFrame: {
          near_frame_name: formData.near_frame_name,
          near_frame_cost: formData.near_frame_cost,
          near_frame_price: formData.near_frame_price,
        },
        nearFrameData,
      });

      await quoteService.createQuote({
        customer_id: selectedCustomer.id,
        status: "draft",
        subtotal: formData.subtotal,
        tax_amount: formData.tax_amount,
        discount_amount: formData.discount_amount,
        total_amount: formData.total_amount,
        valid_until: expirationDate.toISOString().split("T")[0],
        notes: formData.notes,
        branch_id: currentBranchId || undefined,
        // Move fields from items to top level
        prescription_id: selectedPrescription.id,
        frame_product_id: selectedFrame?.id,
        customer_own_frame: customerOwnFrame,
        frame_name: formData.frame_name,
        frame_brand: formData.frame_brand,
        frame_model: formData.frame_model,
        frame_color: formData.frame_color,
        frame_size: formData.frame_size,
        frame_sku: formData.frame_sku,
        frame_price: formData.frame_price,
        ...nearFrameData,
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
            ? (selectedPrescription.od_sphere ?? null)
            : null,
        contact_lens_rx_cylinder_od:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.od_cylinder ?? null)
            : null,
        contact_lens_rx_axis_od:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.od_axis ?? null)
            : null,
        contact_lens_rx_add_od:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.od_add ?? null)
            : null,
        contact_lens_rx_base_curve_od:
          lensType === "contact"
            ? formData.contact_lens_rx_base_curve_od
            : null,
        contact_lens_rx_diameter_od:
          lensType === "contact" ? formData.contact_lens_rx_diameter_od : null,
        contact_lens_rx_sphere_os:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.os_sphere ?? null)
            : null,
        contact_lens_rx_cylinder_os:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.os_cylinder ?? null)
            : null,
        contact_lens_rx_axis_os:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.os_axis ?? null)
            : null,
        contact_lens_rx_add_os:
          lensType === "contact" && selectedPrescription
            ? (selectedPrescription.os_add ?? null)
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

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCustomer ? (
            <div
              className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-secondary"
              style={{ backgroundColor: "var(--admin-border-primary)" }}
            >
              <div>
                <div className="font-medium">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </div>
                <div className="text-sm text-admin-text-tertiary">
                  {selectedCustomer.email}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSelectedPrescription(null);
                  setPrescriptions([]);
                }}
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
              <Input
                placeholder="Buscar cliente por nombre o email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-10"
              />
              {customerSearch.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchingCustomers ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : (customerResults || []).length > 0 ? (
                    customerResults.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch("");
                          setCustomerResults([]);
                        }}
                      >
                        <div className="font-medium">
                          {customer.first_name} {customer.last_name}
                        </div>
                        <div className="text-sm text-admin-text-tertiary space-y-1">
                          {customer.email && <div>{customer.email}</div>}
                          {customer.rut && <div>RUT: {customer.rut}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-admin-text-tertiary">
                      No se encontraron clientes
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription Selection */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Receta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPrescriptions ? (
              <div className="text-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-admin-text-tertiary">
                  Este cliente no tiene recetas registradas
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreatePrescription(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nueva Receta
                </Button>
              </div>
            ) : (
              <Select
                value={selectedPrescription?.id || ""}
                onValueChange={(value) => {
                  const prescription = prescriptions.find(
                    (p) => p.id === value,
                  );
                  setSelectedPrescription(prescription);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una receta" />
                </SelectTrigger>
                <SelectContent>
                  {prescriptions.map((prescription) => (
                    <SelectItem key={prescription.id} value={prescription.id}>
                      {prescription.prescription_date} -{" "}
                      {translatePrescriptionType(
                        prescription.prescription_type,
                      )}
                      {prescription.is_current && " (Actual)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {selectedPrescription && (
        <>
          <div className="p-4 border rounded-lg bg-blue-50 text-blue-900">
            <p className="font-medium mb-2">Resumen de Receta</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-semibold">OD:</span> Esf{" "}
                {selectedPrescription.od_sphere ?? "—"} / Cil{" "}
                {selectedPrescription.od_cylinder ?? "—"}
                {selectedPrescription.od_add &&
                  selectedPrescription.od_add > 0 && (
                    <span className="ml-2 text-orange-600">
                      Add: +{selectedPrescription.od_add}
                    </span>
                  )}
              </div>
              <div>
                <span className="font-semibold">OS:</span> Esf{" "}
                {selectedPrescription.os_sphere ?? "—"} / Cil{" "}
                {selectedPrescription.os_cylinder ?? "—"}
                {selectedPrescription.os_add &&
                  selectedPrescription.os_add > 0 && (
                    <span className="ml-2 text-orange-600">
                      Add: +{selectedPrescription.os_add}
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Presbyopia Solution Selector */}
          {hasAddition(selectedPrescription) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Solución para Presbicia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertDescription>
                    Esta receta tiene adición (+
                    {getMaxAddition(selectedPrescription)} D). Selecciona cómo
                    deseas manejar la presbicia.
                  </AlertDescription>
                </Alert>
                <RadioGroup
                  value={presbyopiaSolution}
                  onValueChange={(value) => {
                    const solution = value as PresbyopiaSolution;
                    setPresbyopiaSolution(solution);
                    setFormData((prev) => ({
                      ...prev,
                      presbyopia_solution: solution,
                    }));
                    if (
                      solution === "progressive" ||
                      solution === "bifocal" ||
                      solution === "trifocal"
                    ) {
                      setFormData((prev) => ({ ...prev, lens_type: solution }));
                    }
                    // Reset lens families and second frame when changing solution
                    if (solution !== "two_separate") {
                      setFarLensFamilyId("");
                      setNearLensFamilyId("");
                      setSelectedNearFrame(null);
                      setCustomerOwnNearFrame(false);
                      setNearFrameSearch("");
                      setNearFrameResults([]);
                      setFormData((prev) => ({
                        ...prev,
                        far_lens_family_id: "",
                        near_lens_family_id: "",
                        far_lens_cost: 0,
                        near_lens_cost: 0,
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
                      }));
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="progressive" id="progressive" />
                    <Label htmlFor="progressive" className="cursor-pointer">
                      Progresivo (Recomendado)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bifocal" id="bifocal" />
                    <Label htmlFor="bifocal" className="cursor-pointer">
                      Bifocal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="trifocal" id="trifocal" />
                    <Label htmlFor="trifocal" className="cursor-pointer">
                      Trifocal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="two_separate" id="two_separate" />
                    <Label htmlFor="two_separate" className="cursor-pointer">
                      Dos lentes separados (Lejos + Cerca)
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Frame Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            {presbyopiaSolution === "two_separate"
              ? "Marco para Lejos"
              : "Marco"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="customer_own_frame"
              checked={customerOwnFrame}
              onChange={(e) => {
                setCustomerOwnFrame(e.target.checked);
                if (e.target.checked) {
                  setSelectedFrame(null);
                  setFormData((prev) => ({
                    ...prev,
                    customer_own_frame: true,
                    frame_product_id: "",
                    frame_price: 0,
                    frame_cost: 0,
                  }));
                } else {
                  setFormData((prev) => ({
                    ...prev,
                    customer_own_frame: false,
                  }));
                }
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="customer_own_frame" className="cursor-pointer">
              Cliente trae marco (recambio de cristales)
            </Label>
          </div>

          {customerOwnFrame ? (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Nombre del Marco *</Label>
                <Input
                  value={formData.frame_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      frame_name: e.target.value,
                    }))
                  }
                  placeholder="Marco del cliente"
                  required
                />
              </div>
              <div>
                <Label>Número de Serie</Label>
                <Input
                  value={formData.frame_sku}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      frame_sku: e.target.value,
                    }))
                  }
                  placeholder="Número de serie del marco"
                />
              </div>
            </div>
          ) : selectedFrame ? (
            <div
              className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-secondary"
              style={{ backgroundColor: "var(--admin-border-primary)" }}
            >
              <div>
                <div className="font-medium">{selectedFrame.name}</div>
                <div className="text-sm text-admin-text-tertiary">
                  {selectedFrame.frame_brand} {selectedFrame.frame_model} ·
                  Stock:{" "}
                  {selectedFrame.total_available_quantity !== undefined
                    ? selectedFrame.total_available_quantity
                    : selectedFrame.total_inventory_quantity !== undefined
                      ? selectedFrame.total_inventory_quantity
                      : (selectedFrame.available_quantity ??
                        selectedFrame.inventory_quantity ??
                        0)}
                </div>
                <div className="text-sm font-semibold text-admin-success">
                  {formatPrice(selectedFrame.price)}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFrame(null);
                  setFormData((prev) => ({
                    ...prev,
                    frame_product_id: "",
                    frame_name: "",
                    frame_brand: "",
                    frame_model: "",
                    frame_color: "",
                    frame_size: "",
                    frame_sku: "",
                    frame_price: 0,
                    frame_cost: 0,
                  }));
                }}
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
              <Input
                placeholder="Buscar marco por nombre, marca o SKU..."
                value={frameSearch}
                onChange={(e) => setFrameSearch(e.target.value)}
                className="pl-10"
              />
              {frameSearch.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchingFrames ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : (frameResults || []).length > 0 ? (
                    frameResults.map((frame) => (
                      <div
                        key={frame.id}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                        onClick={() => handleFrameSelect(frame)}
                      >
                        <div className="font-medium">{frame.name}</div>
                        <div className="text-sm text-admin-text-tertiary">
                          {frame.frame_brand} {frame.frame_model} - Stock:{" "}
                          {frame.available_quantity ??
                            frame.inventory_quantity ??
                            0}
                        </div>
                        <div className="text-sm font-semibold text-admin-success">
                          {formatPrice(frame.price)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-admin-text-tertiary">
                      No se encontraron marcos
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Manual frame entry */}
          {!selectedFrame && !customerOwnFrame && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Nombre del Marco</Label>
                <Input
                  value={formData.frame_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      frame_name: e.target.value,
                    }))
                  }
                  placeholder="Ej: Ray-Ban RB2140"
                />
              </div>
              <div>
                <Label>Precio del Marco</Label>
                <Input
                  type="number"
                  value={formData.frame_price || ""}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    setFormData((prev) => ({
                      ...prev,
                      frame_price: price,
                      frame_cost: price,
                    }));
                  }}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Second frame for two separate lenses (near vision) */}
          {presbyopiaSolution === "two_separate" && (
            <div className="border-t pt-4 mt-4">
              <Label className="text-base font-semibold mb-2 block">
                Marco para Cerca
              </Label>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="customer_own_near_frame"
                  checked={customerOwnNearFrame}
                  onChange={(e) => {
                    setCustomerOwnNearFrame(e.target.checked);
                    if (e.target.checked) {
                      setSelectedNearFrame(null);
                      setFormData((prev) => ({
                        ...prev,
                        near_frame_product_id: "",
                        near_frame_name: "",
                        near_frame_brand: "",
                        near_frame_model: "",
                        near_frame_color: "",
                        near_frame_size: "",
                        near_frame_sku: "",
                        near_frame_price: 0,
                        near_frame_cost: 0,
                      }));
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label
                  htmlFor="customer_own_near_frame"
                  className="cursor-pointer"
                >
                  Cliente trae marco (recambio de cristales)
                </Label>
              </div>
              {customerOwnNearFrame ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre del Marco (Cerca) *</Label>
                    <Input
                      value={formData.near_frame_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          near_frame_name: e.target.value,
                        }))
                      }
                      placeholder="Marco del cliente"
                      required
                    />
                  </div>
                  <div>
                    <Label>Número de Serie</Label>
                    <Input
                      value={formData.near_frame_sku}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          near_frame_sku: e.target.value,
                        }))
                      }
                      placeholder="Número de serie del marco"
                    />
                  </div>
                </div>
              ) : selectedNearFrame ? (
                <div
                  className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-secondary"
                  style={{ backgroundColor: "var(--admin-border-primary)" }}
                >
                  <div>
                    <div className="font-medium">{selectedNearFrame.name}</div>
                    <div className="text-sm text-admin-text-tertiary">
                      {selectedNearFrame.frame_brand}{" "}
                      {selectedNearFrame.frame_model} · Stock:{" "}
                      {selectedNearFrame.available_quantity ??
                        selectedNearFrame.inventory_quantity ??
                        0}
                    </div>
                    <div className="text-sm font-semibold text-admin-success">
                      {formatPrice(selectedNearFrame.price)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedNearFrame(null);
                      setFormData((prev) => ({
                        ...prev,
                        near_frame_product_id: "",
                        near_frame_name: "",
                        near_frame_brand: "",
                        near_frame_model: "",
                        near_frame_color: "",
                        near_frame_size: "",
                        near_frame_sku: "",
                        near_frame_price: 0,
                        near_frame_cost: 0,
                      }));
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
                  <Input
                    placeholder="Buscar marco para cerca por nombre, marca o SKU..."
                    value={nearFrameSearch}
                    onChange={(e) => setNearFrameSearch(e.target.value)}
                    className="pl-10"
                  />
                  {nearFrameSearch.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchingNearFrames ? (
                        <div className="p-4 text-center">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      ) : (nearFrameResults || []).length > 0 ? (
                        nearFrameResults.map((frame) => (
                          <div
                            key={frame.id}
                            className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                            onClick={() => handleNearFrameSelect(frame)}
                          >
                            <div className="font-medium">{frame.name}</div>
                            <div className="text-sm text-admin-text-tertiary">
                              {frame.frame_brand} {frame.frame_model} - Stock:{" "}
                              {frame.available_quantity ??
                                frame.inventory_quantity ??
                                0}
                            </div>
                            <div className="text-sm font-semibold text-admin-success">
                              {formatPrice(frame.price)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-admin-text-tertiary">
                          No se encontraron marcos
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Manual near frame entry */}
              {!selectedNearFrame && !customerOwnNearFrame && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Nombre del Marco (Cerca)</Label>
                    <Input
                      value={formData.near_frame_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          near_frame_name: e.target.value,
                        }))
                      }
                      placeholder="Ej: Ray-Ban RB2140"
                    />
                  </div>
                  <div>
                    <Label>Precio del Marco (Cerca)</Label>
                    <Input
                      type="number"
                      value={formData.near_frame_price || ""}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          near_frame_price: price,
                          near_frame_cost: price,
                        }));
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lens Configuration */}
      {selectedPrescription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              {presbyopiaSolution === "two_separate"
                ? "Configuración de Lentes"
                : "Configuración de Lente"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lens Type Toggle: Optical vs Contact */}
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
              <Label className="font-medium">Tipo de Lente:</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={lensType === "optical" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLensType("optical");
                    // Reset contact lens fields when switching to optical
                    setFormData((prev) => ({
                      ...prev,
                      contact_lens_family_id: "",
                      contact_lens_quantity: 1,
                      contact_lens_cost: 0,
                      contact_lens_price: 0,
                    }));
                  }}
                >
                  Lentes Ópticos
                </Button>
                <Button
                  type="button"
                  variant={lensType === "contact" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setLensType("contact");
                    // Reset optical lens fields when switching to contact
                    setFormData((prev) => ({
                      ...prev,
                      lens_family_id: "",
                      lens_cost: 0,
                    }));
                  }}
                >
                  Lentes de Contacto
                </Button>
              </div>
            </div>

            {/* Contact Lens Configuration */}
            {lensType === "contact" ? (
              <div className="space-y-4">
                <div>
                  <Label>Familia de Lentes de Contacto</Label>
                  <ContactLensFamilyCombobox
                    value={formData.contact_lens_family_id || ""}
                    onChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        contact_lens_family_id: value,
                        contact_lens_cost: 0,
                        contact_lens_price: 0,
                      }));
                    }}
                    families={contactLensFamilies}
                    loading={loadingContactLensFamilies}
                    categorySlug="lentes-contacto"
                  />
                </div>

                {formData.contact_lens_family_id && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Cantidad de Cajas</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.contact_lens_quantity || 1}
                          onChange={(e) => {
                            const quantity = parseInt(e.target.value) || 1;
                            setFormData((prev) => ({
                              ...prev,
                              contact_lens_quantity: quantity,
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Precio Total</Label>
                        <Input
                          type="number"
                          value={formData.contact_lens_price || ""}
                          onChange={(e) => {
                            const price = parseFloat(e.target.value) || 0;
                            setFormData((prev) => ({
                              ...prev,
                              contact_lens_price: price,
                            }));
                          }}
                          placeholder="Se calcula automáticamente"
                        />
                      </div>
                    </div>
                    {calculatingContactLensPrice && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Calculando precio del lente de contacto...</span>
                      </div>
                    )}
                  </>
                )}

                {/* Las mediciones de receta para lentes de contacto se toman de la receta seleccionada (Resumen de Receta arriba). */}
              </div>
            ) : (
              /* Optical Lens Configuration (existing code) */
              <>
                {presbyopiaSolution === "two_separate" ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Far Lens */}
                    <div className="space-y-2">
                      <Label>Lente de Lejos</Label>
                      <LensFamilyCombobox
                        value={farLensFamilyId || ""}
                        onChange={(familyId) => {
                          setFarLensFamilyId(familyId);
                          setFormData((prev) => ({
                            ...prev,
                            far_lens_family_id: familyId,
                          }));
                        }}
                        presbyopiaSolution="two_separate"
                        families={lensFamilies}
                        loading={loadingFamilies}
                      />
                      {farLensCost > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          Precio: ${farLensCost.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Near Lens */}
                    <div className="space-y-2">
                      <Label>Lente de Cerca</Label>
                      <LensFamilyCombobox
                        value={nearLensFamilyId || ""}
                        onChange={(familyId) => {
                          setNearLensFamilyId(familyId);
                          setFormData((prev) => ({
                            ...prev,
                            near_lens_family_id: familyId,
                          }));
                        }}
                        presbyopiaSolution="two_separate"
                        families={lensFamilies}
                        loading={loadingFamilies}
                      />
                      {nearLensCost > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          Precio: ${nearLensCost.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Familia de Lentes</Label>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                          Selecciona una familia de lentes para calcular
                          automáticamente el precio según la prescripción. Cada
                          familia tiene características específicas (tipo,
                          material) que se aplicarán al presupuesto.
                        </div>
                      </div>
                    </div>
                    <LensFamilyCombobox
                      value={formData.lens_family_id || ""}
                      onChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          lens_family_id: value,
                          lens_cost: 0,
                        }));
                      }}
                      presbyopiaSolution={presbyopiaSolution}
                      families={lensFamilies}
                      loading={loadingFamilies}
                      placeholder="Selecciona familia (opcional)"
                    />
                    {formData.lens_family_id &&
                      (() => {
                        const selectedFamily = lensFamilies.find(
                          (f) => f.id === formData.lens_family_id,
                        );
                        return selectedFamily?.description ? (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            <p className="font-semibold mb-1">
                              {selectedFamily.name}
                            </p>
                            <p>{selectedFamily.description}</p>
                          </div>
                        ) : null;
                      })()}
                    <p className="text-xs text-gray-500 mt-1">
                      Si seleccionas una familia, el precio se calculará
                      automáticamente según la prescripción
                      {presbyopiaSolution !== "none" &&
                        ` y adición (+${getMaxAddition(selectedPrescription)} D)`}
                    </p>
                  </div>
                )}
                {/* Hide manual lens configuration when two_separate and families are selected */}
                {presbyopiaSolution === "two_separate" ? (
                  farLensFamilyId || nearLensFamilyId ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        La configuración de lentes se determina automáticamente
                        según las familias seleccionadas.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-2">
                        No hay familias de lentes seleccionadas. Los precios de
                        los lentes deben ingresarse manualmente en la sección de
                        "Precios y Costos".
                      </p>
                      <p className="text-xs text-yellow-700">
                        Tip: Selecciona familias de lentes para calcular los
                        precios automáticamente según la prescripción.
                      </p>
                    </div>
                  )
                ) : formData.lens_family_id ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Tipo: {formData.lens_type || "—"} · Material:{" "}
                      {formData.lens_material || "—"} (heredados de la familia)
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      No hay familia de lentes seleccionada. El precio del lente
                      debe ingresarse manualmente en la sección de "Precios y
                      Costos" → "Costo interno de Lente".
                    </p>
                    <p className="text-xs text-yellow-700">
                      Tip: Selecciona una familia de lentes para calcular el
                      precio automáticamente según la prescripción.
                    </p>
                  </div>
                )}
                {calculatingPrice && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calculando precio del lente...</span>
                  </div>
                )}
              </>
            )}

            {/* Hide manual lens index when two_separate and families are selected */}
            {!(
              presbyopiaSolution === "two_separate" &&
              (farLensFamilyId || nearLensFamilyId)
            ) && (
              <div>
                <Label>Índice de Refracción</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.lens_index || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lens_index: formData.lens_family_id
                        ? prev.lens_index
                        : parseFloat(e.target.value) || null,
                    }))
                  }
                  placeholder={
                    formData.lens_family_id
                      ? formData.lens_index
                        ? formData.lens_index.toString()
                        : "—"
                      : "Ej: 1.67"
                  }
                  readOnly={!!formData.lens_family_id}
                  className={formData.lens_family_id ? "bg-gray-50" : ""}
                />
                {formData.lens_family_id && formData.lens_material && (
                  <p className="text-xs text-gray-500 mt-1">
                    Índice automático según material: {formData.lens_material}
                  </p>
                )}
              </div>
            )}

            {/* Tratamientos solo para lentes ópticos; no aplican a lentes de contacto */}
            {presbyopiaSolution !== "two_separate" &&
              lensType === "optical" && (
                <div>
                  <Label>Tratamientos y Recubrimientos</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Con familia: ocultamos estándar (AR, Blue, UV, Anti-rayas,
                    Foto, Polarizado). Extras permitidos: Tinte, Prisma.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableTreatments
                      .filter((t) => {
                        if (!formData.lens_family_id) return true;
                        return t.value === "tint" || t.value === "prism_extra";
                      })
                      .map((treatment) => {
                        const isSelected = formData.lens_treatments.includes(
                          treatment.value,
                        );
                        const disabled =
                          !!formData.lens_family_id &&
                          [
                            "anti_reflective",
                            "blue_light_filter",
                            "uv_protection",
                            "scratch_resistant",
                            "anti_fog",
                            "photochromic",
                            "polarized",
                          ].includes(treatment.value);
                        return (
                          <div
                            key={treatment.value}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? "border-admin-success bg-admin-success/10"
                                : "border-gray-200 hover:border-epoch-primary"
                            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                            onClick={() =>
                              !disabled && handleTreatmentToggle(treatment)
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {isSelected && (
                                  <CheckCircle className="h-4 w-4 text-admin-success mr-2" />
                                )}
                                <span
                                  className={isSelected ? "font-medium" : ""}
                                >
                                  {treatment.label}
                                </span>
                              </div>
                              <Badge variant="outline">
                                {formatPrice(treatment.cost)}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {!formData.lens_family_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Sin familia: puedes agregar cualquier tratamiento
                      manualmente.
                    </p>
                  )}

                  {/* Tint options */}
                  {formData.lens_treatments.includes("tint") && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>Color del Tinte</Label>
                        <Input
                          value={formData.lens_tint_color}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              lens_tint_color: e.target.value,
                            }))
                          }
                          placeholder="Ej: Gris, Marrón, Verde"
                        />
                      </div>
                      <div>
                        <Label>Porcentaje de Tinte (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.lens_tint_percentage || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              lens_tint_percentage:
                                parseInt(e.target.value) || 0,
                            }))
                          }
                          placeholder="0-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Precios y Costos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span className="font-medium">
                {formatPrice(formData.subtotal)}
              </span>
            </div>
            {formData.discount_amount > 0 && (
              <div className="flex justify-between mb-2">
                <span>
                  Descuento{" "}
                  {discountType === "percentage"
                    ? `(${formData.discount_percentage.toFixed(2)}%)`
                    : "(Valor fijo)"}
                  :
                </span>
                <span className="font-medium text-red-500">
                  -{formatPrice(formData.discount_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between mb-2">
              <span>IVA (19%):</span>
              <span className="font-medium">
                {formatPrice(formData.tax_amount)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-admin-success">
                {formatPrice(formData.total_amount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Descuento</Label>
              <Select
                value={discountType}
                onValueChange={(value: "percentage" | "amount") => {
                  setDiscountType(value);
                  // Clear the other discount field when switching types
                  if (value === "percentage") {
                    setFormData((prev) => ({ ...prev, discount_amount: 0 }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      discount_percentage: 0,
                    }));
                  }
                  // Recalculate total after clearing
                  setTimeout(() => calculateTotal(), 0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Por Porcentaje (%)</SelectItem>
                  <SelectItem value="amount">Por Valor ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {discountType === "percentage"
                  ? "Descuento (%)"
                  : "Descuento ($)"}
              </Label>
              <Input
                type="number"
                min="0"
                max={discountType === "percentage" ? "100" : undefined}
                step={discountType === "percentage" ? "0.01" : "1"}
                value={
                  discountType === "percentage"
                    ? formData.discount_percentage || ""
                    : formData.discount_amount || ""
                }
                onChange={(e) => {
                  const value =
                    discountType === "percentage"
                      ? parseFloat(e.target.value) || 0
                      : parseFloat(e.target.value) || 0;

                  setFormData((prev) => ({
                    ...prev,
                    [discountType === "percentage"
                      ? "discount_percentage"
                      : "discount_amount"]: value,
                  }));
                }}
              />
            </div>
          </div>

          {/* Datos internos (ocultar al cliente) */}
          <div className="border rounded-lg">
            <details>
              <summary className="px-4 py-2 cursor-pointer text-sm font-medium">
                Datos internos (no mostrar al cliente)
              </summary>
              <div className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <Label>Costo interno de Marco</Label>
                  <Input
                    type="number"
                    value={
                      presbyopiaSolution === "two_separate"
                        ? (formData.frame_cost || 0) +
                          (formData.near_frame_cost || 0)
                        : formData.frame_cost || ""
                    }
                    onChange={(e) => {
                      if (presbyopiaSolution === "two_separate") {
                        // For two_separate, don't allow manual editing - it's calculated from far + near frames
                        return;
                      }
                      const newValue = parseFloat(e.target.value) || 0;
                      setFormData((prev) => ({
                        ...prev,
                        frame_cost: newValue,
                      }));
                      // No need to call calculateTotal here - useEffect will handle it when formData.frame_cost changes
                    }}
                    className={
                      presbyopiaSolution === "two_separate" ? "bg-gray-50" : ""
                    }
                    readOnly={presbyopiaSolution === "two_separate"}
                  />
                  {presbyopiaSolution === "two_separate" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Suma automática: Marco Lejos ($
                      {(formData.frame_cost || 0).toLocaleString()}) + Marco
                      Cerca (${(formData.near_frame_cost || 0).toLocaleString()}
                      )
                    </p>
                  )}
                </div>
                <div>
                  <Label>Costo interno de Lente</Label>
                  <Input
                    type="number"
                    value={
                      presbyopiaSolution === "two_separate"
                        ? (formData.far_lens_cost || 0) +
                          (formData.near_lens_cost || 0)
                        : formData.lens_cost || ""
                    }
                    onChange={(e) => {
                      if (presbyopiaSolution === "two_separate") {
                        // For two_separate, don't allow manual editing - it's calculated from far + near
                        return;
                      }
                      const newValue = parseFloat(e.target.value) || 0;
                      setFormData((prev) => ({
                        ...prev,
                        lens_cost: newValue,
                      }));
                      // No need to call calculateTotal here - useEffect will handle it when formData.lens_cost changes
                    }}
                    className={
                      presbyopiaSolution === "two_separate" ||
                      (formData.lens_family_id && !manualLensPrice)
                        ? "bg-gray-50"
                        : ""
                    }
                    readOnly={
                      presbyopiaSolution === "two_separate" ||
                      (!!formData.lens_family_id && !manualLensPrice)
                    }
                  />
                  {presbyopiaSolution === "two_separate" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Suma automática: Lejos ($
                      {(formData.far_lens_cost || 0).toLocaleString()}) + Cerca
                      (${(formData.near_lens_cost || 0).toLocaleString()})
                    </p>
                  )}
                  {formData.lens_family_id && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setManualLensPrice((v) => !v)}
                      >
                        {manualLensPrice ? "Auto" : "Manual"}
                      </Button>
                      {!manualLensPrice && (
                        <p className="text-xs text-gray-500">
                          Precio calculado automáticamente. Activa "Manual" para
                          editar.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Costo interno de Tratamientos</Label>
                  <Input
                    type="number"
                    value={formData.treatments_cost || ""}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label>Costo interno Mano de Obra</Label>
                  <Input
                    type="number"
                    value={formData.labor_cost || ""}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value) || 0;
                      setFormData((prev) => ({
                        ...prev,
                        labor_cost: newValue,
                      }));
                      // No need to call calculateTotal here - useEffect will handle it when formData.labor_cost changes
                    }}
                    placeholder="Ej: 15000"
                  />
                </div>
              </div>
            </details>
          </div>

          <div>
            <Label>Validez del Presupuesto (días)</Label>
            <Input
              type="number"
              value={formData.expiration_days}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  expiration_days: parseInt(e.target.value) || 30,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Notas Internas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Notas para el equipo..."
              rows={3}
            />
          </div>
          <div>
            <Label>Notas para el Cliente</Label>
            <Textarea
              value={formData.customer_notes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customer_notes: e.target.value,
                }))
              }
              placeholder="Notas visibles para el cliente..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Crear Presupuesto
            </>
          )}
        </Button>
      </div>

      {/* Create Prescription Dialog */}
      {selectedCustomer && (
        <Dialog
          open={showCreatePrescription}
          onOpenChange={setShowCreatePrescription}
        >
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Receta</DialogTitle>
              <DialogDescription>
                Crea una nueva receta oftalmológica para{" "}
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </DialogDescription>
            </DialogHeader>
            <CreatePrescriptionForm
              customerId={selectedCustomer.id}
              onSuccess={() => {
                setShowCreatePrescription(false);
                fetchPrescriptions(selectedCustomer.id);
              }}
              onCancel={() => setShowCreatePrescription(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}
