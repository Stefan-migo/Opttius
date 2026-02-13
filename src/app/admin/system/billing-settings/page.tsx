"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Upload,
  Save,
  Building2,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Copy,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import ImageUpload from "@/components/ui/ImageUpload";
import Image from "next/image";

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
}

export default function BillingSettingsPage() {
  const { currentBranchId, isSuperAdmin } = useBranch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BillingSettings>({
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
  });

  useEffect(() => {
    if (currentBranchId || isSuperAdmin) {
      fetchSettings();
    }
  }, [currentBranchId, isSuperAdmin]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const headers = {
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch("/api/admin/billing/settings", {
        headers,
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      } else if (response.status !== 404) {
        const error = await response.json();
        toast.error(error.error || "Error al cargar configuración");
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.business_name || !settings.business_rut) {
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
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Configuración guardada exitosamente");
        await fetchSettings();
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al guardar configuración");
      }
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Error al guardar configuración");
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
          setSettings((prev) => ({
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-profundo mx-auto mb-4"></div>
          <p className="text-tierra-media">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo">
            Configuración de Boletas
          </h1>
          <p className="text-tierra-media mt-1">
            Personaliza tus boletas y facturas
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </>
          )}
        </Button>
      </div>

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
                value={settings.business_name}
                onChange={(e) =>
                  setSettings({ ...settings, business_name: e.target.value })
                }
                placeholder="Ej: Óptica Central"
              />
            </div>
            <div>
              <Label>RUT de la Empresa *</Label>
              <Input
                value={settings.business_rut}
                onChange={(e) =>
                  setSettings({ ...settings, business_rut: e.target.value })
                }
                placeholder="Ej: 76.123.456-7"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={settings.business_address || ""}
                onChange={(e) =>
                  setSettings({ ...settings, business_address: e.target.value })
                }
                placeholder="Dirección completa"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={settings.business_phone || ""}
                onChange={(e) =>
                  setSettings({ ...settings, business_phone: e.target.value })
                }
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={settings.business_email || ""}
                onChange={(e) =>
                  setSettings({ ...settings, business_email: e.target.value })
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
              <Label className="text-sm font-bold text-azul-profundo mb-2 block">
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
                  value={settings.logo_url || ""}
                  onChange={(url) =>
                    setSettings({ ...settings, logo_url: url })
                  }
                  folder="billing"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleReuseMainLogo}
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Reutilizar Logo de la Óptica (Header)
                </Button>
              </div>
            </div>
            <div>
              <Label>Tipo de Documento por Defecto</Label>
              <select
                value={settings.default_document_type}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_document_type: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
              </select>
            </div>
            <div>
              <Label>Texto de Encabezado (opcional)</Label>
              <Textarea
                value={settings.header_text || ""}
                onChange={(e) =>
                  setSettings({ ...settings, header_text: e.target.value })
                }
                placeholder="Texto que aparecerá en el encabezado de las boletas"
                rows={3}
              />
            </div>
            <div>
              <Label>Texto de Pie de Página (opcional)</Label>
              <Textarea
                value={settings.footer_text || ""}
                onChange={(e) =>
                  setSettings({ ...settings, footer_text: e.target.value })
                }
                placeholder="Texto que aparecerá en el pie de página"
                rows={3}
              />
            </div>
            <div>
              <Label>Términos y Condiciones (opcional)</Label>
              <Textarea
                value={settings.terms_and_conditions || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
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
    </div>
  );
}
