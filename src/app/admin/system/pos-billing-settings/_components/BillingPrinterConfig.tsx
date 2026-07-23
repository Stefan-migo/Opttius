"use client";

import { Printer, Thermometer } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PrinterSettings {
  printer_type?: "thermal" | "a4" | "letter" | "custom";
  printer_width_mm?: number;
  printer_height_mm?: number;
}

interface Props {
  settings: PrinterSettings;
  onPrinterTypeChange: (type: string) => void;
  onChange: (s: unknown) => void;
}

export function BillingPrinterConfig({ settings, onPrinterTypeChange, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5" />Configuración de Impresora</CardTitle>
        <CardDescription>Configura el formato de impresión para boletas y facturas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Tipo de Impresora</Label>
            <Select value={settings.printer_type || "thermal"} onValueChange={onPrinterTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="thermal"><div className="flex items-center gap-2"><Thermometer className="h-4 w-4" />Impresora Térmica (80mm)</div></SelectItem>
                <SelectItem value="a4">Papel A4 (210x297mm)</SelectItem>
                <SelectItem value="letter">Papel Letter (216x279mm)</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {settings.printer_type === "custom" && (
            <>
              <div>
                <Label>Ancho (mm)</Label>
                <Input max={500} min={50} type="number" value={settings.printer_width_mm || 80}
                  onChange={(e) => onChange({ ...settings, printer_width_mm: parseFloat(e.target.value) || 80 })} />
              </div>
              <div>
                <Label>Alto (mm)</Label>
                <Input max={1000} min={50} type="number" value={settings.printer_height_mm || 297}
                  onChange={(e) => onChange({ ...settings, printer_height_mm: parseFloat(e.target.value) || 297 })} />
              </div>
            </>
          )}
        </div>
        {settings.printer_type !== "custom" && (
          <div className="text-sm text-admin-text-tertiary">Tamaño: {settings.printer_width_mm}mm x {settings.printer_height_mm}mm</div>
        )}
      </CardContent>
    </Card>
  );
}
