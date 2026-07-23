"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { WebhookDetailsDialog } from "./_components/WebhookDetailsDialog";
import { WebhookLogsTable } from "./_components/WebhookLogsTable";
import { WebhookStatusCards } from "./_components/WebhookStatusCards";
import { useWebhookMonitor } from "./_hooks/useWebhookMonitor";

export default function WebhookMonitor() {
  const {
    logs, status, loading, typeFilter, setTypeFilter, statusFilter, setStatusFilter,
    selectedLog, showDetailsDialog, setShowDetailsDialog,
    fetchData, handleCopyUrl, handleTestWebhook, handleViewDetails,
  } = useWebhookMonitor();

  const mpStats = status?.status?.mercadopago || { total: 0, success: 0, failed: 0, last_delivery: null };
  const sanityStats = status?.status?.sanity || { total: 0, success: 0, failed: 0, last_delivery: null };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-azul-profundo">Monitoreo de Webhooks</h2>
          <p className="text-tierra-media">Monitorea el estado y las entregas de webhooks</p>
        </div>
        <Button disabled={loading} variant="outline" onClick={fetchData}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Actualizar
        </Button>
      </div>

      {status?.urls && (
        <WebhookStatusCards
          urls={status.urls} mercadopagoStats={mpStats} sanityStats={sanityStats}
          onCopyUrl={handleCopyUrl} onTestWebhook={handleTestWebhook}
        />
      )}

      <Card className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ backgroundColor: "var(--admin-border-primary)" }}>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div>
              <Label>Tipo:</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem><SelectItem value="mercadopago">MercadoPago</SelectItem><SelectItem value="sanity">Sanity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem><SelectItem value="success">Exitosos</SelectItem>
                  <SelectItem value="failed">Fallidos</SelectItem><SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <WebhookLogsTable logs={logs} loading={loading} onViewDetails={handleViewDetails} />
      <WebhookDetailsDialog open={showDetailsDialog} log={selectedLog} onOpenChange={setShowDetailsDialog} />
    </div>
  );
}
