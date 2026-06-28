"use client";

import { ArrowLeft, Eye, FileText, Loader2, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BranchSelector } from "@/components/admin/BranchSelector";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";

import BillingTab from "./_components/BillingTab";
import POSTab from "./_components/POSTab";
import PreviewTab from "./_components/PreviewTab";

interface POSSettings {
  min_deposit_percent: number;
  min_deposit_amount: number | null;
}

interface BillingSettings {
  id?: string;
  branch_id: string;
  business_name: string;
  business_rut: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  logo_url?: string;
  header_text?: string;
  footer_text?: string;
  terms_and_conditions?: string;
  default_document_type: "boleta" | "factura";
  printer_type?: "thermal" | "a4" | "letter" | "custom";
  printer_width_mm?: number;
  printer_height_mm?: number;
  auto_print_receipt?: boolean;
}

export default function POSBillingSettingsPage() {
  const router = useRouter();
  const {
    currentBranchId,
    isSuperAdmin,
    isLoading: branchLoading,
  } = useBranch();
  const [activeTab, setActiveTab] = useState<"pos" | "billing" | "preview">(
    "pos",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // POS Settings
  const [posSettings, setPosSettings] = useState<POSSettings>({
    min_deposit_percent: 50,
    min_deposit_amount: null,
  });

  // Billing Settings
  const [billingSettings, setBillingSettings] = useState<BillingSettings>({
    branch_id: currentBranchId || "",
    business_name: "",
    business_rut: "",
    business_address: "",
    business_phone: "",
    business_email: "",
    logo_url: "",
    header_text: "",
    footer_text: "",
    terms_and_conditions: "",
    default_document_type: "boleta",
    printer_type: "thermal",
    printer_width_mm: 80,
    printer_height_mm: 297,
  });

  const isGlobalView = !currentBranchId && isSuperAdmin;

  useEffect(() => {
    if (!branchLoading) {
      fetchAllSettings();
    }
  }, [currentBranchId, branchLoading]);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const headers = {
        ...getBranchHeader(currentBranchId),
      };

      // Fetch POS settings
      const posResponse = await fetch("/api/admin/pos/settings", {
        headers,
        credentials: "include",
      });
      if (posResponse.ok) {
        const posData = await posResponse.json();
        if (posData.settings) {
          setPosSettings({
            min_deposit_percent: posData.settings.min_deposit_percent || 50,
            min_deposit_amount: posData.settings.min_deposit_amount || null,
          });
        }
      }

      // Fetch Billing settings
      const billingResponse = await fetch("/api/admin/billing/settings", {
        headers,
        credentials: "include",
      });
      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        const settings = billingData.data ?? billingData.settings;
        if (settings) {
          setBillingSettings({
            ...settings,
            printer_type: settings.printer_type || "thermal",
            printer_width_mm: settings.printer_width_mm || 80,
            printer_height_mm: settings.printer_height_mm || 297,
          });
        }
      } else if (billingResponse.status !== 404) {
        const error = await billingResponse.json();
        toast.error(error.error || "Error al cargar configuración de boletas");
      }
    } catch (error: unknown) {
      console.error("Error fetching settings:", error);
      toast.error("Error al cargar configuraciones");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePOS = async () => {
    if (isGlobalView && !isSuperAdmin) {
      toast.error("Debe seleccionar una sucursal para configurar el POS");
      return;
    }

    if (isGlobalView) {
      const confirmGlobal = window.confirm(
        "¿Está seguro de que desea guardar esta configuración GLOBALMENTE? Se aplicará a todas las sucursales existentes y futuras de esta organización.",
      );
      if (!confirmGlobal) return;
    }

    if (
      posSettings.min_deposit_percent < 0 ||
      posSettings.min_deposit_percent > 100
    ) {
      toast.error("El porcentaje de depósito debe estar entre 0 y 100");
      return;
    }

    if (posSettings.min_deposit_amount && posSettings.min_deposit_amount < 0) {
      toast.error("El monto mínimo de depósito debe ser positivo");
      return;
    }

    setSaving(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch("/api/admin/pos/settings", {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          min_deposit_percent: posSettings.min_deposit_percent,
          min_deposit_amount: posSettings.min_deposit_amount,
        }),
      });

      if (response.ok) {
        toast.success("Configuración POS guardada exitosamente");
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al guardar configuración POS");
      }
    } catch (error: unknown) {
      console.error("Error saving POS settings:", error);
      toast.error("Error al guardar configuración POS");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBilling = async () => {
    if (isGlobalView && !isSuperAdmin) {
      toast.error("Debe seleccionar una sucursal para configurar las boletas");
      return;
    }

    if (isGlobalView) {
      const confirmGlobal = window.confirm(
        "¿Está seguro de que desea guardar esta configuración de boletas GLOBALMENTE? Se aplicará a todas las sucursales existentes y futuras.",
      );
      if (!confirmGlobal) return;
    }

    if (!billingSettings.business_name || !billingSettings.business_rut) {
      toast.error("Nombre y RUT de la empresa son requeridos");
      return;
    }

    setSaving(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch("/api/admin/billing/settings", {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify(billingSettings),
      });

      if (response.ok) {
        toast.success("Configuración de boletas guardada exitosamente");
        await fetchAllSettings();
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al guardar configuración de boletas");
      }
    } catch (error: unknown) {
      console.error("Error saving billing settings:", error);
      toast.error("Error al guardar configuración de boletas");
    } finally {
      setSaving(false);
    }
  };

  const handleReuseMainLogo = async () => {
    try {
      const response = await fetch("/api/admin/organizations/current");
      if (response.ok) {
        const data = await response.json();
        if (data.organization?.logo_url) {
          setBillingSettings((prev) => ({
            ...prev,
            logo_url: data.organization.logo_url,
          }));
          toast.success("Logo de la óptica copiado correctamente");
        } else {
          toast.error("No se ha configurado un logo para la óptica aún");
        }
      }
    } catch (error) {
      console.error("Error fetching main logo:", error);
      toast.error("Error al obtener el logo de la óptica");
    }
  };

  const handlePrinterTypeChange = (type: string) => {
    const printerConfigs: Record<string, { width: number; height: number }> = {
      thermal: { width: 80, height: 297 }, // 80mm thermal
      a4: { width: 210, height: 297 }, // A4
      letter: { width: 216, height: 279 }, // Letter (US)
    };

    const config = printerConfigs[type] || { width: 80, height: 297 };
    setBillingSettings({
      ...billingSettings,
      printer_type: type as unknown,
      printer_width_mm: config.width,
      printer_height_mm: config.height,
    });
  };

  if (branchLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-epoch-primary mx-auto mb-4" />
          <p className="text-admin-text-tertiary">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - reorganizado en filas para móvil */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-epoch-primary font-display">
            Configuración POS y Boletas {isGlobalView && "(VISTA GLOBAL)"}
          </h1>
          <p className="text-xs sm:text-sm text-epoch-primary/80 mt-1">
            {isGlobalView
              ? "Configuración global para todas las sucursales"
              : "Configura el punto de venta y personaliza tus boletas y facturas"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {isSuperAdmin && <BranchSelector />}
          <Button
            className="rounded-xl min-h-[44px] w-full sm:w-auto"
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
            Volver
          </Button>
        </div>
      </div>

      {/* Tabs - scroll horizontal en móvil */}
      <Tabs
        className="space-y-4 sm:space-y-6"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as unknown)}
      >
        <TabsList className="flex w-full justify-start gap-1 overflow-x-auto overflow-y-hidden min-w-0 p-1 rounded-xl border border-border [scrollbar-width:thin] flex-shrink-0">
          <TabsTrigger
            className="flex-shrink-0 min-h-[44px] text-xs sm:text-sm px-3 py-2"
            value="pos"
          >
            <Settings className="h-4 w-4 mr-2 shrink-0" />
            Configuración POS
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 min-h-[44px] text-xs sm:text-sm px-3 py-2"
            value="billing"
          >
            <FileText className="h-4 w-4 mr-2 shrink-0" />
            Configuración de Boletas
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 min-h-[44px] text-xs sm:text-sm px-3 py-2"
            value="preview"
          >
            <Eye className="h-4 w-4 mr-2 shrink-0" />
            Previsualización
          </TabsTrigger>
        </TabsList>

        <POSTab
          posSettings={posSettings}
          setPosSettings={setPosSettings}
          handleSavePOS={handleSavePOS}
          saving={saving}
        />
        <BillingTab
          billingSettings={billingSettings}
          setBillingSettings={setBillingSettings}
          handleSaveBilling={handleSaveBilling}
          handlePrinterTypeChange={handlePrinterTypeChange}
          handleReuseMainLogo={handleReuseMainLogo}
          saving={saving}
        />
        <PreviewTab
          billingSettings={billingSettings}
          setBillingSettings={setBillingSettings}
          handlePrinterTypeChange={handlePrinterTypeChange}
        />
      </Tabs>
    </div>
  );
}
