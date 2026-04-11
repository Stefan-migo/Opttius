/**
 * ContactLensSelector - Selector de Lentes de Contacto para POS
 *
 * Componente simplificado para evitar infinite loops
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [encargoNotes, setEncargoNotes] = useState("");
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
  const handleCreateEncargo = async () => {
    if (!selectedFamily) return;

    setSubmittingEncargo(true);
    try {
      // Build customer name from customer object
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
        notes: encargoNotes || undefined,
      });

      toast.success("Encargo solicitado correctamente");
      setShowEncargoDialog(false);
      setEncargoNotes("");
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
        {/* 1. Familia */}
        <div>
          <Label>Marca y Familia</Label>
          <Select
            value={selectedFamilyId}
            onValueChange={handleFamilySelect}
            disabled={loadingFamilies}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingFamilies ? "Cargando..." : "Selecciona una familia"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {families.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No hay familias disponibles
                </div>
              ) : (
                families.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{family.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {family.brand || "Sin marca"} • {family.modality}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Info familia */}
        {selectedFamily && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{selectedFamily.modality}</Badge>
              <Badge variant="outline">{selectedFamily.use_type}</Badge>
              <Badge variant="outline">{selectedFamily.packaging}</Badge>
            </div>
            {selectedFamily.description && (
              <p className="text-sm text-muted-foreground">
                {selectedFamily.description}
              </p>
            )}
          </div>
        )}

        {/* 2. Graduación */}
        {selectedFamily && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Graduación</Label>
              {!prescription && (
                <span className="text-xs text-muted-foreground">
                  Ingrese la graduación manualmente
                </span>
              )}
            </div>

            {prescription ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm mb-2 text-center">
                    Ojo Derecho (OD)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Esfera:</span>{" "}
                      <span className="font-medium">
                        {prescription.sphere_od >= 0 ? "+" : ""}
                        {prescription.sphere_od.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cilindro:</span>{" "}
                      <span className="font-medium">
                        {prescription.cylinder_od >= 0 ? "+" : ""}
                        {prescription.cylinder_od.toFixed(2)}
                      </span>
                    </div>
                    {prescription.axis_od && (
                      <div>
                        <span className="text-muted-foreground">Eje:</span>{" "}
                        <span className="font-medium">
                          {prescription.axis_od}°
                        </span>
                      </div>
                    )}
                    {prescription.add_od && (
                      <div>
                        <span className="text-muted-foreground">Adición:</span>{" "}
                        <span className="font-medium">
                          +{prescription.add_od.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm mb-2 text-center">
                    Ojo Izquierdo (OS)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Esfera:</span>{" "}
                      <span className="font-medium">
                        {prescription.sphere_os >= 0 ? "+" : ""}
                        {prescription.sphere_os.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cilindro:</span>{" "}
                      <span className="font-medium">
                        {prescription.cylinder_os >= 0 ? "+" : ""}
                        {prescription.cylinder_os.toFixed(2)}
                      </span>
                    </div>
                    {prescription.axis_os && (
                      <div>
                        <span className="text-muted-foreground">Eje:</span>{" "}
                        <span className="font-medium">
                          {prescription.axis_os}°
                        </span>
                      </div>
                    )}
                    {prescription.add_os && (
                      <div>
                        <span className="text-muted-foreground">Adición:</span>{" "}
                        <span className="font-medium">
                          +{prescription.add_os.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-center">OD</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Esfera</Label>
                      <Select
                        value={manualPrescription.sphere_od.toString()}
                        onValueChange={(v) =>
                          setManualPrescription((p) => ({
                            ...p,
                            sphere_od: parseFloat(v),
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-40">
                          {sphereOptions.map((s) => (
                            <SelectItem key={s} value={s.toString()}>
                              {s >= 0 ? "+" : ""}
                              {s.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Cilindro</Label>
                      <Select
                        value={manualPrescription.cylinder_od.toString()}
                        onValueChange={(v) =>
                          setManualPrescription((p) => ({
                            ...p,
                            cylinder_od: parseFloat(v),
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-40">
                          {cylinderOptions.map((c) => (
                            <SelectItem key={c} value={c.toString()}>
                              {c >= 0 ? "+" : ""}
                              {c.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-center">OS</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Esfera</Label>
                      <Select
                        value={manualPrescription.sphere_os.toString()}
                        onValueChange={(v) =>
                          setManualPrescription((p) => ({
                            ...p,
                            sphere_os: parseFloat(v),
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-40">
                          {sphereOptions.map((s) => (
                            <SelectItem key={s} value={s.toString()}>
                              {s >= 0 ? "+" : ""}
                              {s.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Cilindro</Label>
                      <Select
                        value={manualPrescription.cylinder_os.toString()}
                        onValueChange={(v) =>
                          setManualPrescription((p) => ({
                            ...p,
                            cylinder_os: parseFloat(v),
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-40">
                          {cylinderOptions.map((c) => (
                            <SelectItem key={c} value={c.toString()}>
                              {c >= 0 ? "+" : ""}
                              {c.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Precio y Stock */}
        {selectedFamily && (
          <div className="space-y-4">
            <Separator />

            {/* Cantidad */}
            <div>
              <Label>Cantidad (cajas)</Label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((q) => (
                  <Button
                    key={q}
                    size="sm"
                    variant={quantity === q ? "default" : "outline"}
                    onClick={() => setQuantity(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            {/* Precio */}
            {priceResult && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">
                    Precio por caja:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(priceResult.price)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    Total ({quantity} caja{quantity > 1 ? "s" : ""}):
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(priceResult.price * quantity)}
                  </span>
                </div>
              </div>
            )}

            {loadingPrice && (
              <div className="text-center text-muted-foreground">
                Calculando precio...
              </div>
            )}

            {/* Stock */}
            <div
              className={`p-3 rounded-lg ${stockInfo.inStock ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}
            >
              <div className="flex items-center gap-2">
                {stockInfo.inStock ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="font-medium text-green-700">
                      ✅ Disponible
                    </span>
                    <span className="text-sm text-green-600">
                      ({stockInfo.availableQuantity} cajas)
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="font-medium text-amber-700">
                      ⚠️ Sin stock
                    </span>
                    <span className="text-sm text-amber-600">(2-3 días)</span>
                  </>
                )}
              </div>
              {!stockInfo.inStock && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowEncargoDialog(true)}
                  >
                    Solicitar encargo
                  </Button>
                </div>
              )}
            </div>
          </div>
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

        {/* Dialog encargo */}
        <Dialog open={showEncargoDialog} onOpenChange={setShowEncargoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Encargo</DialogTitle>
              <DialogDescription>
                Crear orden de compra para este producto
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{selectedFamily?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedFamily?.brand}
                </div>
                <div className="text-sm mt-1">Cantidad: {quantity} caja(s)</div>
              </div>
              <div>
                <Label>Notas adicionales</Label>
                <Input
                  value={encargoNotes}
                  onChange={(e) => setEncargoNotes(e.target.value)}
                  placeholder="Instrucciones..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEncargoDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateEncargo}
                disabled={submittingEncargo}
              >
                {submittingEncargo ? "Enviando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
