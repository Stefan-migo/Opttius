"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface WebhookLog {
  id: string; webhook_type: string; event_type: string; status: string;
  response_code: number; error_message?: string; payload?: unknown; created_at: string; processed_at?: string;
}
interface WebhookStats { total: number; success: number; failed: number; last_delivery: string | null; }
interface WebhookStatus {
  status: { mercadopago: WebhookStats; sanity: WebhookStats };
  urls: { mercadopago: string; sanity: string };
}

export function useWebhookMonitor() {
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
        fetch(`/api/admin/system/webhooks/logs?${params}`).catch(() => ({ ok: false } as Response)),
        fetch("/api/admin/system/webhooks/status").catch(() => ({ ok: false } as Response)),
      ]);
      if (logsRes.ok) { try { const d = await (logsRes as Response).json(); setLogs(d.logs || []); } catch { setLogs([]); } }
      else { setLogs([]); }
      if (statusRes.ok) { try { const d = await (statusRes as Response).json(); setStatus(d); } catch { setStatus(null); } }
      else { setStatus(null); }
    } catch { toast.error("Error al cargar datos de webhooks"); setLogs([]); setStatus(null); }
    finally { setLoading(false); }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  const handleCopyUrl = (url: string, type: string) => { navigator.clipboard.writeText(url); toast.success(`URL de ${type} copiada al portapapeles`); };
  const handleTestWebhook = async (type: string) => {
    try {
      const response = await fetch("/api/admin/system/webhooks/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhook_type: type }) });
      const data = await response.json();
      if (data.success) { toast.success(data.message); fetchData(); } else { toast.error(data.error || "Error al probar webhook"); }
    } catch { toast.error("Error al probar webhook"); }
  };
  const handleViewDetails = (log: WebhookLog) => { setSelectedLog(log); setShowDetailsDialog(true); };

  return {
    logs, status, loading, typeFilter, setTypeFilter, statusFilter, setStatusFilter,
    selectedLog, setSelectedLog, showDetailsDialog, setShowDetailsDialog,
    fetchData, handleCopyUrl, handleTestWebhook, handleViewDetails,
  };
}
