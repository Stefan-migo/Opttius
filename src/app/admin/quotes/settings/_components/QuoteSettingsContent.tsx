"use client";

import {
  AlertCircle,
  ArrowLeft,
  Eye,
  FileText,
  Loader2,
  Percent,
  Save,
  Settings,
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
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";
import { QuoteSettings, quoteSettingsService } from "@/lib/api/services";
import { appLogger } from '@/lib/logger';

import { QuoteDiscountsTab } from "./QuoteDiscountsTab";
import { QuoteGeneralTab } from "./QuoteGeneralTab";
import { QuoteTermsTab } from "./QuoteTermsTab";
import { QuoteTreatmentsTab } from "./QuoteTreatmentsTab";

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

export default function QuoteSettingsContent() {
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
      appLogger.error("Error fetching settings:", error);
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
      await quoteSettingsService.update(settings as never);

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
      appLogger.error("Error saving settings:", error);
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
    NK extends string,
  >(
    key: K,
    nestedKey: NK,
    value: unknown,
  ) => {
    if (!settings) return;
    const current = settings[key] as Record<string, unknown>;
    setSettings({
      ...settings,
      [key]: {
        ...current,
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
          <QuoteGeneralTab
            defaultExpirationDays={settings.default_expiration_days}
            defaultLaborCost={settings.default_labor_cost}
            defaultTaxPercentage={settings.default_tax_percentage}
            laborCostIncludesTax={settings.labor_cost_includes_tax ?? true}
            lensCostIncludesTax={settings.lens_cost_includes_tax ?? true}
            treatmentsCostIncludesTax={settings.treatments_cost_includes_tax ?? true}
            onUpdateSetting={updateSetting}
          />
        </TabsContent>

        {/* Tab 2: Treatments */}
        <TabsContent className="space-y-6" value="treatments">
          <QuoteTreatmentsTab
            getTreatmentEnabled={getTreatmentEnabled}
            getTreatmentPrice={getTreatmentPrice}
            TREATMENT_KEYS={TREATMENT_KEYS}
            treatmentLabels={treatmentLabels}
            treatmentPrices={settings.treatment_prices as Record<string, TreatmentPrice | number>}
            updateNestedSetting={updateNestedSetting as (key: string, nestedKey: string, value: unknown) => void}
            updateTreatmentEnabled={updateTreatmentEnabled}
            updateTreatmentPrice={updateTreatmentPrice}
          />
        </TabsContent>

        {/* Tab 3: Volume Discounts */}
        <TabsContent className="space-y-6" value="discounts">
          <QuoteDiscountsTab
            volumeDiscounts={settings.volume_discounts ?? []}
            onAddDiscount={addVolumeDiscount}
            onRemoveDiscount={removeVolumeDiscount}
            onUpdateDiscount={updateVolumeDiscount}
          />
        </TabsContent>

        {/* Tab 4: Terms and Conditions */}
        <TabsContent className="space-y-6" value="terms">
          <QuoteTermsTab
            notesTemplate={settings.notes_template || ""}
            termsAndConditions={settings.terms_and_conditions || ""}
            onUpdateSetting={updateSetting}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
