"use client";

import { Copy, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentTestSectionProps {
  webhookUrl: string;
  handleCopyWebhookUrl: () => void;
}

export default function PaymentTestSection({
  webhookUrl,
  handleCopyWebhookUrl,
}: PaymentTestSectionProps) {
  return (
    <Card
      className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
      style={{ backgroundColor: "var(--admin-border-primary)" }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Configuración de Webhook
        </CardTitle>
        <CardDescription>
          URL del webhook que debes configurar en el dashboard de MercadoPago
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>URL del Webhook</Label>
          <div className="flex gap-2">
            <Input readOnly className="font-mono text-sm" value={webhookUrl} />
            <Button type="button" variant="outline" onClick={handleCopyWebhookUrl}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copia esta URL y configúrala en tu dashboard de MercadoPago en la sección de Webhooks.
            <br />
            <strong>Nota:</strong> Esta URL se actualiza automáticamente según el dominio de tu aplicación. Si cambias de dominio, simplemente copia la nueva URL y actualízala en MercadoPago.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
