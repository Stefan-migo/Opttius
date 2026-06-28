"use client";

import { Eye } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";

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

interface PreviewTabProps {
  billingSettings: BillingSettings;
  setBillingSettings: React.Dispatch<React.SetStateAction<BillingSettings>>;
  handlePrinterTypeChange: (type: string) => void;
}

export default function PreviewTab({
  billingSettings,
  setBillingSettings,
  handlePrinterTypeChange,
}: PreviewTabProps) {
  return (
    <TabsContent className="space-y-4 sm:space-y-6" value="preview">
      <Card className="rounded-xl border border-border overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 font-display text-epoch-primary text-base sm:text-lg">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Previsualización de Boleta
            </span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-epoch-primary/80 mt-1">
            Vista previa de cómo se verá la boleta o factura impresa
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Label className="text-xs sm:text-sm">
                Tipo de Documento:
              </Label>
              <Select
                value={billingSettings.default_document_type}
                onValueChange={(v: unknown) =>
                  setBillingSettings({
                    ...billingSettings,
                    default_document_type: v,
                  })
                }
              >
                <SelectTrigger className="w-full sm:w-48 rounded-xl min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleta">Boleta</SelectItem>
                  <SelectItem value="factura">Factura</SelectItem>
                </SelectContent>
              </Select>
              <Label className="text-xs sm:text-sm">Formato:</Label>
              <Select
                value={billingSettings.printer_type || "thermal"}
                onValueChange={(v: unknown) => handlePrinterTypeChange(v)}
              >
                <SelectTrigger className="w-full sm:w-48 rounded-xl min-h-[44px]">
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

            {/* Preview Container - scroll horizontal en móvil si el ancho excede */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div
                className="border-2 border-border bg-white mx-auto shadow-lg shrink-0"
                style={{
                  width: `${(billingSettings.printer_width_mm || 80) * 3.779527559}px`,
                  minHeight: `${(billingSettings.printer_height_mm || 297) * 3.779527559}px`,
                  maxWidth: "min(100%, 100vw - 2rem)",
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
                        alt="Logo"
                        className="h-16 mx-auto mb-2 object-contain"
                        src={billingSettings.logo_url}
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
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
