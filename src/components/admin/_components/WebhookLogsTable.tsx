"use client";

import { AlertCircle, Eye, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WebhookLog {
  id: string; webhook_type: string; event_type: string; status: string;
  response_code: number; error_message?: string; created_at: string;
}

function getStatusBadge(status: string) {
  if (status === "success") return <Badge className="bg-green-600">Exitoso</Badge>;
  if (status === "failed") return <Badge variant="destructive">Fallido</Badge>;
  if (status === "pending") return <Badge variant="outline">Pendiente</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

interface WebhookLogsTableProps {
  logs: WebhookLog[];
  loading: boolean;
  onViewDetails: (log: WebhookLog) => void;
}

export function WebhookLogsTable({ logs, loading, onViewDetails }: WebhookLogsTableProps) {
  return (
    <Card className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ backgroundColor: "var(--admin-border-primary)" }}>
      <CardHeader>
        <CardTitle>Registro de Webhooks</CardTitle>
        <CardDescription>Últimas entregas de webhooks (últimos 50 registros)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="p-8 text-center text-tierra-media">Cargando...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-tierra-media">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No hay registros de webhooks</p>
            <p className="text-xs mt-2">Los webhooks aparecerán aquí cuando se reciban</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Tipo</TableHead><TableHead>Evento</TableHead><TableHead>Estado</TableHead><TableHead>Código</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell><Badge variant="outline">{log.webhook_type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{log.event_type || "N/A"}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell><span className={log.response_code && log.response_code >= 400 ? "text-red-600 font-semibold" : ""}>{log.response_code || "N/A"}</span></TableCell>
                  <TableCell className="text-xs">{new Date(log.created_at).toLocaleString("es-AR")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" title="Ver detalles" variant="ghost" onClick={() => onViewDetails(log)}><Eye className="h-4 w-4" /></Button>
                      {log.error_message && <div title="Tiene error"><AlertCircle className="h-4 w-4 text-red-500" /></div>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
