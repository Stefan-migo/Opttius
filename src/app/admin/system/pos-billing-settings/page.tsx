"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Upload,
  Save,
  Building2,
  FileText,
  ArrowLeft,
  Printer,
  Eye,
  Thermometer,
} from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { formatRUT, formatRUTAsYouType } from "@/lib/utils/rut";
import { BranchSelector } from "@/components/admin/BranchSelector";
import { Loader2, Copy, Sparkles } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import Image from "next/image";

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
  // Printer settings
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
      printer_type: type as any,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-epoch-primary">
            Configuración POS y Boletas {isGlobalView && "(VISTA GLOBAL)"}
          </h1>
          <p className="text-admin-text-tertiary mt-1">
            {isGlobalView
              ? "Configuración global para todas las sucursales"
              : "Configura el punto de venta y personaliza tus boletas y facturas"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && <BranchSelector />}
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pos">
            <Settings className="h-4 w-4 mr-2" />
            Configuración POS
          </TabsTrigger>
          <TabsTrigger value="billing">
            <FileText className="h-4 w-4 mr-2" />
            Configuración de Boletas
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Previsualización
          </TabsTrigger>
        </TabsList>

        {/* POS Settings Tab */}
        <TabsContent value="pos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración de Depósito Mínimo
              </CardTitle>
              <CardDescription>
                Configura el depósito mínimo requerido para procesar trabajos.
                El sistema usará el mayor valor entre el porcentaje y el monto
                fijo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="min_deposit_percent">
                  Porcentaje Mínimo de Depósito (%)
                </Label>
                <Input
                  id="min_deposit_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={posSettings.min_deposit_percent}
                  onChange={(e) =>
                    setPosSettings({
                      ...posSettings,
                      min_deposit_percent: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="50.00"
                />
                <p className="text-sm text-admin-text-tertiary">
                  Porcentaje del total de la orden que se requiere como depósito
                  mínimo.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_deposit_amount">
                  Monto Mínimo Fijo de Depósito (Opcional)
                </Label>
                <Input
                  id="min_deposit_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={posSettings.min_deposit_amount || ""}
                  onChange={(e) =>
                    setPosSettings({
                      ...posSettings,
                      min_deposit_amount: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  placeholder="Dejar vacío para usar solo porcentaje"
                />
                <p className="text-sm text-admin-text-tertiary">
                  Monto fijo mínimo de depósito. Si se establece, el sistema
                  usará el mayor valor entre el porcentaje calculado y este
                  monto fijo.
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleSavePOS} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Configuración POS
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings Tab */}
        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información de la Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre de la Empresa *</Label>
                  <Input
                    value={billingSettings.business_name}
                    onChange={(e) =>
                      setBillingSettings({
                        ...billingSettings,
                        business_name: e.target.value,
                      })
                    }
                    placeholder="Ej: Óptica Central"
                  />
                </div>
                <div>
                  <Label>RUT de la Empresa *</Label>
                  <Input
                    value={billingSettings.business_rut}
                    onChange={(e) => {
                      const val = e.target.value;
                      const formatted = formatRUTAsYouType(val);
                      setBillingSettings({
                        ...billingSettings,
                        business_rut: formatted,
                      });
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val) {
                        const formatted = formatRUT(val);
                        if (formatted) {
                          setBillingSettings({
                            ...billingSettings,
                            business_rut: formatted,
                          });
                        }
                      }
                    }}
                    placeholder="Ej: 76.123.456-7 o 761234567"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Input
                    value={billingSettings.business_address || ""}
                    onChange={(e) =>
                      setBillingSettings({
                        ...billingSettings,
                        business_address: e.target.value,
                      })
                    }
                    placeholder="Dirección completa"
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={billingSettings.business_phone || ""}
                    onChange={(e) =>
                      setBillingSettings({
                        ...billingSettings,
                        business_phone: e.target.value,
                      })
                    }
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={billingSettings.business_email || ""}
                    onChange={(e) =>
                      setBillingSettings({
                        ...billingSettings,
                        business_email: e.target.value,
                      })
                    }
                    placeholder="contacto@empresa.cl"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Document Customization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Personalización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-bold text-epoch-primary mb-2 block">
                    Logo de la Empresa (Boleta/Factura)
                  </Label>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-800 font-medium flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      Dimensiones Requeridas:
                    </p>
                    <ul className="text-[11px] text-blue-700/80 list-disc list-inside mt-1 space-y-0.5">
                      <li>
                        Formato horizontal:{" "}
                        <strong>400px ancho × 120px alto</strong>
                      </li>
                      <li>
                        Fondo sugerido: <strong>Transparente (PNG)</strong> o{" "}
                        <strong>Blanco</strong>
                      </li>
                      <li>
                        Este logo aparecerá en el encabezado de sus documentos
                        fiscales.
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <ImageUpload
                      value={billingSettings.logo_url || ""}
                      onChange={(url) =>
                        setBillingSettings({
                          ...billingSettings,
                          logo_url: url,
                        })
                      }
                      folder="billing"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs shadow-sm"
                      onClick={handleReuseMainLogo}
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Reutilizar Logo de la Óptica (Header)
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Tipo de Documento por Defecto</Label>
                  <Select
                    value={billingSettings.default_document_type}
                    onValueChange={(v: any) =>
                      setBillingSettings({
                        ...billingSettings,
                        default_document_type: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boleta">Boleta</SelectItem>
                      <SelectItem value="factura">Factura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                  <div className="space-y-0.5">
                    <Label className="text-base">Impresión Automática</Label>
                    <p className="text-xs text-muted-foreground">
                      Imprimir el comprobante automáticamente al finalizar cada
                      venta en el POS.
                    </p>
                  </div>
                  <Switch
                    checked={billingSettings.auto_print_receipt !== false}
                    onCheckedChange={(checked) =>
                      setBillingSettings({
                        ...billingSettings,
                        auto_print_receipt: checked,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Texto de Encabezado (opcional)</Label>
                  <Textarea
                    value={billingSettings.header_text || ""}
                    onChange={(e) =>
                      setBillingSettings({
                        ...billingSettings,
                        header_text: e.target.value,
                      })
                    }
                    placeholder="Texto que aparecerá en el encabezado de las boletas"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Texto de Pie de Página (opcional)</Label>
                  <Textarea
                    value={billingSettings.footer_text || ""}
                    onChange={(e) =>
                      setBillingSettings({
                        ...billingSettings,
                        footer_text: e.target.value,
                      })
                    }
                    placeholder="Texto que aparecerá en el pie de página"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Términos y Condiciones (opcional)</Label>
                  <Textarea
                    value={billingSettings.terms_and_conditions || ""}
                    onChange={(e) =>
                      setBillingSettings({
                        ...billingSettings,
                        terms_and_conditions: e.target.value,
                      })
                    }
                    placeholder="Términos y condiciones que aparecerán en las boletas"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Printer Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Configuración de Impresora
              </CardTitle>
              <CardDescription>
                Configura el formato de impresión para boletas y facturas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Impresora</Label>
                  <Select
                    value={billingSettings.printer_type || "thermal"}
                    onValueChange={handlePrinterTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4" />
                          Impresora Térmica (80mm)
                        </div>
                      </SelectItem>
                      <SelectItem value="a4">Papel A4 (210x297mm)</SelectItem>
                      <SelectItem value="letter">
                        Papel Letter (216x279mm)
                      </SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {billingSettings.printer_type === "custom" && (
                  <>
                    <div>
                      <Label>Ancho (mm)</Label>
                      <Input
                        type="number"
                        min="50"
                        max="500"
                        value={billingSettings.printer_width_mm || 80}
                        onChange={(e) =>
                          setBillingSettings({
                            ...billingSettings,
                            printer_width_mm: parseFloat(e.target.value) || 80,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Alto (mm)</Label>
                      <Input
                        type="number"
                        min="50"
                        max="1000"
                        value={billingSettings.printer_height_mm || 297}
                        onChange={(e) =>
                          setBillingSettings({
                            ...billingSettings,
                            printer_height_mm:
                              parseFloat(e.target.value) || 297,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              {billingSettings.printer_type !== "custom" && (
                <div className="text-sm text-admin-text-tertiary">
                  Tamaño: {billingSettings.printer_width_mm}mm x{" "}
                  {billingSettings.printer_height_mm}mm
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveBilling} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Configuración de Boletas
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Previsualización de Boleta
              </CardTitle>
              <CardDescription>
                Vista previa de cómo se verá la boleta o factura impresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label>Tipo de Documento:</Label>
                  <Select
                    value={billingSettings.default_document_type}
                    onValueChange={(v: any) =>
                      setBillingSettings({
                        ...billingSettings,
                        default_document_type: v,
                      })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boleta">Boleta</SelectItem>
                      <SelectItem value="factura">Factura</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>Formato:</Label>
                  <Select
                    value={billingSettings.printer_type || "thermal"}
                    onValueChange={(v: any) => handlePrinterTypeChange(v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal">Térmica (80mm)</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview Container */}
                <div
                  className="border-2 border-gray-300 bg-white mx-auto shadow-lg"
                  style={{
                    width: `${(billingSettings.printer_width_mm || 80) * 3.779527559}px`, // Convert mm to px (1mm = 3.779527559px at 96dpi)
                    minHeight: `${(billingSettings.printer_height_mm || 297) * 3.779527559}px`,
                    maxWidth: "100%",
                  }}
                >
                  <div
                    className="p-4"
                    style={{
                      fontSize:
                        billingSettings.printer_type === "thermal"
                          ? "10px"
                          : "12px",
                    }}
                  >
                    {/* Header */}
                    <div className="text-center mb-4">
                      {billingSettings.logo_url && (
                        <img
                          src={billingSettings.logo_url}
                          alt="Logo"
                          className="h-16 mx-auto mb-2 object-contain"
                        />
                      )}
                      <h2 className="font-bold text-lg">
                        {billingSettings.business_name ||
                          "Nombre de la Empresa"}
                      </h2>
                      <p className="text-xs">
                        RUT: {billingSettings.business_rut || "XX.XXX.XXX-X"}
                      </p>
                      {billingSettings.business_address && (
                        <p className="text-xs">
                          {billingSettings.business_address}
                        </p>
                      )}
                      {billingSettings.business_phone && (
                        <p className="text-xs">
                          Tel: {billingSettings.business_phone}
                        </p>
                      )}
                    </div>

                    {billingSettings.header_text && (
                      <div className="text-center mb-4 text-xs border-b pb-2">
                        {billingSettings.header_text}
                      </div>
                    )}

                    {/* Document Type */}
                    <div className="text-center mb-4">
                      <h3 className="font-bold text-base">
                        {billingSettings.default_document_type === "boleta"
                          ? "BOLETA"
                          : "FACTURA"}
                      </h3>
                      <p className="text-xs">Folio: BOL-000001</p>
                      <p className="text-xs">
                        Fecha: {new Date().toLocaleDateString("es-CL")}
                      </p>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-4 border-b pb-2">
                      <p className="font-semibold text-xs mb-1">Cliente:</p>
                      <p className="text-xs">Nombre: Cliente Ejemplo</p>
                      <p className="text-xs">RUT: 12.345.678-9</p>
                    </div>

                    {/* Items Table */}
                    <div className="mb-4">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1">Cant.</th>
                            <th className="text-left py-1">Descripción</th>
                            <th className="text-right py-1">Precio</th>
                            <th className="text-right py-1">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-1">1</td>
                            <td className="py-1">Producto Ejemplo</td>
                            <td className="text-right py-1">$10.000</td>
                            <td className="text-right py-1">$10.000</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-1">2</td>
                            <td className="py-1">Otro Producto</td>
                            <td className="text-right py-1">$5.000</td>
                            <td className="text-right py-1">$10.000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="mb-4 border-t pt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Subtotal:</span>
                        <span>$20.000</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>IVA (19%):</span>
                        <span>$3.800</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm border-t pt-1 mt-2">
                        <span>TOTAL:</span>
                        <span>$23.800</span>
                      </div>
                    </div>

                    {billingSettings.footer_text && (
                      <div className="text-center mt-4 text-xs border-t pt-2">
                        {billingSettings.footer_text}
                      </div>
                    )}

                    {billingSettings.terms_and_conditions && (
                      <div className="mt-4 text-xs border-t pt-2">
                        <p className="font-semibold mb-1">
                          Términos y Condiciones:
                        </p>
                        <p className="text-xs">
                          {billingSettings.terms_and_conditions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
