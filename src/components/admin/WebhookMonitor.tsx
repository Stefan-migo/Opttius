"use client";

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  RefreshCw,
  TestTube,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WebhookLog {
  id: string;
  webhook_type: string;
  event_type: string;
  status: string;
  response_code: number;
  error_message?: string;
  payload?: unknown;
  created_at: string;
  processed_at?: string;
}

interface WebhookStats {
  total: number;
  success: number;
  failed: number;
  last_delivery: string | null;
}

interface WebhookStatus {
  status: {
    mercadopago: WebhookStats;
    sanity: WebhookStats;
  };
  urls: {
    mercadopago: string;
    sanity: string;
  };
}

export default function WebhookMonitor() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const [logsRes, statusRes] = await Promise.all([
        fetch(`/api/admin/system/webhooks/logs?${params}`).catch(
          () => ({ ok: false }) as Response,
        ),
        fetch("/api/admin/system/webhooks/status").catch(
          () => ({ ok: false }) as Response,
        ),
      ]);

      if (logsRes.ok) {
        try {
          const logsData = await (logsRes as Response).json();
          setLogs(logsData.logs || []);
        } catch (error) {
          console.error("Error parsing logs response:", error);
          setLogs([]);
        }
      } else {
        setLogs([]);
      }

      if (statusRes.ok) {
        try {
          const statusData = await (statusRes as Response).json();
          setStatus(statusData);
        } catch (error) {
          console.error("Error parsing status response:", error);
          setStatus(null);
        }
      } else {
        setStatus(null);
      }
    } catch (error) {
      console.error("Error fetching webhook data:", error);
      toast.error("Error al cargar datos de webhooks");
      setLogs([]);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCopyUrl = (url: string, type: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`URL de ${type} copiada al portapapeles`);
  };

  const handleTestWebhook = async (type: string) => {
    try {
      const response = await fetch("/api/admin/system/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_type: type }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data.error || "Error al probar webhook");
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast.error("Error al probar webhook");
    }
  };

  const handleViewDetails = (log: WebhookLog) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Exitoso
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Fallido
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const mercadopagoStats = status?.status?.mercadopago || {
    total: 0,
    success: 0,
    failed: 0,
    last_delivery: null,
  };
  const sanityStats = status?.status?.sanity || {
    total: 0,
    success: 0,
    failed: 0,
    last_delivery: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-azul-profundo">
            Monitoreo de Webhooks
          </h2>
          <p className="text-tierra-media">
            Monitorea el estado y las entregas de webhooks
          </p>
        </div>
        <Button disabled={loading} variant="outline" onClick={fetchData}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      {/* Webhook URLs */}
      {status?.urls && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                MercadoPago Webhook
              </CardTitle>
              <CardDescription className="text-xs">
                Recibe notificaciones de pagos de MercadoPago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  readOnly
                  className="font-mono text-xs"
                  value={status.urls.mercadopago}
                />
                <Button
                  size="sm"
                  title="Copiar URL"
                  variant="outline"
                  onClick={() =>
                    handleCopyUrl(status.urls.mercadopago, "MercadoPago")
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  title="Probar webhook"
                  variant="outline"
                  onClick={() => handleTestWebhook("mercadopago")}
                >
                  <TestTube className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 text-xs text-tierra-media space-y-1">
                <p>
                  Total (24h):{" "}
                  <span className="font-semibold">
                    {mercadopagoStats.total}
                  </span>{" "}
                  | Exitosos:{" "}
                  <span className="font-semibold text-green-600">
                    {mercadopagoStats.success}
                  </span>{" "}
                  | Fallidos:{" "}
                  <span className="font-semibold text-red-600">
                    {mercadopagoStats.failed}
                  </span>
                </p>
                {mercadopagoStats.last_delivery && (
                  <p>
                    Última entrega:{" "}
                    {new Date(mercadopagoStats.last_delivery).toLocaleString(
                      "es-AR",
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Sanity Webhook
              </CardTitle>
              <CardDescription className="text-xs">
                Revalida el cache cuando se actualiza contenido en Sanity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  readOnly
                  className="font-mono text-xs"
                  value={status.urls.sanity}
                />
                <Button
                  size="sm"
                  title="Copiar URL"
                  variant="outline"
                  onClick={() => handleCopyUrl(status.urls.sanity, "Sanity")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  title="Probar webhook"
                  variant="outline"
                  onClick={() => handleTestWebhook("sanity")}
                >
                  <TestTube className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 text-xs text-tierra-media space-y-1">
                <p>
                  Total (24h):{" "}
                  <span className="font-semibold">{sanityStats.total}</span> |
                  Exitosos:{" "}
                  <span className="font-semibold text-green-600">
                    {sanityStats.success}
                  </span>{" "}
                  | Fallidos:{" "}
                  <span className="font-semibold text-red-600">
                    {sanityStats.failed}
                  </span>
                </p>
                {sanityStats.last_delivery && (
                  <p>
                    Última entrega:{" "}
                    {new Date(sanityStats.last_delivery).toLocaleString(
                      "es-AR",
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div>
              <Label>Tipo:</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                  <SelectItem value="sanity">Sanity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Exitosos</SelectItem>
                  <SelectItem value="failed">Fallidos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardHeader>
          <CardTitle>Registro de Webhooks</CardTitle>
          <CardDescription>
            Últimas entregas de webhooks (últimos 50 registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-tierra-media">Cargando...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-tierra-media">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay registros de webhooks</p>
              <p className="text-xs mt-2">
                Los webhooks aparecerán aquí cuando se reciban
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline">{log.webhook_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.event_type || "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          log.response_code && log.response_code >= 400
                            ? "text-red-600 font-semibold"
                            : ""
                        }
                      >
                        {log.response_code || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(log.created_at).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          title="Ver detalles"
                          variant="ghost"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {log.error_message && (
                          <div title="Tiene error">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Detalles del Webhook
            </DialogTitle>
            <DialogDescription>
              Información completa del webhook recibido
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">
                    Tipo de Webhook
                  </Label>
                  <p className="text-sm mt-1">
                    <Badge variant="outline">{selectedLog.webhook_type}</Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">
                    Tipo de Evento
                  </Label>
                  <p className="text-sm mt-1 font-mono">
                    {selectedLog.event_type || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Estado</Label>
                  <p className="text-sm mt-1">
                    {getStatusBadge(selectedLog.status)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">
                    Código de Respuesta
                  </Label>
                  <p
                    className={`text-sm mt-1 ${selectedLog.response_code && selectedLog.response_code >= 400 ? "text-red-600 font-semibold" : ""}`}
                  >
                    {selectedLog.response_code || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">
                    Fecha de Recepción
                  </Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedLog.created_at).toLocaleString("es-AR")}
                  </p>
                </div>
                {selectedLog.processed_at && (
                  <div>
                    <Label className="text-sm font-semibold">
                      Fecha de Procesamiento
                    </Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedLog.processed_at).toLocaleString(
                        "es-AR",
                      )}
                    </p>
                  </div>
                )}
              </div>

              {selectedLog.error_message && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <Label className="text-sm font-semibold text-red-800 dark:text-red-300">
                        Mensaje de Error
                      </Label>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        {selectedLog.error_message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedLog.payload && (
                <div>
                  <Label className="text-sm font-semibold">
                    Payload (Datos Recibidos)
                  </Label>
                  <div className="mt-2 p-4 bg-admin-bg-tertiary rounded-lg border overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <Label className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      Información
                    </Label>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-1 list-disc list-inside">
                      <li>
                        Los webhooks se registran automáticamente cuando se
                        reciben
                      </li>
                      <li>
                        El estado se actualiza después de procesar el webhook
                      </li>
                      <li>
                        Los webhooks fallidos pueden indicar problemas de
                        configuración o de red
                      </li>
                      <li>Los webhooks pendientes están siendo procesados</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
