"use client";

import { Copy, FileText, Loader2, Save, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImageUpload from "@/components/ui/ImageUpload";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { BillingBusinessInfoCard } from "./BillingBusinessInfoCard";
import { BillingPrinterConfig } from "./BillingPrinterConfig";

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
        <BillingBusinessInfoCard settings={billingSettings} onChange={setBillingSettings} />

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

      <BillingPrinterConfig
        settings={billingSettings}
        onChange={setBillingSettings}
        onPrinterTypeChange={handlePrinterTypeChange}
      />

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
