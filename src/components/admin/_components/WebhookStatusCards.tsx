"use client";

import { Copy, TestTube, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Stats { total: number; success: number; failed: number; last_delivery: string | null; }
interface WebhookStatusCardsProps {
  urls: { mercadopago: string; sanity: string };
  mercadopagoStats: Stats;
  sanityStats: Stats;
  onCopyUrl: (url: string, type: string) => void;
  onTestWebhook: (type: string) => void;
}

export function WebhookStatusCards({ urls, mercadopagoStats, sanityStats, onCopyUrl, onTestWebhook }: WebhookStatusCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ backgroundColor: "var(--admin-border-primary)" }}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />MercadoPago Webhook</CardTitle>
          <CardDescription className="text-xs">Recibe notificaciones de pagos de MercadoPago</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly className="font-mono text-xs" value={urls.mercadopago} />
            <Button size="sm" title="Copiar URL" variant="outline" onClick={() => onCopyUrl(urls.mercadopago, "MercadoPago")}><Copy className="h-4 w-4" /></Button>
            <Button size="sm" title="Probar webhook" variant="outline" onClick={() => onTestWebhook("mercadopago")}><TestTube className="h-4 w-4" /></Button>
          </div>
          <div className="mt-2 text-xs text-tierra-media space-y-1">
            <p>Total (24h): <span className="font-semibold">{mercadopagoStats.total}</span> | Exitosos: <span className="font-semibold text-green-600">{mercadopagoStats.success}</span> | Fallidos: <span className="font-semibold text-red-600">{mercadopagoStats.failed}</span></p>
            {mercadopagoStats.last_delivery && <p>Última entrega: {new Date(mercadopagoStats.last_delivery).toLocaleString("es-AR")}</p>}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ backgroundColor: "var(--admin-border-primary)" }}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Sanity Webhook</CardTitle>
          <CardDescription className="text-xs">Revalida el cache cuando se actualiza contenido en Sanity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly className="font-mono text-xs" value={urls.sanity} />
            <Button size="sm" title="Copiar URL" variant="outline" onClick={() => onCopyUrl(urls.sanity, "Sanity")}><Copy className="h-4 w-4" /></Button>
            <Button size="sm" title="Probar webhook" variant="outline" onClick={() => onTestWebhook("sanity")}><TestTube className="h-4 w-4" /></Button>
          </div>
          <div className="mt-2 text-xs text-tierra-media space-y-1">
            <p>Total (24h): <span className="font-semibold">{sanityStats.total}</span> | Exitosos: <span className="font-semibold text-green-600">{sanityStats.success}</span> | Fallidos: <span className="font-semibold text-red-600">{sanityStats.failed}</span></p>
            {sanityStats.last_delivery && <p>Última entrega: {new Date(sanityStats.last_delivery).toLocaleString("es-AR")}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
