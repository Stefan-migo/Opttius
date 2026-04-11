"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  Eye,
  FileText,
  Info,
  Loader2,
  Percent,
  Plus,
  Save,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BranchSelector } from "@/components/admin/BranchSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBranch } from "@/hooks/useBranch";
import { QuoteSettings, quoteSettingsService } from "@/lib/api/services";
import { formatCurrency } from "@/lib/utils";

interface TreatmentPrice {
  price: number;
  enabled: boolean;
}

// Extended QuoteSettings type for form state with additional UI-specific fields
interface FormQuoteSettings extends Omit<QuoteSettings, "treatment_prices"> {
  treatment_prices: {
    // Tratamientos que se aplican en laboratorio local
    anti_reflective: TreatmentPrice | number;
    scratch_resistant: TreatmentPrice | number;
    tint: TreatmentPrice | number;
    // Servicio personalizado
    custom_service?: {
      enabled: boolean;
      name: string;
      price: number;
    };
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
      await quoteSettingsService.update(settings as unknown);

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
    value: unknown,
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: {
        ...(settings[key] as unknown),
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
        <Loader2 className="h-8 w-8 animate-spin text-epoch-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-admin-text-tertiary">
              Error al cargar configuración
            </p>
            <Button className="mt-4" onClick={fetchSettings}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const treatmentLabels: Record<string, string> = {
    // Tratamientos de laboratorio local
    anti_reflective: "Anti-reflejante",
    scratch_resistant: "Anti-rayas",
    tint: "Tinte",
    // Servicio personalizado
    custom_service: "Servicio Personalizado",
  };

  // Lista de treatments a mostrar (solo los que se aplican en laboratorio)
  const TREATMENT_KEYS = ["anti_reflective", "scratch_resistant", "tint"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-epoch-primary">
            Configuración de Presupuestos {isGlobalView && "(VISTA GLOBAL)"}
          </h1>
          <p className="text-admin-text-tertiary mt-2">
            {isGlobalView
              ? "Configura los parámetros predeterminados para todas las sucursales de la organización"
              : "Personaliza los valores por defecto y parámetros del sistema de presupuestos"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && <BranchSelector />}
          <Link href="/admin/quotes">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <Button
            className="min-w-[140px]"
            disabled={saving || !hasChanges}
            onClick={handleSave}
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
        className="space-y-6"
        value={activeTab}
        onValueChange={setActiveTab}
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
        <TabsContent className="space-y-6" value="general">
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
                    className="text-base font-semibold"
                    htmlFor="labor_cost"
                  >
                    Mano de Obra por Defecto
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary">
                      CLP
                    </span>
                    <Input
                      className="pl-12"
                      id="labor_cost"
                      type="number"
                      value={settings.default_labor_cost}
                      onChange={(e) =>
                        updateSetting(
                          "default_labor_cost",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <p className="text-xs text-admin-text-tertiary">
                    Este valor se aplicará automáticamente a nuevos presupuestos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    className="text-base font-semibold"
                    htmlFor="tax_percentage"
                  >
                    Porcentaje de IVA
                  </Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary">
                      %
                    </span>
                    <Input
                      className="pr-12"
                      id="tax_percentage"
                      step="0.1"
                      type="number"
                      value={settings.default_tax_percentage}
                      onChange={(e) =>
                        updateSetting(
                          "default_tax_percentage",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <p className="text-xs text-admin-text-tertiary">
                    Porcentaje de impuesto aplicado por defecto
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    className="text-base font-semibold"
                    htmlFor="expiration_days"
                  >
                    Días de Validez
                  </Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary">
                      días
                    </span>
                    <Input
                      className="pr-12"
                      id="expiration_days"
                      min="1"
                      type="number"
                      value={settings.default_expiration_days}
                      onChange={(e) =>
                        updateSetting(
                          "default_expiration_days",
                          parseInt(e.target.value) || 30,
                        )
                      }
                    />
                  </div>
                  <p className="text-xs text-admin-text-tertiary">
                    Período de validez por defecto para presupuestos
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-base font-semibold mb-4 block">
                  Configuración de IVA
                </Label>
                <p className="text-sm text-admin-text-tertiary mb-4">
                  Indica si los costos ya incluyen IVA o si se debe calcular
                  adicionalmente
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label
                        className="text-sm font-medium cursor-pointer"
                        htmlFor="labor_cost_includes_tax"
                      >
                        Mano de Obra incluye IVA
                      </Label>
                      <p className="text-xs text-admin-text-tertiary">
                        El costo de mano de obra ya incluye el IVA
                      </p>
                    </div>
                    <Switch
                      checked={settings.labor_cost_includes_tax ?? true}
                      id="labor_cost_includes_tax"
                      onCheckedChange={(checked) =>
                        updateSetting("labor_cost_includes_tax", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label
                        className="text-sm font-medium cursor-pointer"
                        htmlFor="lens_cost_includes_tax"
                      >
                        Lentes incluyen IVA
                      </Label>
                      <p className="text-xs text-admin-text-tertiary">
                        El costo de lentes ya incluye el IVA
                      </p>
                    </div>
                    <Switch
                      checked={settings.lens_cost_includes_tax ?? true}
                      id="lens_cost_includes_tax"
                      onCheckedChange={(checked) =>
                        updateSetting("lens_cost_includes_tax", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label
                        className="text-sm font-medium cursor-pointer"
                        htmlFor="treatments_cost_includes_tax"
                      >
                        Tratamientos incluyen IVA
                      </Label>
                      <p className="text-xs text-admin-text-tertiary">
                        El costo de tratamientos ya incluye el IVA
                      </p>
                    </div>
                    <Switch
                      checked={settings.treatments_cost_includes_tax ?? true}
                      id="treatments_cost_includes_tax"
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
        <TabsContent className="space-y-6" value="treatments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Tratamientos Extra
              </CardTitle>
              <CardDescription>
                Configura los precios de tratamientos adicionales que se cobran
                por separado. Los tratamientos como Polarizado y Fotocromático
                ya vienen incluidos en el lente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TREATMENT_KEYS.map((key) => {
                  const value =
                    settings.treatment_prices?.[
                      key as keyof typeof settings.treatment_prices
                    ];
                  const price = getTreatmentPrice(value);
                  const enabled = getTreatmentEnabled(value);
                  return (
                    <div
                      className="p-4 border rounded-lg space-y-3 hover:bg-gray-50 transition-colors"
                      key={key}
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          {treatmentLabels[key] || key}
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Label
                            className="text-xs text-admin-text-tertiary cursor-pointer"
                            htmlFor={`enabled-${key}`}
                          >
                            Mostrar
                          </Label>
                          <Switch
                            checked={enabled}
                            id={`enabled-${key}`}
                            onCheckedChange={(checked) =>
                              updateTreatmentEnabled(key, checked)
                            }
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary text-sm">
                          CLP
                        </span>
                        <Input
                          className="pl-12"
                          disabled={!enabled}
                          type="number"
                          value={price}
                          onChange={(e) =>
                            updateTreatmentPrice(
                              key,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <p className="text-xs text-admin-text-tertiary">
                        {formatCurrency(price)}
                      </p>
                      {!enabled && (
                        <p className="text-xs text-amber-600">
                          Oculto en formulario
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Servicio Personalizado */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Servicio Personalizado
                </h3>
                <p className="text-sm text-admin-text-tertiary mb-4">
                  Agrega un servicio o tratamiento personalizado con nombre y
                  precio configurable.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={
                        settings.treatment_prices?.custom_service?.enabled ??
                        false
                      }
                      id="custom-service-enabled"
                      onCheckedChange={(checked) => {
                        updateNestedSetting(
                          "treatment_prices",
                          "custom_service" as keyof typeof settings.treatment_prices,
                          {
                            enabled: checked,
                            name:
                              settings.treatment_prices?.custom_service?.name ||
                              "Servicio Extra",
                            price:
                              settings.treatment_prices?.custom_service
                                ?.price || 0,
                          },
                        );
                      }}
                    />
                    <Label
                      htmlFor="custom-service-enabled"
                      className="cursor-pointer"
                    >
                      Habilitar
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del servicio</Label>
                    <Input
                      value={
                        settings.treatment_prices?.custom_service?.name || ""
                      }
                      onChange={(e) => {
                        updateNestedSetting(
                          "treatment_prices",
                          "custom_service" as keyof typeof settings.treatment_prices,
                          {
                            enabled:
                              settings.treatment_prices?.custom_service
                                ?.enabled ?? false,
                            name: e.target.value,
                            price:
                              settings.treatment_prices?.custom_service
                                ?.price || 0,
                          },
                        );
                      }}
                      placeholder="Ej: Tintado especial"
                      disabled={
                        !settings.treatment_prices?.custom_service?.enabled
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio (CLP)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary text-sm">
                        CLP
                      </span>
                      <Input
                        className="pl-12"
                        type="number"
                        value={
                          settings.treatment_prices?.custom_service?.price || 0
                        }
                        onChange={(e) => {
                          updateNestedSetting(
                            "treatment_prices",
                            "custom_service" as keyof typeof settings.treatment_prices,
                            {
                              enabled:
                                settings.treatment_prices?.custom_service
                                  ?.enabled ?? false,
                              name:
                                settings.treatment_prices?.custom_service
                                  ?.name || "Servicio Extra",
                              price: parseFloat(e.target.value) || 0,
                            },
                          );
                        }}
                        disabled={
                          !settings.treatment_prices?.custom_service?.enabled
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Volume Discounts */}
        <TabsContent className="space-y-6" value="discounts">
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
                    <Percent className="h-12 w-12 mx-auto mb-4 text-admin-text-tertiary" />
                    <p className="text-admin-text-tertiary mb-2">
                      No hay descuentos configurados
                    </p>
                    <p className="text-xs text-admin-text-tertiary mb-4">
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
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        key={index}
                      >
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <Label>Monto Mínimo (CLP)</Label>
                            <Input
                              className="mt-1"
                              type="number"
                              value={discount.min_amount}
                              onChange={(e) =>
                                updateVolumeDiscount(
                                  index,
                                  "min_amount",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label>Descuento (%)</Label>
                            <Input
                              className="mt-1"
                              step="0.1"
                              type="number"
                              value={discount.discount_percentage}
                              onChange={(e) =>
                                updateVolumeDiscount(
                                  index,
                                  "discount_percentage",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                        </div>
                        <Button
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeVolumeDiscount(index)}
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
        <TabsContent className="space-y-6" value="terms">
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
                  className="mt-1 font-mono text-sm"
                  placeholder="Ingresa los términos y condiciones por defecto para los presupuestos..."
                  rows={8}
                  value={settings.terms_and_conditions || ""}
                  onChange={(e) =>
                    updateSetting("terms_and_conditions", e.target.value)
                  }
                />
                <p className="text-xs text-admin-text-tertiary">
                  Este texto aparecerá en la sección de términos y condiciones
                  de los presupuestos
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Plantilla de Notas
                </Label>
                <Textarea
                  className="mt-1 font-mono text-sm"
                  placeholder="Ingresa una plantilla de notas por defecto..."
                  rows={6}
                  value={settings.notes_template || ""}
                  onChange={(e) =>
                    updateSetting("notes_template", e.target.value)
                  }
                />
                <p className="text-xs text-admin-text-tertiary">
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
