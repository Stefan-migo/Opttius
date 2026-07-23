"use client";

import { AlertCircle, CheckCircle, Loader2, MessageCircle, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Organization { id: string; name: string; slug: string; }
interface WhatsAppNumber { id: string; organization_id: string; phone_number_id: string; waba_id: string; display_phone_number: string | null; organization?: { name: string; slug: string } | null; }

interface WhatsAppConnectionFormProps {
  organizations: Organization[];
  selectedOrgId: string;
  onSelectedOrgChange: (id: string) => void;
  form: { waba_id: string; phone_number_id: string; display_phone_number: string; };
  onFormChange: (data: Partial<WhatsAppConnectionFormProps["form"]>) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  loading: boolean;
  numbers: WhatsAppNumber[];
}

export function WhatsAppConnectionForm({
  organizations,
  selectedOrgId,
  onSelectedOrgChange,
  form,
  onFormChange,
  onSubmit,
  saving,
  loading,
  numbers,
}: WhatsAppConnectionFormProps) {
  return (
    <Card className="admin-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Configuración de números
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Asocia un número de WhatsApp a cada organización. El número principal de Opttius debe ir en
          la organización &quot;Opttius Platform&quot;.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org">Organización</Label>
              <Select value={selectedOrgId} onValueChange={onSelectedOrgChange}>
                <SelectTrigger id="org"><SelectValue placeholder="Selecciona organización" /></SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name} ({org.slug})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waba_id">WABA ID (Business Account ID)</Label>
              <Input id="waba_id" placeholder="Ej: 123456789012345" value={form.waba_id}
                onChange={(e) => onFormChange({ waba_id: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number_id">Phone Number ID</Label>
              <Input id="phone_number_id" placeholder="Ej: 987654321098765" value={form.phone_number_id}
                onChange={(e) => onFormChange({ phone_number_id: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_phone_number">Número mostrado (opcional)</Label>
              <Input id="display_phone_number" placeholder="+56912345678" value={form.display_phone_number}
                onChange={(e) => onFormChange({ display_phone_number: e.target.value })} />
            </div>
          </div>
          <Button disabled={saving} type="submit">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Conectar WhatsApp</>}
          </Button>
        </form>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
        ) : numbers.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium">Números configurados</h4>
            <div className="rounded-lg border divide-y">
              {numbers.map((n) => (
                <div className="flex items-center justify-between p-4" key={n.id}>
                  <div>
                    <p className="font-medium">{n.display_phone_number || `ID: ${n.phone_number_id}`}</p>
                    <p className="text-sm text-muted-foreground">{n.organization?.name ?? "—"} | WABA: {n.waba_id}</p>
                  </div>
                  <Badge className="gap-1" variant="default"><CheckCircle className="h-3 w-3" /> Conectado</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground"><AlertCircle className="h-4 w-4" /> No hay números configurados</div>
        )}
      </CardContent>
    </Card>
  );
}
