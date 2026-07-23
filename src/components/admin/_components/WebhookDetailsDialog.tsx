"use client";

import { AlertCircle, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface WebhookLog {
  id: string; webhook_type: string; event_type: string; status: string;
  response_code: number; error_message?: string; payload?: unknown; created_at: string; processed_at?: string;
}

function getStatusBadge(status: string) {
  if (status === "success") return <Badge className="bg-green-600">Exitoso</Badge>;
  if (status === "failed") return <Badge variant="destructive">Fallido</Badge>;
  if (status === "pending") return <Badge variant="outline">Pendiente</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

interface WebhookDetailsDialogProps {
  open: boolean;
  log: WebhookLog | null;
  onOpenChange: (v: boolean) => void;
}

export function WebhookDetailsDialog({ open, log, onOpenChange }: WebhookDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Detalles del Webhook</DialogTitle>
          <DialogDescription>Información completa del webhook recibido</DialogDescription>
        </DialogHeader>
        {log && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-sm font-semibold">Tipo de Webhook</Label><p className="text-sm mt-1"><Badge variant="outline">{log.webhook_type}</Badge></p></div>
              <div><Label className="text-sm font-semibold">Tipo de Evento</Label><p className="text-sm mt-1 font-mono">{log.event_type || "N/A"}</p></div>
              <div><Label className="text-sm font-semibold">Estado</Label><p className="text-sm mt-1">{getStatusBadge(log.status)}</p></div>
              <div><Label className="text-sm font-semibold">Código de Respuesta</Label><p className={`text-sm mt-1 ${log.response_code && log.response_code >= 400 ? "text-red-600 font-semibold" : ""}`}>{log.response_code || "N/A"}</p></div>
              <div><Label className="text-sm font-semibold">Fecha de Recepción</Label><p className="text-sm mt-1">{new Date(log.created_at).toLocaleString("es-AR")}</p></div>
              {log.processed_at && <div><Label className="text-sm font-semibold">Fecha de Procesamiento</Label><p className="text-sm mt-1">{new Date(log.processed_at).toLocaleString("es-AR")}</p></div>}
            </div>
            {log.error_message && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /><div><Label className="text-sm font-semibold text-red-800 dark:text-red-300">Mensaje de Error</Label><p className="text-sm text-red-700 dark:text-red-400 mt-1">{log.error_message}</p></div></div>
              </div>
            )}
            {log.payload && (
              <div><Label className="text-sm font-semibold">Payload (Datos Recibidos)</Label>
                <div className="mt-2 p-4 bg-admin-bg-tertiary rounded-lg border overflow-x-auto"><pre className="text-xs font-mono whitespace-pre-wrap break-words">{JSON.stringify(log.payload, null, 2)}</pre></div>
              </div>
            )}
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
