"use client";

import { useState } from "react";
import { toast } from "sonner";

import { appLogger } from '@/lib/logger';
import { getBranchHeader } from "@/lib/utils/branch";

import type { BillingSettings, POSSettings } from "./types";

const DEFAULT_POS: POSSettings = {
  min_deposit_percent: 50,
  min_deposit_amount: null,
};

const DEFAULT_BILLING: BillingSettings = {
  branch_id: "",
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
};

export function usePOSBillingSettings(currentBranchId: string | null) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posSettings, setPosSettings] = useState<POSSettings>(DEFAULT_POS);
  const [billingSettings, setBillingSettings] =
    useState<BillingSettings>(DEFAULT_BILLING);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const headers = { ...getBranchHeader(currentBranchId) };
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
      appLogger.error("Error fetching settings:", error);
      toast.error("Error al cargar configuraciones");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePOS = async (
    isGlobalView: boolean,
    isSuperAdmin: boolean,
  ) => {
    if (isGlobalView && !isSuperAdmin) {
      toast.error("Debe seleccionar una sucursal para configurar el POS");
      return;
    }
    if (isGlobalView) {
      const confirmGlobal = window.confirm(
        "¿Está seguro de que desea guardar esta configuración GLOBALMENTE?",
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
      appLogger.error("Error saving POS settings:", error);
      toast.error("Error al guardar configuración POS");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBilling = async (
    isGlobalView: boolean,
    isSuperAdmin: boolean,
  ) => {
    if (isGlobalView && !isSuperAdmin) {
      toast.error("Debe seleccionar una sucursal para configurar las boletas");
      return;
    }
    if (isGlobalView) {
      const confirmGlobal = window.confirm(
        "¿Está seguro de que desea guardar esta configuración GLOBALMENTE?",
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
      appLogger.error("Error saving billing settings:", error);
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
      appLogger.error("Error fetching main logo:", error);
      toast.error("Error al obtener el logo de la óptica");
    }
  };

  const handlePrinterTypeChange = (type: string) => {
    const printerConfigs: Record<string, { width: number; height: number }> = {
      thermal: { width: 80, height: 297 },
      a4: { width: 210, height: 297 },
      letter: { width: 216, height: 279 },
    };
    const config = printerConfigs[type] || { width: 80, height: 297 };
    setBillingSettings((prev) => ({
      ...prev,
      printer_type: type as "thermal" | "a4" | "letter" | "custom",
      printer_width_mm: config.width,
      printer_height_mm: config.height,
    }));
  };

  return {
    posSettings,
    setPosSettings,
    billingSettings,
    setBillingSettings,
    loading,
    saving,
    fetchAllSettings,
    handleSavePOS,
    handleSaveBilling,
    handleReuseMainLogo,
    handlePrinterTypeChange,
  };
}
