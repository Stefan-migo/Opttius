/**
 * POSAdvancedSale - Complete Optical Sale Form
 * Handles "Venta Óptica" / "Crear Orden Completa" functionality
 *
 * This component provides a multi-step form for optical sales:
 * 1. Customer & Prescription selection
 * 2. Frame selection
 * 3. Lens family and treatments selection
 * 4. Pricing and cart addition
 */

"use client";

// Icons
import {
  Check,
  Glasses,
  Package,
  Search,
  Sparkles,
  Tag,
  User,
  X,
  CircleDot,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createCustomer,
  getPrescriptions,
  type Prescription,
} from "@/lib/api/services/customerService";
import { searchProducts } from "@/lib/api/services/productService";
import {
  type QuoteSettings,
  quoteSettingsService,
} from "@/lib/api/services/quoteSettingsService";
import { createQuote } from "@/lib/api/services/quoteService";
import { formatCurrency } from "@/lib/utils";
import {
  ContactLensSelector,
  type ContactLensOrderConfig,
} from "./ContactLensSelector";

import type {
  POSProduct,
  OrderFormData,
  ExternalPrescriptionData,
  Treatment,
  POSAdvancedSaleProps,
} from "./POSAdvancedSale.types";

// Re-export types for consumers that imported from here
export type {
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
// Re-export constants for consumers that imported from here
export {
  DEFAULT_LENS_FAMILIES,
  DEFAULT_TREATMENTS,
} from "./POSAdvancedSale.constants";

export function POSAdvancedSale({
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
    // Check if we have either a registered customer or quick customer data
    const isQuickCustomer =
      !customer && (quickCustomerName || quickCustomerRUT);

    if (!customer && !isQuickCustomer) {
      toast.error("Selecciona un cliente primero");
      return;
    }

    setCreatingQuote(true);
    try {
      let customerId = customer?.id;

      // Validate branch exists before creating customer
      if (!branchId) {
        toast.error("Selecciona una sucursal primero");
        setCreatingQuote(false);
        return;
      }

      // If quick customer, create the user first
      if (isQuickCustomer) {
        // Validate that we have at least a name
        const trimmedName = (quickCustomerName || "").trim();
        if (!trimmedName) {
          toast.error("El nombre del cliente es requerido");
          setCreatingQuote(false);
          return;
        }

        try {
          // Parse name into first_name and last_name
          const nameParts = trimmedName.split(" ");
          const firstName = nameParts[0];
          const lastName =
            nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

          const newCustomer = await createCustomer({
            first_name: firstName,
            last_name: lastName || undefined,
            email: quickCustomerEmail?.trim() || undefined,
            phone: quickCustomerPhone?.trim() || undefined,
            rut: quickCustomerRUT?.trim() || undefined,
            branch_id: branchId ?? undefined,
          });

          customerId = newCustomer.id;
          toast.success("Cliente creado exitosamente");
        } catch (error) {
          console.error("Error creating customer:", error);
          toast.error("Error al crear el cliente");
          setCreatingQuote(false);
          return;
        }
      }

      // Validate branch exists before creating quote
      if (!branchId) {
        toast.error("Selecciona una sucursal primero");
        setCreatingQuote(false);
        return;
      }

      const quoteData = {
        customer_id: customerId!,
        status: "draft" as const,
        subtotal: totalPrice(),
        tax_amount: 0,
        discount_amount: discountAmount(),
        total_amount: totalPrice() - discountAmount(),
        currency: "CLP",
        notes: orderFormData.notes || undefined,
        branch_id: branchId,
        // Prescription
        prescription_id: selectedPrescription?.id || null,
        // Frame
        frame_product_id: selectedFrame?.id || null,
        customer_own_frame: orderFormData.customer_own_frame,
        frame_name: orderFormData.frame_name || selectedFrame?.name || null,
        frame_brand: selectedFrame?.brand || null,
        frame_model: selectedFrame?.name || null,
        frame_sku: orderFormData.frame_sku || selectedFrame?.sku || null,
        frame_price: selectedFrame?.price || 0,
        // Lens
        lens_family_id: orderFormData.lens_family_id,
        lens_family_name: orderFormData.lens_family_name,
        lens_type: orderFormData.lens_type,
        lens_treatments: orderFormData.treatment_ids,
        treatments_cost: treatmentsPrice,
        labor_cost: orderFormData.labor_cost,
        // Presbyopia solution - map "single" to "bifocal"
        presbyopia_solution:
          orderFormData.presbyopia_solution === "single"
            ? ("bifocal" as const)
            : orderFormData.presbyopia_solution === "two_separate"
              ? ("two_separate" as const)
              : ("progressive" as const),
        far_lens_family_id: orderFormData.lens_family_id,
        near_lens_family_id: orderFormData.near_lens_family_id,
        far_lens_cost:
          orderFormData.presbyopia_solution === "two_separate"
            ? 45000
            : lensPrice(),
        near_lens_cost:
          orderFormData.presbyopia_solution === "two_separate"
            ? 35000
            : (undefined as number | undefined),
        // Near frame (for two_separate)
        near_frame_product_id: selectedNearFrame?.id || null,
        near_frame_name:
          orderFormData.near_frame_name || selectedNearFrame?.name || null,
        near_frame_brand: selectedNearFrame?.brand || null,
        near_frame_model: selectedNearFrame?.name || null,
        near_frame_sku:
          orderFormData.near_frame_sku || selectedNearFrame?.sku || null,
        near_frame_price: selectedNearFrame?.price || 0,
        customer_own_near_frame: customerOwnNearFrame,
      };

      const quote = await createQuote(quoteData);
      toast.success(
        isQuickCustomer
          ? "Cliente y presupuesto creados exitosamente"
          : "Presupuesto creado exitosamente",
      );

      // Open print dialog (simplified - in production would open a print view)
      window.open(`/admin/quotes/${quote.id}/print`, "_blank");
    } catch (error) {
      console.error("Error creating quote:", error);
      // Log more details for debugging
      if (error instanceof Response) {
        error
          .json()
          .then((err) => {
            console.error("API Error details:", err);
            toast.error(err.error || "Error al crear el presupuesto");
          })
          .catch(() => {
            toast.error("Error al crear el presupuesto");
          });
      } else if (error instanceof Error) {
        toast.error(error.message || "Error al crear el presupuesto");
      } else {
        toast.error("Error al crear el presupuesto");
      }
    } finally {
      setCreatingQuote(false);
    }
  };

  // Load quote settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Load settings
      const settings = await quoteSettingsService.get();

      if (settings) {
        setQuoteSettings(settings);

        // Update treatments with settings prices
        if (settings.treatment_prices) {
          const tp = settings.treatment_prices;

          setTreatments((prev) => {
            let updated = prev.map((t) => {
              const tpValue = tp[t.value as keyof typeof tp];
              const price =
                typeof tpValue === "number"
                  ? tpValue
                  : (tpValue as { price?: number })?.price;
              return price !== undefined && price > 0
                ? { ...t, cost: price }
                : t;
            });

            // Agregar custom_service si está habilitado
            if (tp.custom_service?.enabled) {
              updated.push({
                id: "t-custom",
                label: tp.custom_service.name || "Servicio Extra",
                value: "custom_service",
                cost: tp.custom_service.price || 0,
                category: "coating",
                editable: true,
              });
            }

            return updated;
          });
        }
      }

      // Set default labor cost
      if (settings?.default_labor_cost && settings.default_labor_cost > 0) {
        setOrderFormData((prev) => ({
          ...prev,
          labor_cost: settings.default_labor_cost,
        }));
      }
    };
    loadSettings();
  }, []);

  // Load prescriptions when customer changes
  useEffect(() => {
    const loadPrescriptions = async () => {
      if (!customer?.id) {
        setPrescriptions([]);
        setSelectedPrescription(null);
        return;
      }

      setLoadingPrescriptions(true);
      try {
        const data = await getPrescriptions(customer.id);
        setPrescriptions(data || []);
        // Auto-select current prescription if available
        const current = data?.find((p) => p.is_current);
        if (current) {
          setSelectedPrescription(current);
        }
      } catch (error) {
        console.error("Error loading prescriptions:", error);
        setPrescriptions([]);
      } finally {
        setLoadingPrescriptions(false);
      }
    };
    loadPrescriptions();
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
    if (!selectedPrescription) return;

    const { od_sphere, os_sphere, od_add, os_add } = selectedPrescription;

    // Check if progressive (has addition)
    const hasAddition = (od_add && od_add > 0) || (os_add && os_add > 0);

    // Check for high myopia/hyperopia in distance vision
    const maxSphere = Math.max(
      Math.abs(od_sphere || 0),
      Math.abs(os_sphere || 0),
    );

    // Calculate near vision sphere (distance sphere + addition)
    const addValue = od_add || os_add || 0;
    const nearSphere = (od_sphere || 0) + addValue;
    const maxNearSphere = Math.max(
      Math.abs(nearSphere),
      Math.abs((os_sphere || 0) + addValue),
    );

    let suggestedFamily = "";
    let suggestedNearFamily = "";
    let suggestedSolution: "single" | "two_separate" | "progressive" = "single";

    if (hasAddition) {
      // Suggest progressive by default for prescriptions with addition
      if (maxSphere > 4) {
        suggestedFamily = "lf-7"; // Personalized progressive for high prescriptions
      } else if (maxSphere > 2) {
        suggestedFamily = "lf-6"; // Premium progressive
      } else {
        suggestedFamily = "lf-5"; // Standard progressive
      }

      // Also suggest near lens families for two_separate solution
      // Near lens typically uses the same material as distance but with near addition
      if (maxNearSphere > 4) {
        suggestedNearFamily = "lf-3"; // High index 1.74
      } else if (maxNearSphere > 3) {
        suggestedNearFamily = "lf-2"; // High index 1.67
      } else {
        suggestedNearFamily = "lf-1"; // Standard CR-39
      }
    } else {
      // Single vision suggestion (no addition)
      if (maxSphere > 6) {
        suggestedFamily = "lf-3"; // High index 1.74
      } else if (maxSphere > 3) {
        suggestedFamily = "lf-2"; // High index 1.67
      } else {
        suggestedFamily = "lf-1"; // Standard CR-39
      }
    }

    // Auto-select suggested families and presbyopia solution
    const family = lensFamilies.find((f) => f.id === suggestedFamily);
    const nearFamily = lensFamilies.find((f) => f.id === suggestedNearFamily);

    if (family && orderFormData.lens_type === family.lens_type) {
      // Only set the solution if not already set by the user
      const newSolution = hasAddition ? "progressive" : "single";

      setOrderFormData((prev) => ({
        ...prev,
        lens_family_id: suggestedFamily,
        lens_family_name: family.name,
        // Only auto-suggest near family if user hasn't selected one
        near_lens_family_id:
          prev.near_lens_family_id ||
          (hasAddition ? suggestedNearFamily : null),
        near_lens_family_name:
          prev.near_lens_family_name ||
          (hasAddition && nearFamily ? nearFamily.name : null),
        presbyopia_solution: hasAddition
          ? newSolution
          : prev.presbyopia_solution,
      }));
    }
  }, [selectedPrescription, lensFamilies, orderFormData.lens_type]);

  // Calculate prices
  const treatmentsPrice = orderFormData.treatment_ids.reduce((total, id) => {
    const treatment = treatments.find((t) => t.id === id);
    return total + (treatment?.cost || 0);
  }, 0);

  // Calculate lens price based on family and solution type
  const lensPriceValue = useMemo(() => {
    if (!orderFormData.lens_family_id) return 0;
    const family = lensFamilies.find(
      (f) => f.id === orderFormData.lens_family_id,
    );
    if (!family) return 0;

    // Default prices based on lens type
    if (family.lens_type === "contact") {
      return 25000; // Contact lenses default price
    }

    // Vision lens prices based on solution type
    switch (orderFormData.presbyopia_solution) {
      case "progressive":
        return 120000;
      case "two_separate":
        return 80000;
      default:
        return 45000;
    }
  }, [
    orderFormData.lens_family_id,
    orderFormData.presbyopia_solution,
    lensFamilies,
  ]);

  // Calculate near lens price for two_separate solution
  const nearLensPriceValue = useMemo(() => {
    if (!orderFormData.near_lens_family_id) return 0;
    const family = lensFamilies.find(
      (f) => f.id === orderFormData.near_lens_family_id,
    );
    if (!family) return 0;
    return 35000; // Fixed near lens price
  }, [orderFormData.near_lens_family_id, lensFamilies]);

  // Wrapper function for lens price
  const lensPrice = useCallback(() => lensPriceValue, [lensPriceValue]);

  const totalPrice = useCallback(() => {
    let total = 0;

    // Add frame price
    if (selectedFrame && !orderFormData.customer_own_frame) {
      total += selectedFrame.price || 0;
    }

    // Add lens price
    total += lensPrice();

    // Add treatments price
    total += treatmentsPrice;

    // Add labor cost
    total += orderFormData.labor_cost;

    // Apply discount
    if (discountType === "percentage" && discountValue > 0) {
      total = total * (1 - discountValue / 100);
    } else if (discountType === "fixed" && discountValue > 0) {
      total = Math.max(0, total - discountValue);
    }

    return total;
  }, [
    selectedFrame,
    orderFormData.customer_own_frame,
    lensPrice,
    treatmentsPrice,
    orderFormData.labor_cost,
    discountType,
    discountValue,
  ]);

  // Calculate discount amount for display
  const discountAmount = useCallback(() => {
    let subtotal = 0;

    if (selectedFrame && !orderFormData.customer_own_frame) {
      subtotal += selectedFrame.price || 0;
    }
    subtotal += lensPrice();
    subtotal += treatmentsPrice;
    subtotal += orderFormData.labor_cost;

    if (discountType === "percentage" && discountValue > 0) {
      return subtotal * (discountValue / 100);
    } else if (discountType === "fixed" && discountValue > 0) {
      return discountValue;
    }
    return 0;
  }, [
    selectedFrame,
    orderFormData.customer_own_frame,
    lensPrice,
    treatmentsPrice,
    orderFormData.labor_cost,
    discountType,
    discountValue,
  ]);

  // Update treatment price
  const updateTreatmentPrice = (treatmentId: string, newPrice: number) => {
    setTreatments((prev) =>
      prev.map((t) => (t.id === treatmentId ? { ...t, cost: newPrice } : t)),
    );
  };

  // Filter treatments based on lens type
  const filteredTreatments = treatments.filter((t) => {
    if (orderFormData.lens_type === "contact") {
      // Contact lenses only: only show coatings that make sense
      return (
        t.category === "coating" &&
        !["photochromic", "polarized", "tint"].includes(t.value)
      );
    }
    // Vision lenses: show all
    return true;
  });

  // Search frames
  const searchFrames = useCallback(
    async (search: string) => {
      if (!branchId || search.length < 2) {
        setFrameResults([]);
        return;
      }

      setFrameLoading(true);
      try {
        const products = await searchProducts(search, branchId, "frame");

        // Filter for frames (products with product_type = "frame" or category containing "marco")
        const frames = products.filter(
          (p) =>
            p.product_type === "frame" ||
            p.name.toLowerCase().includes("marco") ||
            p.name.toLowerCase().includes("armazón") ||
            p.name.toLowerCase().includes("anteojo"),
        );

        setFrameResults(frames);
      } catch (error) {
        console.error("Error creating quote:", error);
        // Log more details for debugging
        const err = error as { error?: string; message?: string };
        if (err.error) {
          toast.error(err.error);
        } else if (err.message) {
          toast.error(err.message);
        } else {
          toast.error("Error al crear el presupuesto - revisa la consola");
        }
      } finally {
        setFrameLoading(false);
      }
    },
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
    async (search: string) => {
      if (!branchId || search.length < 2) {
        setNearFrameResults([]);
        return;
      }

      setNearFrameLoading(true);
      try {
        const products = await searchProducts(search, branchId, "frame");

        // Filter for frames
        const frames = products.filter(
          (p) =>
            p.product_type === "frame" ||
            p.name.toLowerCase().includes("marco") ||
            p.name.toLowerCase().includes("armazón") ||
            p.name.toLowerCase().includes("anteojo"),
        );

        setNearFrameResults(frames);
      } catch (error) {
        console.error("Error searching near frames:", error);
        setNearFrameResults([]);
      } finally {
        setNearFrameLoading(false);
      }
    },
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
    const items: Array<{
      product: POSProduct;
      quantity: number;
      unitPrice: number;
      metadata?: Record<string, unknown>;
    }> = [];

    const baseTimestamp = Date.now();
    const currentLensPrice = lensPrice();

    // Add Contact Lens if configured
    if (contactLensConfig && orderFormData.lens_type === "contact") {
      items.push({
        product: {
          id: `contact-lens-${contactLensConfig.family_id}-${baseTimestamp}`,
          name: `${contactLensConfig.family_name} (${contactLensConfig.family_brand}) - ${contactLensConfig.quantity} caja(s)`,
          sku: `CL-${contactLensConfig.family_id.slice(0, 8)}`,
          price: contactLensConfig.price,
          price_includes_tax: true,
          product_type: "contact_lens",
        },
        quantity: 1, // La cantidad está en la configuración (cajas)
        unitPrice: contactLensConfig.price,
        metadata: {
          isContactLens: true,
          contactLensFamilyId: contactLensConfig.family_id,
          contactLensFamilyName: contactLensConfig.family_name,
          contactLensBrand: contactLensConfig.family_brand,
          contactLensPrescription: contactLensConfig.prescription,
          contactLensQuantity: contactLensConfig.quantity,
          contactLensInStock: contactLensConfig.inStock,
        },
      });
    }

    // Add frame(s) if selected
    else if (selectedFrame && !orderFormData.customer_own_frame) {
      // Frame for distance vision (or single vision)
      const frameName =
        orderFormData.presbyopia_solution === "two_separate"
          ? `${orderFormData.frame_name || selectedFrame.name} (Lejos)`
          : orderFormData.frame_name || selectedFrame.name;

      items.push({
        product: {
          ...selectedFrame,
          id: `${selectedFrame.id}-${baseTimestamp}`,
          name: frameName,
        },
        quantity: 1,
        unitPrice: selectedFrame.price || 0,
        metadata: {
          isFrame: true,
          frameProductId: selectedFrame.id,
          frameType:
            orderFormData.presbyopia_solution === "two_separate"
              ? "distance"
              : "single",
        },
      });

      // Add second frame for near vision (only for two_separate solution and not customer owned)
      if (
        orderFormData.presbyopia_solution === "two_separate" &&
        selectedNearFrame &&
        !customerOwnNearFrame
      ) {
        const nearFrameName = `${orderFormData.frame_name || selectedNearFrame.name} (Cerca)`;
        items.push({
          product: {
            ...selectedNearFrame,
            id: `${selectedNearFrame.id}-${baseTimestamp}-near`,
            name: nearFrameName,
          },
          quantity: 1,
          unitPrice: selectedNearFrame.price || 0,
          metadata: {
            isFrame: true,
            frameProductId: selectedNearFrame.id,
            frameType: "near",
          },
        });
      }
    }

    // Add lens product(s) - Only for optical lenses (not contact lenses)
    if (orderFormData.lens_type === "vision" && orderFormData.lens_family_id) {
      const lensFamily = lensFamilies.find(
        (f) => f.id === orderFormData.lens_family_id,
      );
      // For distance lens (or single lens)
      const lensName = lensFamily ? `${lensFamily.name}` : "Lentes";

      items.push({
        product: {
          id: `lens-${orderFormData.lens_family_id}-${baseTimestamp}`,
          name:
            orderFormData.presbyopia_solution === "two_separate"
              ? `${lensName} (Lejos)`
              : lensName,
          sku: "LENS",
          price: currentLensPrice,
          price_includes_tax: true,
        },
        quantity: 1,
        unitPrice: currentLensPrice,
        metadata: {
          isLens: true,
          lensFamilyId: orderFormData.lens_family_id,
          lensType: orderFormData.lens_type,
          lensSourcingType: orderFormData.lens_sourcing_type,
          presbyopiaSolution: orderFormData.presbyopia_solution,
          lensVisionType:
            orderFormData.presbyopia_solution === "two_separate"
              ? "distance"
              : "single",
          externalPrescription: useExternalPrescription
            ? externalPrescriptionData
            : null,
        },
      });

      // Add near lens for two_separate solution
      if (
        orderFormData.presbyopia_solution === "two_separate" &&
        orderFormData.near_lens_family_id
      ) {
        const nearLensFamily = lensFamilies.find(
          (f) => f.id === orderFormData.near_lens_family_id,
        );
        const nearLensName = nearLensFamily
          ? `${nearLensFamily.name} - Lentes Ópticos`
          : "Lentes de Cerca";

        // Calculate near lens price (usually cheaper than distance)
        const nearLensPrice = nearLensFamily
          ? Math.round(currentLensPrice * 0.7) // Typically 70% of distance lens
          : currentLensPrice;

        items.push({
          product: {
            id: `lens-${orderFormData.near_lens_family_id}-${baseTimestamp}-near`,
            name: `${nearLensName} (Cerca)`,
            sku: "LENS",
            price: nearLensPrice,
            price_includes_tax: true,
          },
          quantity: 1,
          unitPrice: nearLensPrice,
          metadata: {
            isLens: true,
            lensFamilyId: orderFormData.near_lens_family_id,
            lensType: orderFormData.lens_type,
            presbyopiaSolution: orderFormData.presbyopia_solution,
            lensVisionType: "near",
            externalPrescription: useExternalPrescription
              ? externalPrescriptionData
              : null,
          },
        });
      }
    }

    // Add treatments
    if (orderFormData.treatment_ids.length > 0) {
      const selectedTreatments = orderFormData.treatment_ids
        .map((id) => treatments.find((t) => t.id === id))
        .filter(Boolean);

      if (selectedTreatments.length > 0) {
        items.push({
          product: {
            id: `treatments-${baseTimestamp}`,
            name: `Tratamientos: ${selectedTreatments.map((t) => t?.label).join(", ")}`,
            sku: "TREATMENTS",
            price: treatmentsPrice,
            price_includes_tax: true,
          },
          quantity: 1,
          unitPrice: treatmentsPrice,
          metadata: {
            isTreatment: true,
            treatmentIds: orderFormData.treatment_ids,
          },
        });
      }
    }

    // Add labor if any
    if (orderFormData.labor_cost > 0) {
      items.push({
        product: {
          id: `labor-${baseTimestamp}`,
          name: "Mano de Obra",
          sku: "LABOR",
          price: orderFormData.labor_cost,
          price_includes_tax: true,
        },
        quantity: 1,
        unitPrice: orderFormData.labor_cost,
        metadata: {
          isLabor: true,
        },
      });
    }

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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs
        className="flex flex-col h-full"
        value={orderFormTab}
        onValueChange={(v) => setOrderFormTab(v as typeof orderFormTab)}
      >
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-4 gap-1 h-auto min-h-[44px] mx-4 mt-2 flex-shrink-0">
          <TabsTrigger className="text-xs sm:text-sm py-2" value="customer">
            <User className="h-4 w-4 mr-2" />
            Cliente
          </TabsTrigger>
          <TabsTrigger className="text-xs sm:text-sm py-2" value="frame">
            <Glasses className="h-4 w-4 mr-2" />
            Marco
          </TabsTrigger>
          <TabsTrigger className="text-xs sm:text-sm py-2" value="lenses">
            <Sparkles className="h-4 w-4 mr-2" />
            Lentes
          </TabsTrigger>
          <TabsTrigger className="text-xs sm:text-sm py-2" value="pricing">
            <Tag className="h-4 w-4 mr-2" />
            Precios
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
          {/* Customer Tab */}
          <TabsContent className="h-auto m-0 p-4" value="customer">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Cliente y Receta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Customer */}
                <div>
                  <Label>Cliente Seleccionado</Label>
                  {customer ? (
                    <div className="mt-1 p-3 border rounded-lg bg-muted/50 space-y-2">
                      <div className="space-y-1">
                        {/* Build display name from available fields */}
                        <div className="font-medium">
                          {customer.first_name && customer.last_name
                            ? `${customer.first_name} ${customer.last_name}`.trim()
                            : customer.name ||
                              customer.business_name ||
                              "Sin nombre"}
                        </div>
                        {/* Show email separately if available */}
                        {customer.email && (
                          <div className="text-sm text-muted-foreground">
                            Email: {customer.email}
                          </div>
                        )}
                        {customer.rut && (
                          <div className="text-sm text-muted-foreground">
                            RUT: {customer.rut}
                          </div>
                        )}
                      </div>
                      <Button
                        className="text-destructive"
                        size="sm"
                        variant="ghost"
                        onClick={() => onCustomerChange(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cambiar cliente
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-1 p-3 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                      Seleccione un cliente en el panel de búsqueda superior
                    </div>
                  )}
                </div>

                {/* Quick Customer Info - Show when no registered customer but quick customer data exists */}
                {!customer && (quickCustomerName || quickCustomerRUT) && (
                  <div className="mt-2 p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800 dark:text-blue-200">
                        Cliente Rápido
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {quickCustomerName && (
                        <div>
                          <span className="text-muted-foreground">
                            Nombre:{" "}
                          </span>
                          <span className="font-medium">
                            {quickCustomerName}
                          </span>
                        </div>
                      )}
                      {quickCustomerRUT && (
                        <div>
                          <span className="text-muted-foreground">RUT: </span>
                          <span className="font-medium">
                            {quickCustomerRUT}
                          </span>
                        </div>
                      )}
                      {quickCustomerEmail && (
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span className="font-medium">
                            {quickCustomerEmail}
                          </span>
                        </div>
                      )}
                      {quickCustomerPhone && (
                        <div>
                          <span className="text-muted-foreground">
                            Teléfono:{" "}
                          </span>
                          <span className="font-medium">
                            {quickCustomerPhone}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      Datos del cliente no registrado. Complete la receta
                      externa para crear la venta.
                    </div>
                  </div>
                )}

                {/* Prescription Selection */}
                {customer && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          !useExternalPrescription ? "default" : "outline"
                        }
                        onClick={() => setUseExternalPrescription(false)}
                      >
                        Receta del Cliente
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          useExternalPrescription ? "default" : "outline"
                        }
                        onClick={() => setUseExternalPrescription(true)}
                      >
                        Receta Externa
                      </Button>
                    </div>

                    {/* Customer Prescriptions */}
                    {!useExternalPrescription && (
                      <div>
                        <Label>Seleccionar Receta</Label>
                        {loadingPrescriptions ? (
                          <div className="text-sm text-muted-foreground mt-1">
                            Cargando recetas...
                          </div>
                        ) : prescriptions.length > 0 ? (
                          <Select
                            value={selectedPrescription?.id || ""}
                            onValueChange={(value) => {
                              const prescription = prescriptions.find(
                                (p) => p.id === value,
                              );
                              setSelectedPrescription(prescription || null);
                              if (prescription) {
                                // Auto-suggest lens family based on prescription
                                suggestLensFamily();
                              }
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Selecciona una receta" />
                            </SelectTrigger>
                            <SelectContent>
                              {prescriptions.map((rx) => (
                                <SelectItem key={rx.id} value={rx.id}>
                                  <div className="flex justify-between items-center w-full gap-4">
                                    <span>
                                      {rx.prescription_number ||
                                        `Receta ${rx.id.slice(0, 8)}`}
                                      {rx.is_current && (
                                        <Badge
                                          className="ml-2 text-xs"
                                          variant="secondary"
                                        >
                                          Actual
                                        </Badge>
                                      )}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        rx.prescription_date,
                                      ).toLocaleDateString("es-CL")}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm text-muted-foreground mt-1 p-2 border rounded">
                            No hay recetas disponibles para este cliente
                          </div>
                        )}

                        {/* Show selected prescription values in OD/OI format */}
                        {selectedPrescription && (
                          <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-medium text-sm">
                                Valores de Receta
                              </h5>
                              {selectedPrescription.is_current && (
                                <Badge className="text-xs" variant="outline">
                                  Receta Vigente
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium">
                                  OD (Ojo Derecho):
                                </span>
                                <div className="text-muted-foreground">
                                  {selectedPrescription?.od_sphere != null
                                    ? `Esf: ${selectedPrescription!.od_sphere! >= 0 ? "+" : ""}${selectedPrescription!.od_sphere}`
                                    : "Sin dato"}
                                  {(selectedPrescription?.od_cylinder ?? 0) !==
                                    0 &&
                                    ` Cil: ${selectedPrescription!.od_cylinder! >= 0 ? "+" : ""}${selectedPrescription!.od_cylinder}`}
                                  {(selectedPrescription?.od_axis ?? 0) !== 0 &&
                                    ` x ${selectedPrescription!.od_axis}°`}
                                  {(selectedPrescription?.od_add ?? 0) > 0 &&
                                    ` Ad: +${selectedPrescription!.od_add}`}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">
                                  OI (Ojo Izquierdo):
                                </span>
                                <div className="text-muted-foreground">
                                  {selectedPrescription?.os_sphere != null
                                    ? `Esf: ${selectedPrescription!.os_sphere! >= 0 ? "+" : ""}${selectedPrescription!.os_sphere}`
                                    : "Sin dato"}
                                  {(selectedPrescription?.os_cylinder ?? 0) !==
                                    0 &&
                                    ` Cil: ${selectedPrescription!.os_cylinder! >= 0 ? "+" : ""}${selectedPrescription!.os_cylinder}`}
                                  {(selectedPrescription?.os_axis ?? 0) !== 0 &&
                                    ` x ${selectedPrescription!.os_axis}°`}
                                  {(selectedPrescription?.os_add ?? 0) > 0 &&
                                    ` Ad: +${selectedPrescription!.os_add}`}
                                </div>
                              </div>
                            </div>
                            {/* DP - Show as single binocular value */}
                            {(selectedPrescription?.pd_distance ||
                              selectedPrescription?.od_pd ||
                              selectedPrescription?.os_pd) && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <div className="font-medium text-foreground">
                                  Distancia Pupilar (DP):
                                </div>
                                <div className="flex gap-4 mt-1">
                                  {/* Distance PD - Show as single binocular value */}
                                  {(selectedPrescription?.od_pd ||
                                    selectedPrescription?.pd_distance) && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Lejos:
                                      </span>{" "}
                                      <span className="font-medium">
                                        {/* Calculate binocular PD from monocular values */}
                                        {selectedPrescription?.pd_distance
                                          ? `${selectedPrescription.pd_distance}mm`
                                          : selectedPrescription?.od_pd &&
                                              selectedPrescription?.os_pd
                                            ? `${Number(selectedPrescription.od_pd) + Number(selectedPrescription.os_pd)}mm`
                                            : selectedPrescription?.od_pd
                                              ? `${selectedPrescription.od_pd}mm`
                                              : ""}
                                      </span>
                                    </div>
                                  )}
                                  {/* Near PD - Show as single binocular value */}
                                  {selectedPrescription?.pd_near && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Cerca:
                                      </span>{" "}
                                      <span className="font-medium">
                                        {selectedPrescription?.pd_near}mm
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Presbyopia Solution Selector - Show when prescription has addition */}
                        {selectedPrescription &&
                          ((selectedPrescription.od_add &&
                            selectedPrescription.od_add > 0) ||
                            (selectedPrescription.os_add &&
                              selectedPrescription.os_add > 0)) && (
                            <div className="mt-4 p-3 border border-amber-200 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                              <Label className="text-amber-700 dark:text-amber-300 font-medium block mb-2">
                                Solución de Presbicia
                              </Label>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                                Esta receta tiene adición. Selecciona cómo
                                quieres fabricar los lentes:
                              </p>
                              <div className="space-y-2">
                                {/* 1. Progressive */}
                                <div
                                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                    orderFormData.presbyopia_solution ===
                                    "progressive"
                                      ? "border-primary bg-primary/5"
                                      : "hover:border-muted-foreground"
                                  }`}
                                  onClick={() =>
                                    setOrderFormData((prev) => ({
                                      ...prev,
                                      presbyopia_solution: "progressive",
                                    }))
                                  }
                                >
                                  <div className="font-medium">
                                    Lente Progresivo
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Un solo lente con graduación progresiva
                                    (lejos + cerca)
                                  </div>
                                </div>
                                {/* 2. Bifocal */}
                                <div
                                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                    orderFormData.presbyopia_solution ===
                                    "single"
                                      ? "border-primary bg-primary/5"
                                      : "hover:border-muted-foreground"
                                  }`}
                                  onClick={() =>
                                    setOrderFormData((prev) => ({
                                      ...prev,
                                      presbyopia_solution: "single",
                                    }))
                                  }
                                >
                                  <div className="font-medium">
                                    Lentes Bifocales
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Dos graduaciones en un mismo lente (lejos y
                                    cerca)
                                  </div>
                                </div>
                                {/* 3. Two Separate */}
                                <div
                                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                    orderFormData.presbyopia_solution ===
                                    "two_separate"
                                      ? "border-primary bg-primary/5"
                                      : "hover:border-muted-foreground"
                                  }`}
                                  onClick={() =>
                                    setOrderFormData((prev) => ({
                                      ...prev,
                                      presbyopia_solution: "two_separate",
                                    }))
                                  }
                                >
                                  <div className="font-medium">
                                    Dos Lentes Separados
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Un lente para lejos y otro para cerca
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}

                {/* External Prescription Form - Show when: enabled OR has quick customer data without registered customer */}
                {(useExternalPrescription ||
                  (!customer && (quickCustomerName || quickCustomerRUT))) && (
                  <div className="space-y-4">
                    <Separator />
                    <h4 className="font-medium">Datos de Receta Externa</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Fecha Receta</Label>
                        <Input
                          type="date"
                          value={externalPrescriptionData.prescription_date}
                          onChange={(e) =>
                            setExternalPrescriptionData((prev) => ({
                              ...prev,
                              prescription_date: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Fecha Vencimiento</Label>
                        <Input
                          type="date"
                          value={externalPrescriptionData.expiration_date}
                          onChange={(e) =>
                            setExternalPrescriptionData((prev) => ({
                              ...prev,
                              expiration_date: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Doctor/Optometrista</Label>
                        <Input
                          placeholder="Nombre del profesional"
                          value={externalPrescriptionData.issued_by}
                          onChange={(e) =>
                            setExternalPrescriptionData((prev) => ({
                              ...prev,
                              issued_by: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Licencia</Label>
                        <Input
                          placeholder="N° de licencia"
                          value={externalPrescriptionData.issued_by_license}
                          onChange={(e) =>
                            setExternalPrescriptionData((prev) => ({
                              ...prev,
                              issued_by_license: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* OD Values */}
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <h5 className="font-medium mb-2">Ojo Derecho (OD)</h5>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Esfera</Label>
                          <Input
                            placeholder="-2.00"
                            value={externalPrescriptionData.od_sphere}
                            onChange={(e) =>
                              setExternalPrescriptionData((prev) => ({
                                ...prev,
                                od_sphere: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cilindro</Label>
                          <Input
                            placeholder="-0.50"
                            value={externalPrescriptionData.od_cylinder}
                            onChange={(e) =>
                              setExternalPrescriptionData((prev) => ({
                                ...prev,
                                od_cylinder: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Eje</Label>
                          <Input
                            placeholder="180"
                            value={externalPrescriptionData.od_axis}
                            onChange={(e) =>
                              setExternalPrescriptionData((prev) => ({
                                ...prev,
                                od_axis: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Adición</Label>
                          <Input
                            placeholder="+2.50"
                            value={externalPrescriptionData.od_add}
                            onChange={(e) =>
                              setExternalPrescriptionData((prev) => ({
                                ...prev,
                                od_add: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* OS Values */}
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <h5 className="font-medium mb-2">Ojo Izquierdo (OI)</h5>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Esfera</Label>
                          <Input
                            placeholder="-2.00"
                            value={externalPrescriptionData.os_sphere}
                            onChange={(e) =>
                              setExternalPrescriptionData((prev) => ({
                                ...prev,
                                os_sphere: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cilindro</Label>
                          <Input
                            placeholder="-0.50"
                            value={externalPrescriptionData.os_cylinder}
                            onChange={(e) =>
                              setExternalPrescriptionData((prev) => ({
                                ...prev,
                                os_cylinder: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Eje</Label>
                          <Input
                            placeholder="180"
                            value={externalPrescriptionData.os_axis}
                            onChange={(e) =>
                              setExternalPrescriptionData((prev) => ({
                                ...prev,
                                os_axis: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Adición</Label>
                          <Input
                            placeholder="+2.50"
                            value={externalPrescriptionData.os_add}
                            onChange={(e) =>
                              setExternalPrescriptionData((prev) => ({
                                ...prev,
                                os_add: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* PD - Distancia Pupilar Binocular */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>DP Lejos (Binocular)</Label>
                        <Input
                          placeholder="63"
                          value={externalPrescriptionData.pd}
                          onChange={(e) =>
                            setExternalPrescriptionData((prev) => ({
                              ...prev,
                              pd: e.target.value,
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Distancia pupilar total (OD + OI)
                        </p>
                      </div>
                      <div>
                        <Label>DP Cerca (Binocular)</Label>
                        <Input
                          placeholder="60"
                          value={externalPrescriptionData.near_pd}
                          onChange={(e) =>
                            setExternalPrescriptionData((prev) => ({
                              ...prev,
                              near_pd: e.target.value,
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Distancia pupilar para visión cercana
                        </p>
                      </div>
                    </div>

                    {/* Presbyopia Solution Selector - Show when external prescription has addition */}
                    {(externalPrescriptionData.od_add &&
                      externalPrescriptionData.od_add.trim() !== "") ||
                    (externalPrescriptionData.os_add &&
                      externalPrescriptionData.os_add.trim() !== "") ? (
                      <div className="mt-4 p-3 border border-amber-200 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                        <Label className="text-amber-700 dark:text-amber-300 font-medium block mb-2">
                          Solución de Presbicia
                        </Label>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                          Esta receta tiene adición. Selecciona cómo quieres
                          fabricar los lentes:
                        </p>
                        <div className="space-y-2">
                          {/* 1. Progressive */}
                          <div
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              orderFormData.presbyopia_solution ===
                              "progressive"
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground"
                            }`}
                            onClick={() =>
                              setOrderFormData((prev) => ({
                                ...prev,
                                presbyopia_solution: "progressive",
                              }))
                            }
                          >
                            <div className="font-medium">Lente Progresivo</div>
                            <div className="text-xs text-muted-foreground">
                              Un solo lente con graduación progresiva (lejos +
                              cerca)
                            </div>
                          </div>
                          {/* 2. Bifocal */}
                          <div
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              orderFormData.presbyopia_solution === "single"
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground"
                            }`}
                            onClick={() =>
                              setOrderFormData((prev) => ({
                                ...prev,
                                presbyopia_solution: "single",
                              }))
                            }
                          >
                            <div className="font-medium">Lentes Bifocales</div>
                            <div className="text-xs text-muted-foreground">
                              Un solo lente (para lejos o cerca, según
                              necesidad)
                            </div>
                          </div>
                          {/* 3. Two Separate */}
                          <div
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              orderFormData.presbyopia_solution ===
                              "two_separate"
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground"
                            }`}
                            onClick={() =>
                              setOrderFormData((prev) => ({
                                ...prev,
                                presbyopia_solution: "two_separate",
                              }))
                            }
                          >
                            <div className="font-medium">
                              Dos Lentes Separados
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Un lente para lejos y otro para cerca
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Next Button */}
                <div className="flex justify-end pt-4">
                  <Button onClick={() => setOrderFormTab("frame")}>
                    Siguiente: Marco
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Frame Tab */}
          <TabsContent className="h-auto m-0 p-4" value="frame">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Selección de Marco</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Own Frame Toggle - Only show when NOT two_separate */}
                {orderFormData.presbyopia_solution !== "two_separate" && (
                  <div className="flex items-center gap-2">
                    <input
                      checked={orderFormData.customer_own_frame}
                      className="w-4 h-4"
                      id="customerOwnFrame"
                      type="checkbox"
                      onChange={(e) =>
                        setOrderFormData((prev) => ({
                          ...prev,
                          customer_own_frame: e.target.checked,
                        }))
                      }
                    />
                    <Label
                      className="cursor-pointer"
                      htmlFor="customerOwnFrame"
                    >
                      El cliente trae su propio marco
                    </Label>
                  </div>
                )}

                {/* For two_separate solution, show checkboxes for each lens */}
                {orderFormData.presbyopia_solution === "two_separate" && (
                  <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        checked={orderFormData.customer_own_frame}
                        className="w-4 h-4"
                        id="customerOwnFrameDistance"
                        type="checkbox"
                        onChange={(e) =>
                          setOrderFormData((prev) => ({
                            ...prev,
                            customer_own_frame: e.target.checked,
                          }))
                        }
                      />
                      <Label
                        className="cursor-pointer text-blue-700 dark:text-blue-300"
                        htmlFor="customerOwnFrameDistance"
                      >
                        El cliente trae su propio marco para lejos
                      </Label>
                    </div>

                    {!orderFormData.customer_own_frame && (
                      <>
                        <Label className="text-blue-700 dark:text-blue-300 font-medium block mb-2">
                          Marco para Visión Lejos
                        </Label>
                        <div>
                          <Label>Buscar Armazón para Lejos</Label>
                          <div className="relative mt-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              className="pl-9"
                              placeholder="Buscar por nombre, marca, modelo..."
                              value={frameSearchTerm}
                              onChange={(e) =>
                                setFrameSearchTerm(e.target.value)
                              }
                            />
                          </div>
                        </div>

                        {/* Frame Results - Distance - Hide when frame is selected */}
                        {selectedFrame === null &&
                          frameSearchTerm.length >= 2 && (
                            <>
                              {frameLoading ? (
                                <div className="text-center py-4 text-muted-foreground">
                                  Buscando...
                                </div>
                              ) : frameResults.length > 0 ? (
                                <ScrollArea className="h-[200px]">
                                  <div className="space-y-2 mt-2">
                                    {frameResults.map((frame) => (
                                      <div
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:border-muted-foreground`}
                                        key={frame.id}
                                        onClick={() => setSelectedFrame(frame)}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="font-medium">
                                              {frame.name}
                                            </div>
                                            {frame.sku && (
                                              <div className="text-xs text-muted-foreground">
                                                SKU: {frame.sku}
                                              </div>
                                            )}
                                            {frame.brand && (
                                              <div className="text-xs text-muted-foreground">
                                                Marca: {frame.brand}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <div className="font-semibold">
                                              {formatCurrency(frame.price || 0)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Stock:{" "}
                                              {frame.inventory_quantity || 0}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              ) : frameSearchTerm.length >= 2 ? (
                                <div className="text-center py-4 text-muted-foreground">
                                  No se encontraron armazones
                                </div>
                              ) : null}
                            </>
                          )}
                      </>
                    )}
                  </div>
                )}

                {/* For single/progressive solution - show frame search */}
                {orderFormData.presbyopia_solution !== "two_separate" &&
                  !orderFormData.customer_own_frame && (
                    <div>
                      <Label>Buscar Armazón</Label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="Buscar por nombre, marca, modelo..."
                          value={frameSearchTerm}
                          onChange={(e) => setFrameSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                {/* Show frame results for single/progressive - Hide when frame is selected */}
                {orderFormData.presbyopia_solution !== "two_separate" &&
                  !orderFormData.customer_own_frame &&
                  selectedFrame === null &&
                  frameSearchTerm.length >= 2 && (
                    <>
                      {frameLoading ? (
                        <div className="text-center py-4 text-muted-foreground">
                          Buscando...
                        </div>
                      ) : frameResults.length > 0 ? (
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2 mt-2">
                            {frameResults.map((frame) => (
                              <div
                                className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-muted-foreground"
                                key={frame.id}
                                onClick={() => setSelectedFrame(frame)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">
                                      {frame.name}
                                    </div>
                                    {frame.sku && (
                                      <div className="text-xs text-muted-foreground">
                                        SKU: {frame.sku}
                                      </div>
                                    )}
                                    {frame.brand && (
                                      <div className="text-xs text-muted-foreground">
                                        Marca: {frame.brand}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold">
                                      {formatCurrency(frame.price || 0)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Stock: {frame.inventory_quantity || 0}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No se encontraron armazones
                        </div>
                      )}
                    </>
                  )}

                {/* Frame for Near - Only for two_separate */}
                {orderFormData.presbyopia_solution === "two_separate" && (
                  <div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        checked={customerOwnNearFrame}
                        className="w-4 h-4"
                        id="customerOwnNearFrame"
                        type="checkbox"
                        onChange={(e) =>
                          setCustomerOwnNearFrame(e.target.checked)
                        }
                      />
                      <Label
                        className="cursor-pointer text-green-700 dark:text-green-300"
                        htmlFor="customerOwnNearFrame"
                      >
                        El cliente trae su propio marco para cerca
                      </Label>
                    </div>

                    {!customerOwnNearFrame && (
                      <>
                        <Label className="text-green-700 dark:text-green-300 font-medium block mb-2">
                          Marco para Visión Cercana (Cerca)
                        </Label>
                        <div>
                          <Label>Buscar Armazón para Cerca</Label>
                          <div className="relative mt-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              className="pl-9"
                              placeholder="Buscar por nombre, marca, modelo..."
                              value={nearFrameSearchTerm}
                              onChange={(e) =>
                                setNearFrameSearchTerm(e.target.value)
                              }
                            />
                          </div>
                        </div>

                        {/* Near Frame Results - Hide when frame is selected */}
                        {selectedNearFrame === null &&
                          nearFrameSearchTerm.length >= 2 && (
                            <>
                              {nearFrameLoading ? (
                                <div className="text-center py-4 text-muted-foreground">
                                  Buscando...
                                </div>
                              ) : nearFrameResults.length > 0 ? (
                                <ScrollArea className="h-[200px]">
                                  <div className="space-y-2 mt-2">
                                    {nearFrameResults.map((frame) => (
                                      <div
                                        className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-muted-foreground"
                                        key={frame.id}
                                        onClick={() =>
                                          setSelectedNearFrame(frame)
                                        }
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="font-medium">
                                              {frame.name}
                                            </div>
                                            {frame.sku && (
                                              <div className="text-xs text-muted-foreground">
                                                SKU: {frame.sku}
                                              </div>
                                            )}
                                            {frame.brand && (
                                              <div className="text-xs text-muted-foreground">
                                                Marca: {frame.brand}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <div className="font-semibold">
                                              {formatCurrency(frame.price || 0)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Stock:{" "}
                                              {frame.inventory_quantity || 0}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                  No se encontraron armazones
                                </div>
                              )}
                            </>
                          )}
                      </>
                    )}
                  </div>
                )}

                {/* Selected Frame Display - Distance */}
                {selectedFrame && !orderFormData.customer_own_frame && (
                  <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-700 dark:text-blue-300">
                          Marco Seleccionado para Lejos
                        </div>
                        <div className="text-sm">{selectedFrame.name}</div>
                        {selectedFrame.brand && (
                          <div className="text-xs text-muted-foreground">
                            Marca: {selectedFrame.brand}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-700 dark:text-blue-300">
                          {formatCurrency(selectedFrame.price || 0)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFrame(null);
                            setFrameSearchTerm("");
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Frame Display - Near */}
                {orderFormData.presbyopia_solution === "two_separate" &&
                  selectedNearFrame &&
                  !customerOwnNearFrame && (
                    <div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-green-700 dark:text-green-300">
                            Marco Seleccionado para Cerca
                          </div>
                          <div className="text-sm">
                            {selectedNearFrame.name}
                          </div>
                          {selectedNearFrame.brand && (
                            <div className="text-xs text-muted-foreground">
                              Marca: {selectedNearFrame.brand}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-700 dark:text-green-300">
                            {formatCurrency(selectedNearFrame.price || 0)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedNearFrame(null);
                              setNearFrameSearchTerm("");
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Quitar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Manual Frame Entry - For Distance - Show ONLY when customer brings own frame */}
                {orderFormData.customer_own_frame && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium">
                      {orderFormData.presbyopia_solution === "two_separate"
                        ? "Datos del Marco para Lejos"
                        : "Datos del Marco"}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Nombre/Descripción</Label>
                        <Input
                          placeholder="Ej: Marco del cliente"
                          value={orderFormData.frame_name}
                          onChange={(e) =>
                            setOrderFormData((prev) => ({
                              ...prev,
                              frame_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>SKU/Código</Label>
                        <Input
                          placeholder="Opcional"
                          value={orderFormData.frame_sku}
                          onChange={(e) =>
                            setOrderFormData((prev) => ({
                              ...prev,
                              frame_sku: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Near Frame Entry - Only for two_separate and customer brings own near frame */}
                {orderFormData.presbyopia_solution === "two_separate" &&
                  customerOwnNearFrame && (
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="font-medium text-green-700 dark:text-green-300">
                        Datos del Marco para Cerca
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Nombre/Descripción</Label>
                          <Input
                            placeholder="Ej: Marco para lectura"
                            value={orderFormData.near_frame_name}
                            onChange={(e) =>
                              setOrderFormData((prev) => ({
                                ...prev,
                                near_frame_name: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>SKU/Código</Label>
                          <Input
                            placeholder="Opcional"
                            value={orderFormData.near_frame_sku}
                            onChange={(e) =>
                              setOrderFormData((prev) => ({
                                ...prev,
                                near_frame_sku: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setOrderFormTab("customer")}
                  >
                    Atrás
                  </Button>
                  <Button onClick={() => setOrderFormTab("lenses")}>
                    Siguiente: Lentes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lenses Tab */}
          <TabsContent className="h-auto m-0 p-4" value="lenses">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Lentes y Tratamientos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lens Type - Nueva disposición: Selection FIRST, luego contenido */}
                <div className="space-y-4">
                  <div>
                    <Label>¿Qué tipo de lente necesita?</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {/* Lentes Ópticos - con icono */}
                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          orderFormData.lens_type === "vision"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground"
                        }`}
                        onClick={() => {
                          setOrderFormData((prev) => ({
                            ...prev,
                            lens_type: "vision",
                          }));
                          setContactLensConfig(null);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Glasses className="h-8 w-8 text-primary" />
                          <div>
                            <div className="font-medium">Lentes Ópticos</div>
                            <div className="text-xs text-muted-foreground">
                              Armazón + Cristales tallados
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Lentes de Contacto - con icono */}
                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          orderFormData.lens_type === "contact"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground"
                        }`}
                        onClick={() => {
                          setOrderFormData((prev) => ({
                            ...prev,
                            lens_type: "contact",
                          }));
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <CircleDot className="h-8 w-8 text-primary" />
                          <div>
                            <div className="font-medium">
                              Lentes de Contacto
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Lentillas/blandas
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mostrar contenido basado en tipo de lente */}
                {orderFormData.lens_type === "contact" ? (
                  /* Sección de Lentes de Contacto - NUEVO COMPONENTE */
                  <ContactLensSelector
                    prescription={
                      selectedPrescription
                        ? {
                            sphere_od: selectedPrescription.od_sphere || 0,
                            cylinder_od: selectedPrescription.od_cylinder || 0,
                            axis_od: selectedPrescription.od_axis || null,
                            add_od: selectedPrescription.od_add || null,
                            base_curve_od: null,
                            diameter_od: null,
                            sphere_os: selectedPrescription.os_sphere || 0,
                            cylinder_os: selectedPrescription.os_cylinder || 0,
                            axis_os: selectedPrescription.os_axis || null,
                            add_os: selectedPrescription.os_add || null,
                            base_curve_os: null,
                            diameter_os: null,
                          }
                        : null
                    }
                    branchId={branchId}
                    selectedConfig={contactLensConfig}
                    onSelect={(config) => setContactLensConfig(config)}
                    customer={customer}
                  />
                ) : (
                  /* Lentes Ópticos - Existing logic */
                  <>
                    {/* Lens Family - For single/progressive (not two_separate) */}
                    {orderFormData.presbyopia_solution !== "two_separate" &&
                      orderFormData.lens_type === "vision" && (
                        <div>
                          <Label>Familia de Lentes</Label>
                          <Select
                            value={orderFormData.lens_family_id || ""}
                            onValueChange={(value) => {
                              const family = lensFamilies.find(
                                (f) => f.id === value,
                              );
                              setOrderFormData((prev) => ({
                                ...prev,
                                lens_family_id: value,
                                lens_family_name: family?.name || null,
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una familia de lentes" />
                            </SelectTrigger>
                            <SelectContent>
                              {lensFamilies
                                .filter(
                                  (f) =>
                                    f.lens_type === orderFormData.lens_type,
                                )
                                .map((family) => (
                                  <SelectItem key={family.id} value={family.id}>
                                    {family.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {/* Lens Price Display */}
                          {orderFormData.lens_family_id && (
                            <div className="mt-2 p-2 bg-muted rounded-lg flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Precio Lentes:
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(
                                  orderFormData.presbyopia_solution === "single"
                                    ? 45000
                                    : orderFormData.presbyopia_solution ===
                                        "progressive"
                                      ? 120000
                                      : 80000,
                                )}
                              </span>
                            </div>
                          )}

                          {/* Stock vs Tallado Selector */}
                          {orderFormData.lens_family_id &&
                            (() => {
                              const selectedFamily = lensFamilies.find(
                                (f) => f.id === orderFormData.lens_family_id,
                              );
                              const hasStockAvailable =
                                selectedFamily?.is_stock_available === true;

                              if (!hasStockAvailable) return null;

                              return (
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                  <Label className="text-sm font-medium text-green-800 block mb-2">
                                    Disponibilidad del Lente
                                  </Label>
                                  <RadioGroup
                                    value={orderFormData.lens_sourcing_type}
                                    onValueChange={(
                                      value: "stock" | "surfaced",
                                    ) => {
                                      setOrderFormData((prev) => ({
                                        ...prev,
                                        lens_sourcing_type: value,
                                      }));
                                    }}
                                    className="flex gap-4"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem
                                        value="stock"
                                        id="pos-lens-stock"
                                      />
                                      <Label
                                        htmlFor="pos-lens-stock"
                                        className="cursor-pointer text-sm"
                                      >
                                        📦 Stock (Entrega inmediata)
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem
                                        value="surfaced"
                                        id="pos-lens-surfaced"
                                      />
                                      <Label
                                        htmlFor="pos-lens-surfaced"
                                        className="cursor-pointer text-sm"
                                      >
                                        🔧 Tallado a pedido
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                              );
                            })()}
                        </div>
                      )}

                    {/* Lens Family for two_separate - Two selectors with colors */}
                    {orderFormData.presbyopia_solution === "two_separate" &&
                      orderFormData.lens_type === "vision" && (
                        <>
                          {/* Lens for Distance - Blue */}
                          <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <Label className="text-blue-700 dark:text-blue-300 font-medium block mb-2">
                              Familia de Lentes para Visión Lejos
                            </Label>
                            <Select
                              value={orderFormData.lens_family_id || ""}
                              onValueChange={(value) => {
                                const family = lensFamilies.find(
                                  (f) => f.id === value,
                                );
                                setOrderFormData((prev) => ({
                                  ...prev,
                                  lens_family_id: value,
                                  lens_family_name: family?.name || null,
                                }));
                              }}
                            >
                              <SelectTrigger className="bg-white dark:bg-gray-900">
                                <SelectValue placeholder="Selecciona lente para lejos" />
                              </SelectTrigger>
                              <SelectContent>
                                {lensFamilies
                                  .filter(
                                    (f) =>
                                      f.lens_type === orderFormData.lens_type,
                                  )
                                  .map((family) => (
                                    <SelectItem
                                      key={family.id}
                                      value={family.id}
                                    >
                                      {family.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {/* Lens Price Display - Distance */}
                            {orderFormData.lens_family_id && (
                              <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-800 rounded-lg flex justify-between items-center">
                                <span className="text-sm text-blue-700 dark:text-blue-300">
                                  Precio Lejos:
                                </span>
                                <span className="font-semibold text-blue-700 dark:text-blue-300">
                                  {formatCurrency(80000)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Lens for Near - Green */}
                          <div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <Label className="text-green-700 dark:text-green-300 font-medium block mb-2">
                              Familia de Lentes para Visión Cercana (Cerca)
                            </Label>
                            <Select
                              value={orderFormData.near_lens_family_id || ""}
                              onValueChange={(value) => {
                                const family = lensFamilies.find(
                                  (f) => f.id === value,
                                );
                                setOrderFormData((prev) => ({
                                  ...prev,
                                  near_lens_family_id: value,
                                  near_lens_family_name: family?.name || null,
                                }));
                              }}
                            >
                              <SelectTrigger className="bg-white dark:bg-gray-900">
                                <SelectValue placeholder="Selecciona lente para cerca" />
                              </SelectTrigger>
                              <SelectContent>
                                {lensFamilies
                                  .filter(
                                    (f) =>
                                      f.lens_type === "vision" &&
                                      f.id !== "lf-5" &&
                                      f.id !== "lf-6" &&
                                      f.id !== "lf-7" &&
                                      f.id !== "lf-8",
                                  )
                                  .map((family) => (
                                    <SelectItem
                                      key={family.id}
                                      value={family.id}
                                    >
                                      {family.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {/* Lens Price Display - Near */}
                            {orderFormData.near_lens_family_id && (
                              <div className="mt-2 p-2 bg-green-100 dark:bg-green-800 rounded-lg flex justify-between items-center">
                                <span className="text-sm text-green-700 dark:text-green-300">
                                  Precio Cerca:
                                </span>
                                <span className="font-semibold text-green-700 dark:text-green-300">
                                  {formatCurrency(nearLensPriceValue)}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                    {/* Treatments */}
                    <div>
                      <Label>
                        Tratamientos
                        {(orderFormData as OrderFormData).lens_type ===
                          "contact" && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (solo revestimientos)
                          </span>
                        )}
                      </Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {filteredTreatments.map((treatment) => {
                          const isSelected =
                            orderFormData.treatment_ids.includes(treatment.id);
                          return (
                            <div
                              className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "hover:border-muted-foreground"
                              }`}
                              key={treatment.id}
                              onClick={() => toggleTreatment(treatment.id)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">
                                    {treatment.label}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {treatment.category === "coating"
                                      ? "Revestimiento"
                                      : "Tipo de lente"}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {treatment.editable && isSelected ? (
                                    <Input
                                      className="h-8 w-20 text-right text-sm"
                                      type="number"
                                      value={treatment.cost}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        updateTreatmentPrice(
                                          treatment.id,
                                          parseFloat(e.target.value) || 0,
                                        );
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <div className="text-sm font-semibold">
                                      {formatCurrency(treatment.cost)}
                                    </div>
                                  )}
                                  {isSelected && (
                                    <Badge className="mt-1" variant="secondary">
                                      <Check className="h-3 w-3 mr-1" />
                                      Seleccionado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Labor Cost */}
                    <div>
                      <Label>Mano de Obra</Label>
                      <Input
                        className="mt-1"
                        placeholder="0"
                        type="number"
                        value={orderFormData.labor_cost || ""}
                        onChange={(e) =>
                          setOrderFormData((prev) => ({
                            ...prev,
                            labor_cost: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setOrderFormTab("frame")}
                      >
                        Atrás
                      </Button>
                      <Button onClick={() => setOrderFormTab("pricing")}>
                        Siguiente: Precios
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent className="h-auto m-0 p-4" value="pricing">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Resumen y Precios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="space-y-3">
                  <h4 className="font-medium">Resumen de la Orden</h4>

                  {/* Customer */}
                  <div className="flex flex-col text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span>
                        {customer
                          ? customer.first_name && customer.last_name
                            ? `${customer.first_name} ${customer.last_name}`.trim()
                            : customer.name ||
                              customer.business_name ||
                              "Sin nombre"
                          : quickCustomerName || "Sin cliente"}
                      </span>
                    </div>
                    {/* Show quick customer details */}
                    {!customer &&
                      (quickCustomerRUT ||
                        quickCustomerEmail ||
                        quickCustomerPhone) && (
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span></span>
                          <span className="text-right">
                            {quickCustomerRUT && (
                              <span>RUT: {quickCustomerRUT} </span>
                            )}
                            {quickCustomerEmail && (
                              <span>Email: {quickCustomerEmail} </span>
                            )}
                            {quickCustomerPhone && (
                              <span>Tel: {quickCustomerPhone}</span>
                            )}
                          </span>
                        </div>
                      )}
                  </div>

                  {/* Prescription */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Receta:</span>
                    <span>
                      {selectedPrescription
                        ? selectedPrescription.prescription_number ||
                          `Receta ${selectedPrescription.id.slice(0, 8)}`
                        : useExternalPrescription
                          ? "Receta Externa"
                          : "Sin receta"}
                    </span>
                  </div>

                  <Separator />

                  {/* For two_separate solution - show separate sections for distance and near */}
                  {orderFormData.presbyopia_solution === "two_separate" ? (
                    <>
                      {/* Distance Vision Section */}
                      <div className="p-3 border rounded-lg bg-muted/30">
                        <div className="font-medium mb-2">Visión Lejos</div>
                        {/* Frame for Distance */}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Marco:</span>
                          <span>
                            {orderFormData.customer_own_frame
                              ? orderFormData.frame_name || "Marco del cliente"
                              : selectedFrame?.name || "No seleccionado"}
                          </span>
                        </div>
                        {selectedFrame && !orderFormData.customer_own_frame && (
                          <div className="flex justify-between text-sm ml-4">
                            <span className="text-muted-foreground">
                              Precio:
                            </span>
                            <span>
                              {formatCurrency(selectedFrame.price || 0)}
                            </span>
                          </div>
                        )}
                        {/* Lens for Distance */}
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-muted-foreground">Lente:</span>
                          <span>
                            {orderFormData.lens_family_id
                              ? orderFormData.lens_family_name || "Seleccionado"
                              : "No seleccionado"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm ml-4">
                          <span className="text-muted-foreground">Precio:</span>
                          <span>{formatCurrency(80000)}</span>
                        </div>
                      </div>

                      {/* Near Vision Section */}
                      <div className="p-3 border rounded-lg bg-muted/30">
                        <div className="font-medium mb-2">Visión Cerca</div>
                        {/* Frame for Near */}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Marco:</span>
                          <span>
                            {customerOwnNearFrame
                              ? orderFormData.near_frame_name ||
                                "Marco del cliente"
                              : selectedNearFrame?.name || "No seleccionado"}
                          </span>
                        </div>
                        {selectedNearFrame && !customerOwnNearFrame && (
                          <div className="flex justify-between text-sm ml-4">
                            <span className="text-muted-foreground">
                              Precio:
                            </span>
                            <span>
                              {formatCurrency(selectedNearFrame.price || 0)}
                            </span>
                          </div>
                        )}
                        {/* Lens for Near */}
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-muted-foreground">Lente:</span>
                          <span>
                            {orderFormData.near_lens_family_id
                              ? orderFormData.near_lens_family_name ||
                                "Seleccionado"
                              : "No seleccionado"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm ml-4">
                          <span className="text-muted-foreground">Precio:</span>
                          <span>{formatCurrency(35000)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Frame - Single/Progressive */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Marco:</span>
                        <span>
                          {orderFormData.customer_own_frame
                            ? orderFormData.frame_name || "Marco del cliente"
                            : selectedFrame?.name || "No seleccionado"}
                        </span>
                      </div>

                      {/* Frame Price */}
                      {selectedFrame && !orderFormData.customer_own_frame && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground ml-4">
                            Precio Marco:
                          </span>
                          <span>
                            {formatCurrency(selectedFrame.price || 0)}
                          </span>
                        </div>
                      )}

                      {/* Lens */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lentes:</span>
                        <span>
                          {orderFormData.lens_family_id
                            ? lensFamilies.find(
                                (f) => f.id === orderFormData.lens_family_id,
                              )?.name || "Seleccionado"
                            : "No seleccionado"}
                        </span>
                      </div>

                      {orderFormData.lens_family_id && (
                        <div className="flex justify-between text-sm ml-4">
                          <span className="text-muted-foreground">
                            Precio Lentes:
                          </span>
                          <span>{formatCurrency(lensPrice())}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Treatments */}
                  {orderFormData.treatment_ids.length > 0 && (
                    <div className="ml-4 space-y-1">
                      <div className="text-xs text-muted-foreground">
                        Tratamientos:
                      </div>
                      {orderFormData.treatment_ids.map((id) => {
                        const treatment = treatments.find((t) => t.id === id);
                        return treatment ? (
                          <div
                            className="flex justify-between text-sm"
                            key={id}
                          >
                            <span className="ml-2">- {treatment.label}</span>
                            <span>{formatCurrency(treatment.cost)}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Labor */}
                  {orderFormData.labor_cost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground ml-4">
                        Mano de Obra:
                      </span>
                      <span>{formatCurrency(orderFormData.labor_cost)}</span>
                    </div>
                  )}

                  {/* Discount */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium">Descuento</Label>
                    <div className="flex gap-2">
                      <Select
                        value={discountType}
                        onValueChange={(value) =>
                          setDiscountType(value as typeof discountType)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin descuento</SelectItem>
                          <SelectItem value="percentage">Porcentaje</SelectItem>
                          <SelectItem value="fixed">Monto fijo</SelectItem>
                        </SelectContent>
                      </Select>
                      {discountType !== "none" && (
                        <Input
                          className="flex-1"
                          type="number"
                          min={0}
                          max={discountType === "percentage" ? 100 : undefined}
                          placeholder={
                            discountType === "percentage" ? "0-100" : "Monto"
                          }
                          value={discountValue || ""}
                          onChange={(e) =>
                            setDiscountValue(parseFloat(e.target.value) || 0)
                          }
                        />
                      )}
                    </div>
                    {discountType === "percentage" && discountValue > 0 && (
                      <div className="text-sm text-green-600">
                        Descuento: -{formatCurrency(discountAmount())} (
                        {discountValue}%)
                      </div>
                    )}
                    {discountType === "fixed" && discountValue > 0 && (
                      <div className="text-sm text-green-600">
                        Descuento: -{formatCurrency(discountValue)}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Total */}
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(totalPrice())}</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notas</Label>
                  <Input
                    className="mt-1"
                    placeholder="Notas adicionales..."
                    value={orderFormData.notes}
                    onChange={(e) =>
                      setOrderFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    className="w-full"
                    disabled={
                      !selectedFrame &&
                      !orderFormData.lens_family_id &&
                      orderFormData.labor_cost === 0
                    }
                    size="lg"
                    onClick={handleAddToCart}
                  >
                    <Package className="h-5 w-5 mr-2" />
                    Agregar al Carrito
                  </Button>

                  <Button
                    className="w-full"
                    variant="secondary"
                    disabled={
                      (!customer && !quickCustomerName && !quickCustomerRUT) ||
                      creatingQuote
                    }
                    size="lg"
                    onClick={handleCreateQuote}
                  >
                    {creatingQuote ? (
                      "Creando..."
                    ) : (
                      <>
                        <Tag className="h-5 w-5 mr-2" />
                        {!customer && (quickCustomerName || quickCustomerRUT)
                          ? "Crear Cliente y Presupuesto"
                          : "Crear Presupuesto"}
                      </>
                    )}
                  </Button>

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setOrderFormTab("lenses")}
                  >
                    Atrás
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
