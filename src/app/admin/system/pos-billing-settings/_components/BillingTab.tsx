"use client";

import {
  Building2,
  Copy,
  FileText,
  Loader2,
  Printer,
  Save,
  Sparkles,
  Thermometer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ImageUpload from "@/components/ui/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatRUT, formatRUTAsYouType } from "@/lib/utils/rut";

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

interface BillingTabProps {
  billingSettings: BillingSettings;
  setBillingSettings: React.Dispatch<React.SetStateAction<BillingSettings>>;
  handleSaveBilling: () => Promise<void>;
  handlePrinterTypeChange: (type: string) => void;
  handleReuseMainLogo: () => Promise<void>;
  saving: boolean;
}

export default function BillingTab({
  billingSettings,
  setBillingSettings,
  handleSaveBilling,
  handlePrinterTypeChange,
  handleReuseMainLogo,
  saving,
}: BillingTabProps) {
  return (
    <TabsContent className="space-y-6" value="billing">
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
                placeholder="Ej: Óptica Central"
                value={billingSettings.business_name}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    business_name: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>RUT de la Empresa *</Label>
              <Input
                className="font-mono"
                placeholder="Ej: 76.123.456-7 o 761234567"
                value={billingSettings.business_rut}
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
                onChange={(e) => {
                  const val = e.target.value;
                  const formatted = formatRUTAsYouType(val);
                  setBillingSettings({
                    ...billingSettings,
                    business_rut: formatted,
                  });
                }}
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                placeholder="Dirección completa"
                value={billingSettings.business_address || ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    business_address: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                placeholder="+56 9 1234 5678"
                value={billingSettings.business_phone || ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    business_phone: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                placeholder="contacto@empresa.cl"
                type="email"
                value={billingSettings.business_email || ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    business_email: e.target.value,
                  })
                }
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
                  folder="billing"
                  value={billingSettings.logo_url || ""}
                  onChange={(url) =>
                    setBillingSettings({
                      ...billingSettings,
                      logo_url: url,
                    })
                  }
                />

                <Button
                  className="w-full text-xs shadow-sm"
                  size="sm"
                  type="button"
                  variant="outline"
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
                onValueChange={(v: unknown) =>
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
                placeholder="Texto que aparecerá en el encabezado de las boletas"
                rows={3}
                value={billingSettings.header_text || ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    header_text: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Texto de Pie de Página (opcional)</Label>
              <Textarea
                placeholder="Texto que aparecerá en el pie de página"
                rows={3}
                value={billingSettings.footer_text || ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    footer_text: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Términos y Condiciones (opcional)</Label>
              <Textarea
                placeholder="Términos y condiciones que aparecerán en las boletas"
                rows={4}
                value={billingSettings.terms_and_conditions || ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    terms_and_conditions: e.target.value,
                  })
                }
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
                    max="500"
                    min="50"
                    type="number"
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
                    max="1000"
                    min="50"
                    type="number"
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
        <Button disabled={saving} onClick={handleSaveBilling}>
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
  );
}
