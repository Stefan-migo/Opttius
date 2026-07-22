"use client";

import { ArrowLeft, Eye, FileText, Loader2, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BranchSelector } from "@/components/admin/BranchSelector";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";

import BillingTab from "./BillingTab";
import POSTab from "./POSTab";
import PreviewTab from "./PreviewTab";
import { usePOSBillingSettings } from "./usePOSBillingSettings";

export default function POSBillingSettingsContent() {
  const router = useRouter();
  const {
    currentBranchId,
    isSuperAdmin,
    isLoading: branchLoading,
  } = useBranch();
  const [activeTab, setActiveTab] = useState<"pos" | "billing" | "preview">(
    "pos",
  );

  const {
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
  } = usePOSBillingSettings(currentBranchId);

  const isGlobalView = !currentBranchId && isSuperAdmin;

  useEffect(() => {
    if (!branchLoading) {
      fetchAllSettings();
    }
  }, [currentBranchId, branchLoading]);

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

      <Tabs
        className="space-y-4 sm:space-y-6"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "pos" | "billing" | "preview")}
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
          handleSavePOS={() => handleSavePOS(isGlobalView, isSuperAdmin)}
          posSettings={posSettings}
          saving={saving}
          setPosSettings={setPosSettings}
        />
        <BillingTab
          billingSettings={billingSettings}
          handlePrinterTypeChange={handlePrinterTypeChange}
          handleReuseMainLogo={handleReuseMainLogo}
          handleSaveBilling={() =>
            handleSaveBilling(isGlobalView, isSuperAdmin)
          }
          saving={saving}
          setBillingSettings={setBillingSettings}
        />
        <PreviewTab
          billingSettings={billingSettings}
          handlePrinterTypeChange={handlePrinterTypeChange}
          setBillingSettings={setBillingSettings}
        />
      </Tabs>
    </div>
  );
}
