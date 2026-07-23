/**
 * useContactLensSelector — state management hook for ContactLensSelector.
 *
 * Extracted from ContactLensSelector.tsx to reduce file size.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { contactLensEncargoService } from "@/lib/api/services/contactLensEncargoService";
import {
  type ContactLensFamily,
  contactLensFamilyService,
} from "@/lib/api/services/contactLensFamilyService";
import { contactLensInventoryService } from "@/lib/api/services/contactLensInventoryService";
import {  type ContactLensMatrixCalculationResult,
  contactLensMatrixService,
} from "@/lib/api/services/contactLensMatrixService";
import { appLogger } from '@/lib/logger';

export interface ContactLensPrescription {
  sphere_od: number;
  cylinder_od: number;
  axis_od: number | null;
  add_od: number | null;
  base_curve_od: number | null;
  diameter_od: number | null;
  sphere_os: number;
  cylinder_os: number;
  axis_os: number | null;
  add_os: number | null;
  base_curve_os: number | null;
  diameter_os: number | null;
}

export interface ContactLensOrderConfig {
  family_id: string;
  family_name: string;
  family_brand: string;
  modality: string;
  use_type: string;
  packaging: string;
  prescription: ContactLensPrescription;
  price: number;
  cost: number;
  inStock: boolean;
  availableQuantity: number;
  quantity: number;
  notes?: string;
}

export function useContactLensSelector(
  prescription: ContactLensPrescription | null | undefined,
  branchId: string | null,
  onSelect: (config: ContactLensOrderConfig | null) => void,
  customer?: {
    id: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    rut?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null,
) {
  const [families, setFamilies] = useState<ContactLensFamily[]>([]);

  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [manualPrescription, setManualPrescription] =
    useState<ContactLensPrescription>({
      sphere_od: 0,
      cylinder_od: 0,
      axis_od: null,
      add_od: null,
      base_curve_od: null,
      diameter_od: null,
      sphere_os: 0,
      cylinder_os: 0,
      axis_os: null,
      add_os: null,
      base_curve_os: null,
      diameter_os: null,
    });
  const [quantity, setQuantity] = useState(1);
  const [stockInfo, setStockInfo] = useState<{
    inStock: boolean;
    availableQuantity: number;
    odMessage?: string;
    osMessage?: string;
  }>({
    inStock: true,
    availableQuantity: 20,
  });
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceResult, setPriceResult] =
    useState<ContactLensMatrixCalculationResult | null>(null);
  const [showEncargoDialog, setShowEncargoDialog] = useState(false);
  const [submittingEncargo, setSubmittingEncargo] = useState(false);

  // Load families on mount
  useEffect(() => {
    contactLensFamilyService
      .getAll()
      .then((data) => setFamilies(data || []))
      .catch((err) => {
        appLogger.error("Error loading families:", err);
        toast.error("Error al cargar familias");
      })
      .finally(() => setLoadingFamilies(false));
  }, []);

  // Active prescription
  const activePrescription = useMemo(() => {
    return prescription || manualPrescription;
  }, [prescription, manualPrescription]);

  // Selected family
  const selectedFamily = useMemo(() => {
    return families.find((f) => f.id === selectedFamilyId) || null;
  }, [families, selectedFamilyId]);

  // Handler
  const handleFamilySelect = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setPriceResult(null);
  };

  // Load price when family changes
  useEffect(() => {
    if (!selectedFamily) return;

    const loadPrice = async () => {
      setLoadingPrice(true);
      try {
        const result = await contactLensMatrixService.calculate(
          selectedFamily.id,
          activePrescription.sphere_od,
          activePrescription.cylinder_od,
          activePrescription.axis_od,
          activePrescription.add_od,
        );

        if (result) {
          setPriceResult(result);
        } else {
          setPriceResult({
            price: 45000,
            cost: 22000,
            family_id: selectedFamily.id,
            family_name: selectedFamily.name,
            brand: selectedFamily.brand || "",
            sphere: activePrescription.sphere_od,
            cylinder: activePrescription.cylinder_od,
            axis: activePrescription.axis_od,
            addition: activePrescription.add_od,
          });
        }
      } catch (err) {
        appLogger.error("Error calculating price:", err);
        toast.error("Error al calcular precio");
      } finally {
        setLoadingPrice(false);
      }
    };

    loadPrice();
    // ponytail: depends on selectedFamilyId + selectedFamily?.id (subtle bug preserved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFamilyId, selectedFamily?.id]);

  // Check stock when family or prescription changes
  useEffect(() => {
    if (!selectedFamily || !branchId) return;

    const checkStock = async () => {
      const odStock = await contactLensInventoryService.checkStock(
        selectedFamily.id,
        branchId,
        activePrescription.sphere_od,
        activePrescription.cylinder_od,
      );

      const osStock = await contactLensInventoryService.checkStock(
        selectedFamily.id,
        branchId,
        activePrescription.sphere_os,
        activePrescription.cylinder_os,
      );

      const inStock = odStock.available && osStock.available;
      const availableQuantity = Math.min(odStock.quantity, osStock.quantity);

      setStockInfo({
        inStock,
        availableQuantity,
        odMessage: odStock.message,
        osMessage: osStock.message,
      });
    };

    checkStock();
  }, [
    selectedFamilyId,
    activePrescription.sphere_od,
    activePrescription.cylinder_od,
    activePrescription.sphere_os,
    activePrescription.cylinder_os,
    branchId,
  ]);

  // Notify parent when configuration changes
  useEffect(() => {
    if (!selectedFamily || !priceResult) {
      onSelect(null);
      return;
    }

    const config: ContactLensOrderConfig = {
      family_id: selectedFamily.id,
      family_name: selectedFamily.name,
      family_brand: selectedFamily.brand || "",
      modality: selectedFamily.modality || "spherical",
      use_type: selectedFamily.use_type || "monthly",
      packaging: selectedFamily.packaging || "box_6",
      prescription: activePrescription,
      price: priceResult.price * quantity,
      cost: (priceResult.cost || 0) * quantity,
      inStock: stockInfo.inStock,
      availableQuantity: stockInfo.availableQuantity,
      quantity,
    };
    onSelect(config);
    // ponytail: depends on selectedFamilyId, priceResult?.price, quantity (minimal deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFamilyId, priceResult?.price, quantity]);

  // Handle create encargo
  const handleCreateEncargo = async (notes: string) => {
    if (!selectedFamily) return;

    setSubmittingEncargo(true);
    try {
      const customerName = customer
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
          customer.name ||
          "Cliente no registrado"
        : "Cliente no registrado";

      await contactLensEncargoService.create({
        customer_id: customer?.id,
        customer_name: customerName,
        customer_rut: customer?.rut || undefined,
        customer_phone: customer?.phone || undefined,
        customer_email: customer?.email || undefined,
        contact_lens_family_id: selectedFamily.id,
        family_name: selectedFamily.name,
        family_brand: selectedFamily.brand || undefined,
        sphere_od: activePrescription.sphere_od,
        cylinder_od: activePrescription.cylinder_od,
        axis_od: activePrescription.axis_od || undefined,
        add_od: activePrescription.add_od || undefined,
        base_curve_od: activePrescription.base_curve_od || undefined,
        diameter_od: activePrescription.diameter_od || undefined,
        sphere_os: activePrescription.sphere_os,
        cylinder_os: activePrescription.cylinder_os,
        axis_os: activePrescription.axis_os || undefined,
        add_os: activePrescription.add_os || undefined,
        base_curve_os: activePrescription.base_curve_os || undefined,
        diameter_os: activePrescription.diameter_os || undefined,
        quantity,
        estimated_price: priceResult?.price,
        cost: priceResult?.cost,
        notes: notes || undefined,
      });

      toast.success("Encargo solicitado correctamente");
      setShowEncargoDialog(false);
    } catch (err) {
      appLogger.error("Error creating encargo:", err);
      toast.error("Error al crear encargo");
    } finally {
      setSubmittingEncargo(false);
    }
  };

  // Options generation
  const sphereOptions = useMemo(() => {
    const opts: number[] = [];
    for (let i = -12; i <= 8; i += 0.25) opts.push(i);
    return opts;
  }, []);

  const cylinderOptions = useMemo(() => {
    const opts: number[] = [];
    for (let i = 0; i >= -4; i -= 0.25) opts.push(i);
    return opts;
  }, []);

  const axisOptions = useMemo(() => {
    const opts: number[] = [];
    for (let i = 0; i <= 180; i += 5) opts.push(i);
    return opts;
  }, []);

  return {
    families,
    loadingFamilies,
    selectedFamilyId,
    handleFamilySelect,
    selectedFamily,
    manualPrescription,
    setManualPrescription,
    activePrescription,
    quantity,
    setQuantity,
    stockInfo,
    loadingPrice,
    priceResult,
    showEncargoDialog,
    setShowEncargoDialog,
    submittingEncargo,
    handleCreateEncargo,
    sphereOptions,
    cylinderOptions,
    axisOptions,
  };
}
