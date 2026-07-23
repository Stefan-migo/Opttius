"use client";

import { Building2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRUT, formatRUTAsYouType } from "@/lib/utils/rut";

interface BillingSettings {
  business_name: string;
  business_rut: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
}

interface Props {
  settings: BillingSettings;
  onChange: (s: unknown) => void;
}

export function BillingBusinessInfoCard({ settings, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Información de la Empresa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Nombre de la Empresa *</Label>
          <Input placeholder="Ej: Óptica Central" value={settings.business_name}
            onChange={(e) => onChange({ ...settings, business_name: e.target.value })} />
        </div>
        <div>
          <Label>RUT de la Empresa *</Label>
          <Input className="font-mono" placeholder="Ej: 76.123.456-7 o 761234567" value={settings.business_rut}
            onBlur={(e) => { const f = formatRUT(e.target.value.trim()); if (f) onChange({ ...settings, business_rut: f }); }}
            onChange={(e) => onChange({ ...settings, business_rut: formatRUTAsYouType(e.target.value) })} />
        </div>
        <div>
          <Label>Dirección</Label>
          <Input placeholder="Dirección completa" value={settings.business_address || ""}
            onChange={(e) => onChange({ ...settings, business_address: e.target.value })} />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input placeholder="+56 9 1234 5678" value={settings.business_phone || ""}
            onChange={(e) => onChange({ ...settings, business_phone: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input placeholder="contacto@empresa.cl" type="email" value={settings.business_email || ""}
            onChange={(e) => onChange({ ...settings, business_email: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  );
}
