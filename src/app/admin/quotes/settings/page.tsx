"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Save,
  Loader2,
  DollarSign,
  Eye,
  Percent,
  Calendar,
  FileText,
  X,
  Plus,
  ArrowLeft,
  Info,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useBranch } from "@/hooks/useBranch";
import { BranchSelector } from "@/components/admin/BranchSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { quoteSettingsService, QuoteSettings } from "@/lib/api/services";

interface TreatmentPrice {
  price: number;
  enabled: boolean;
}

// Extended QuoteSettings type for form state with additional UI-specific fields
interface FormQuoteSettings extends Omit<QuoteSettings, 'treatment_prices'> {
  treatment_prices: {
    anti_reflective: TreatmentPrice | number;
    blue_light_filter: TreatmentPrice | number;
    uv_protection: TreatmentPrice | number;
    scratch_resistant: TreatmentPrice | number;
    anti_fog: TreatmentPrice | number;
    photochromic?: TreatmentPrice | number;
    polarized?: TreatmentPrice | number;
    tint?: TreatmentPrice | number;
  };
}

export default function QuoteSettingsPage() {
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    isLoading: branchLoading,
  } = useBranch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FormQuoteSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (!branchLoading) {
      fetchSettings();
    }
  }, [currentBranchId, branchLoading]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const fetchedSettings = await quoteSettingsService.get();
      if (fetchedSettings) {
        setSettings(fetchedSettings as FormQuoteSettings);
      } else {
        setSettings(null);
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const isGlobalView = !currentBranchId && isSuperAdmin;

  const handleSave = async () => {
    if (!settings) return;

    if (isGlobalView) {
      const confirmGlobal = window.confirm(
        "¿Está seguro de que desea guardar esta configuración GLOBALMENTE? Se aplicará a todas las sucursales existentes y futuras.",
      );
      if (!confirmGlobal) return;
    }

    try {
      setSaving(true);
      await quoteSettingsService.update(settings as any);

      setHasChanges(false);

      // Notify other tabs/windows about the settings update
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "quote-settings-updated",
          Date.now().toString(),
        );
        window.dispatchEvent(new Event("quote-settings-updated"));
      }

      if (currentBranchId) {
        toast.success("Configuración guardada exitosamente", {
          description:
            "Los cambios se aplicarán automáticamente a los nuevos presupuestos en esta sucursal",
          duration: 5000,
        });
      } else {
        toast.success("Configuración GLOBAL guardada exitosamente", {
          description:
            "Los cambios se han aplicado a TODAS las sucursales de la organización",
          duration: 7000,
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof QuoteSettings>(
    key: K,
    value: QuoteSettings[K],
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: value,
    });
    setHasChanges(true);
  };

  const updateNestedSetting = <
    K extends keyof QuoteSettings,
    NK extends keyof QuoteSettings[K],
  >(
    key: K,
    nestedKey: NK,
    value: any,
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: {
        ...(settings[key] as any),
        [nestedKey]: value,
      },
    });
    setHasChanges(true);
  };

  // Helper functions to normalize treatment price format (backward compatibility)
  const getTreatmentPrice = (value: TreatmentPrice | number): number => {
    return typeof value === "number" ? value : value.price;
  };

  const getTreatmentEnabled = (value: TreatmentPrice | number): boolean => {
    return typeof value === "number" ? true : value.enabled;
  };

  const normalizeTreatmentValue = (
    value: TreatmentPrice | number,
    price?: number,
    enabled?: boolean,
  ): TreatmentPrice => {
    const currentPrice = price ?? getTreatmentPrice(value);
    const currentEnabled = enabled ?? getTreatmentEnabled(value);
    return { price: currentPrice, enabled: currentEnabled };
  };

  const updateTreatmentPrice = (treatment: string, price: number) => {
    if (!settings) return;
    const currentValue =
      settings.treatment_prices[
        treatment as keyof QuoteSettings["treatment_prices"]
      ];
    const normalized = normalizeTreatmentValue(currentValue, price);
    updateNestedSetting(
      "treatment_prices",
      treatment as keyof QuoteSettings["treatment_prices"],
      normalized,
    );
  };

  const updateTreatmentEnabled = (treatment: string, enabled: boolean) => {
    if (!settings) return;
    const currentValue =
      settings.treatment_prices[
        treatment as keyof QuoteSettings["treatment_prices"]
      ];
    const normalized = normalizeTreatmentValue(
      currentValue,
      undefined,
      enabled,
    );
    updateNestedSetting(
      "treatment_prices",
      treatment as keyof QuoteSettings["treatment_prices"],
      normalized,
    );
  };

  const addVolumeDiscount = () => {
    if (!settings) return;
    updateSetting("volume_discounts", [
      ...(settings.volume_discounts || []),
      { min_amount: 0, discount_percentage: 0 },
    ]);
  };

  const updateVolumeDiscount = (
    index: number,
    field: "min_amount" | "discount_percentage",
    value: number,
  ) => {
    if (!settings) return;
    const updated = [...(settings.volume_discounts || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateSetting("volume_discounts", updated);
  };

  const removeVolumeDiscount = (index: number) => {
    if (!settings) return;
    updateSetting(
      "volume_discounts",
      (settings.volume_discounts || []).filter((_, i) => i !== index),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-azul-profundo" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-tierra-media">Error al cargar configuración</p>
            <Button onClick={fetchSettings} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const treatmentLabels: Record<string, string> = {
    anti_reflective: "Anti-reflejante",
    blue_light_filter: "Filtro Luz Azul",
    uv_protection: "Protección UV",
    scratch_resistant: "Anti-rayas",
    anti_fog: "Anti-empañamiento",
    photochromic: "Fotocromático",
    polarized: "Polarizado",
    tint: "Tinte",
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo">
            Configuración de Presupuestos {isGlobalView && "(VISTA GLOBAL)"}
          </h1>
          <p className="text-tierra-media mt-2">
            {isGlobalView
              ? "Configura los parámetros predeterminados para todas las sucursales de la organización"
              : "Personaliza los valores por defecto y parámetros del sistema de presupuestos"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && <BranchSelector />}
          <Link href="/admin/quotes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Changes indicator */}
      {hasChanges && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Tienes cambios sin guardar. Recuerda guardar para que se apliquen a
            los nuevos presupuestos.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content with Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="treatments">
            <Eye className="h-4 w-4 mr-2" />
            Tratamientos
          </TabsTrigger>
          <TabsTrigger value="discounts">
            <Percent className="h-4 w-4 mr-2" />
            Descuentos
          </TabsTrigger>
          <TabsTrigger value="terms">
            <FileText className="h-4 w-4 mr-2" />
            Términos
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Settings */}
        <TabsContent value="general" className="space-y-6">
          {/* Default Values */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Valores por Defecto
              </CardTitle>
              <CardDescription>
                Configura los valores predeterminados que se usarán al crear
                nuevos presupuestos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="labor_cost"
                    className="text-base font-semibold"
                  >
                    Mano de Obra por Defecto
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tierra-media">
                      CLP
                    </span>
                    <Input
                      id="labor_cost"
                      type="number"
                      value={settings.default_labor_cost}
                      onChange={(e) =>
                        updateSetting(
                          "default_labor_cost",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="pl-12"
                    />
                  </div>
                  <p className="text-xs text-tierra-media">
                    Este valor se aplicará automáticamente a nuevos presupuestos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="tax_percentage"
                    className="text-base font-semibold"
                  >
                    Porcentaje de IVA
                  </Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-tierra-media">
                      %
                    </span>
                    <Input
                      id="tax_percentage"
                      type="number"
                      step="0.1"
                      value={settings.default_tax_percentage}
                      onChange={(e) =>
                        updateSetting(
                          "default_tax_percentage",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="pr-12"
                    />
                  </div>
                  <p className="text-xs text-tierra-media">
                    Porcentaje de impuesto aplicado por defecto
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="expiration_days"
                    className="text-base font-semibold"
                  >
                    Días de Validez
                  </Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-tierra-media">
                      días
                    </span>
                    <Input
                      id="expiration_days"
                      type="number"
                      min="1"
                      value={settings.default_expiration_days}
                      onChange={(e) =>
                        updateSetting(
                          "default_expiration_days",
                          parseInt(e.target.value) || 30,
                        )
                      }
                      className="pr-12"
                    />
                  </div>
                  <p className="text-xs text-tierra-media">
                    Período de validez por defecto para presupuestos
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-base font-semibold mb-4 block">
                  Configuración de IVA
                </Label>
                <p className="text-sm text-tierra-media mb-4">
                  Indica si los costos ya incluyen IVA o si se debe calcular
                  adicionalmente
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="labor_cost_includes_tax"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Mano de Obra incluye IVA
                      </Label>
                      <p className="text-xs text-tierra-media">
                        El costo de mano de obra ya incluye el IVA
                      </p>
                    </div>
                    <Switch
                      id="labor_cost_includes_tax"
                      checked={settings.labor_cost_includes_tax ?? true}
                      onCheckedChange={(checked) =>
                        updateSetting("labor_cost_includes_tax", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="lens_cost_includes_tax"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Lentes incluyen IVA
                      </Label>
                      <p className="text-xs text-tierra-media">
                        El costo de lentes ya incluye el IVA
                      </p>
                    </div>
                    <Switch
                      id="lens_cost_includes_tax"
                      checked={settings.lens_cost_includes_tax ?? true}
                      onCheckedChange={(checked) =>
                        updateSetting("lens_cost_includes_tax", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="treatments_cost_includes_tax"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Tratamientos incluyen IVA
                      </Label>
                      <p className="text-xs text-tierra-media">
                        El costo de tratamientos ya incluye el IVA
                      </p>
                    </div>
                    <Switch
                      id="treatments_cost_includes_tax"
                      checked={settings.treatments_cost_includes_tax ?? true}
                      onCheckedChange={(checked) =>
                        updateSetting("treatments_cost_includes_tax", checked)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validity Period Info */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700">
                <Calendar className="h-5 w-5 mr-2" />
                Información de Validez
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    Los presupuestos se marcarán automáticamente como
                    &quot;Expirado&quot; después de{" "}
                    <strong>{settings.default_expiration_days} días</strong>{" "}
                    desde su creación.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Este período puede ser modificado individualmente en cada
                    presupuesto si es necesario.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Treatments */}
        <TabsContent value="treatments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Precios de Tratamientos y Recubrimientos
              </CardTitle>
              <CardDescription>
                Configura los precios de los tratamientos aplicables a los
                lentes (en CLP)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(settings.treatment_prices).map(
                  ([key, value]) => {
                    const price = getTreatmentPrice(value);
                    const enabled = getTreatmentEnabled(value);
                    return (
                      <div
                        key={key}
                        className="p-4 border rounded-lg space-y-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {treatmentLabels[key] || key}
                          </Label>
                          <div className="flex items-center space-x-2">
                            <Label
                              htmlFor={`enabled-${key}`}
                              className="text-xs text-tierra-media cursor-pointer"
                            >
                              Mostrar
                            </Label>
                            <Switch
                              id={`enabled-${key}`}
                              checked={enabled}
                              onCheckedChange={(checked) =>
                                updateTreatmentEnabled(key, checked)
                              }
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tierra-media text-sm">
                            CLP
                          </span>
                          <Input
                            type="number"
                            value={price}
                            onChange={(e) =>
                              updateTreatmentPrice(
                                key,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="pl-12"
                            disabled={!enabled}
                          />
                        </div>
                        <p className="text-xs text-tierra-media">
                          {formatCurrency(price)}
                        </p>
                        {!enabled && (
                          <p className="text-xs text-amber-600">
                            Oculto en formulario
                          </p>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Volume Discounts */}
        <TabsContent value="discounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Percent className="h-5 w-5 mr-2" />
                Descuentos por Volumen
              </CardTitle>
              <CardDescription>
                Configura descuentos automáticos según el monto total del
                presupuesto. Los descuentos se aplicarán automáticamente cuando
                el monto alcance el mínimo configurado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settings.volume_discounts?.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Percent className="h-12 w-12 mx-auto mb-4 text-tierra-media" />
                    <p className="text-tierra-media mb-2">
                      No hay descuentos configurados
                    </p>
                    <p className="text-xs text-tierra-media mb-4">
                      Agrega descuentos por volumen para aplicar automáticamente
                      según el monto del presupuesto
                    </p>
                    <Button variant="outline" onClick={addVolumeDiscount}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Primer Descuento
                    </Button>
                  </div>
                ) : (
                  <>
                    {settings.volume_discounts?.map((discount, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <Label>Monto Mínimo (CLP)</Label>
                            <Input
                              type="number"
                              value={discount.min_amount}
                              onChange={(e) =>
                                updateVolumeDiscount(
                                  index,
                                  "min_amount",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Descuento (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={discount.discount_percentage}
                              onChange={(e) =>
                                updateVolumeDiscount(
                                  index,
                                  "discount_percentage",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVolumeDiscount(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" onClick={addVolumeDiscount}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Descuento
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Terms and Conditions */}
        <TabsContent value="terms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Términos y Condiciones / Plantilla de Notas
              </CardTitle>
              <CardDescription>
                Configura texto por defecto para términos y condiciones y notas
                en los presupuestos. Estos textos aparecerán automáticamente en
                los nuevos presupuestos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Términos y Condiciones por Defecto
                </Label>
                <Textarea
                  value={settings.terms_and_conditions || ""}
                  onChange={(e) =>
                    updateSetting("terms_and_conditions", e.target.value)
                  }
                  rows={8}
                  className="mt-1 font-mono text-sm"
                  placeholder="Ingresa los términos y condiciones por defecto para los presupuestos..."
                />
                <p className="text-xs text-tierra-media">
                  Este texto aparecerá en la sección de términos y condiciones
                  de los presupuestos
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Plantilla de Notas
                </Label>
                <Textarea
                  value={settings.notes_template || ""}
                  onChange={(e) =>
                    updateSetting("notes_template", e.target.value)
                  }
                  rows={6}
                  className="mt-1 font-mono text-sm"
                  placeholder="Ingresa una plantilla de notas por defecto..."
                />
                <p className="text-xs text-tierra-media">
                  Esta plantilla se usará como base para las notas en los
                  presupuestos
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
