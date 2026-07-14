/**
 * ContactLensSelector - Selector de Lentes de Contacto para POS
 *
 * Componente simplificado para evitar infinite loops
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  contactLensFamilyService,
  type ContactLensFamily,
} from "@/lib/api/services/contactLensFamilyService";
import {
  contactLensMatrixService,
  type ContactLensMatrixCalculationResult,
} from "@/lib/api/services/contactLensMatrixService";
import { contactLensInventoryService } from "@/lib/api/services/contactLensInventoryService";
import { contactLensEncargoService } from "@/lib/api/services/contactLensEncargoService";
import { formatCurrency } from "@/lib/utils";

import { ContactLensEncargoDialog } from "./ContactLensEncargoDialog";
import { ContactLensFamilySelector } from "./ContactLensFamilySelector";
import { ContactLensPrescriptionSection } from "./ContactLensPrescriptionSection";
import { ContactLensPriceStock } from "./ContactLensPriceStock";

// Tipos para la graduación de LC
interface ContactLensPrescription {
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

// Tipo para configurar la orden de LC
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

// Props del componente
interface ContactLensSelectorProps {
  prescription?: ContactLensPrescription | null;
  branchId: string | null;
  onSelect: (config: ContactLensOrderConfig | null) => void;
  selectedConfig: ContactLensOrderConfig | null;
  // Customer info for encargos
  customer?: {
    id: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    rut?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export function ContactLensSelector({
  prescription,
  branchId,
  onSelect,
  selectedConfig,
  customer,
}: ContactLensSelectorProps) {
  // Estado simple
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

  // Dialog
  const [showEncargoDialog, setShowEncargoDialog] = useState(false);
  const [submittingEncargo, setSubmittingEncargo] = useState(false);

  // Cargar familias al montar
  useEffect(() => {
    contactLensFamilyService
      .getAll()
      .then((data) => setFamilies(data || []))
      .catch((err) => {
        console.error("Error loading families:", err);
        toast.error("Error al cargar familias");
      })
      .finally(() => setLoadingFamilies(false));
  }, []);

  // Graduación activa
  const activePrescription = useMemo(() => {
    return prescription || manualPrescription;
  }, [prescription, manualPrescription]);

  // Familia seleccionada
  const selectedFamily = useMemo(() => {
    return families.find((f) => f.id === selectedFamilyId) || null;
  }, [families, selectedFamilyId]);

  // Handler para seleccionar familia
  const handleFamilySelect = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setPriceResult(null); // Reset price
  };

  // Cargar precio cuando cambia la familia
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
        console.error("Error calculating price:", err);
        toast.error("Error al calcular precio");
      } finally {
        setLoadingPrice(false);
      }
    };

    loadPrice();
  }, [selectedFamilyId, selectedFamily?.id]); // Solo cargar cuando cambia el ID

  // Check stock when family or prescription changes
  useEffect(() => {
    if (!selectedFamily || !branchId) return;

    const checkStock = async () => {
      // Check stock for OD (right eye)
      const odStock = await contactLensInventoryService.checkStock(
        selectedFamily.id,
        branchId,
        activePrescription.sphere_od,
        activePrescription.cylinder_od,
      );

      // Check stock for OS (left eye)
      const osStock = await contactLensInventoryService.checkStock(
        selectedFamily.id,
        branchId,
        activePrescription.sphere_os,
        activePrescription.cylinder_os,
      );

      // Both eyes need stock for "in stock" status
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

  // Notificar al padre cuando cambia la configuración
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
  }, [selectedFamilyId, priceResult?.price, quantity]); // Dependencias mínimas

  // Handler crear encargo
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
      console.error("Error creating encargo:", err);
      toast.error("Error al crear encargo");
    } finally {
      setSubmittingEncargo(false);
    }
  };

  // Opciones de graduación
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>Lentes de Contacto</span>
          {selectedConfig && (
            <Badge variant="default" className="ml-auto">
              Configurado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ContactLensFamilySelector
          families={families}
          selectedFamilyId={selectedFamilyId}
          loadingFamilies={loadingFamilies}
          selectedFamily={selectedFamily}
          onSelect={handleFamilySelect}
        />

        {selectedFamily && (
          <ContactLensPrescriptionSection
            prescription={prescription}
            manualPrescription={manualPrescription}
            sphereOptions={sphereOptions}
            cylinderOptions={cylinderOptions}
            onManualChange={(p) => setManualPrescription(p)}
          />
        )}

        {selectedFamily && (
          <ContactLensPriceStock
            priceResult={priceResult}
            stockInfo={stockInfo}
            quantity={quantity}
            loadingPrice={loadingPrice}
            onQuantityChange={setQuantity}
            onRequestEncargo={() => setShowEncargoDialog(true)}
          />
        )}

        {/* Resumen */}
        {selectedConfig && (
          <div className="mt-4 p-3 border border-primary/20 rounded-lg bg-primary/5">
            <div className="text-sm font-medium mb-2">Resumen:</div>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Producto:</span>{" "}
                {selectedConfig.family_name}
              </div>
              <div>
                <span className="text-muted-foreground">Cantidad:</span>{" "}
                {selectedConfig.quantity} caja(s)
              </div>
              <div className="font-medium text-primary mt-2">
                Total: {formatCurrency(selectedConfig.price)}
              </div>
            </div>
          </div>
        )}

        <ContactLensEncargoDialog
          open={showEncargoDialog}
          family={selectedFamily}
          quantity={quantity}
          submitting={submittingEncargo}
          onOpenChange={setShowEncargoDialog}
          onConfirm={handleCreateEncargo}
        />
      </CardContent>
    </Card>
  );
}
