"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Copy,
  Link2,
  Users,
  Clock,
  Mail,
  TrendingUp,
  Calendar,
  Video,
  FileText,
  Target,
} from "lucide-react";
import { toast } from "sonner";

type FunnelStage =
  | "pending"
  | "approved"
  | "rejected"
  | "demo_expiring"
  | "demo_expired"
  | "meeting_scheduled"
  | "post_meeting"
  | "negotiation"
  | "migration"
  | "converted"
  | "lost";

interface DemoRequest {
  id: string;
  email: string;
  full_name: string | null;
  optica_name: string | null;
  phone: string | null;
  source: string;
  status: string;
  funnel_stage: FunnelStage | null;
  created_at: string;
  reviewed_at: string | null;
  organization_id: string | null;
  demo_started_at: string | null;
  demo_expires_at: string | null;
  meeting_url: string | null;
  meeting_scheduled_at: string | null;
  meeting_completed_at: string | null;
  offer_type: string | null;
  notes: string | null;
  last_contact_at: string | null;
  lost_reason: string | null;
}

interface Stats {
  pendingRequests: number;
  approvedThisMonth: number;
  activeDemos: number;
  conversionRate?: number;
  totalConverted?: number;
  totalApproved?: number;
  expiringSoon?: number;
  byStage?: Record<string, number>;
}

const STAGE_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Demo activa",
  demo_expiring: "Por vencer",
  demo_expired: "Expirada",
  meeting_scheduled: "Reunión agendada",
  post_meeting: "Post-reunión",
  negotiation: "Negociación",
  migration: "Migración",
  converted: "Convertido",
  rejected: "Rechazada",
  lost: "Perdido",
};

const STAGE_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  demo_expiring: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  demo_expired: "bg-slate-500/20 text-slate-700 dark:text-slate-400",
  meeting_scheduled: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  post_meeting: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  negotiation: "bg-violet-500/20 text-violet-700 dark:text-violet-400",
  migration: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
  converted: "bg-green-600/20 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/20 text-red-700 dark:text-red-400",
  lost: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

const ACTIVE_STAGES =
  "pending,approved,demo_expiring,demo_expired,meeting_scheduled,post_meeting,negotiation,migration";
const CONVERTED_STAGES = "converted";
const LOST_STAGES = "rejected,lost";

export default function NewUsersFlowPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [tab, setTab] = useState<"activos" | "convertidos" | "perdidos">(
    "activos",
  );
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(
    null,
  );
  const [funnelModalOpen, setFunnelModalOpen] = useState(false);
  const [funnelForm, setFunnelForm] = useState({
    meeting_url: "",
    meeting_scheduled_at: "",
    notes: "",
    offer_type: "",
    lost_reason: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const stagesParam =
        tab === "activos"
          ? `funnel_stages=${ACTIVE_STAGES}`
          : tab === "convertidos"
            ? `funnel_stages=${CONVERTED_STAGES}`
            : `funnel_stages=${LOST_STAGES}`;
      const [reqRes, statsRes] = await Promise.all([
        fetch(
          `/api/admin/saas-management/demo-requests?${stagesParam}&limit=100`,
        ),
        fetch("/api/admin/saas-management/new-users-flow/stats"),
      ]);
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests ?? []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (err) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      const res = await fetch(
        `/api/admin/saas-management/demo-requests/${id}/approve`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message ?? "Demo aprobada");
        fetchData();
      } else {
        toast.error(
          data.details
            ? `${data.error ?? "Error"}: ${data.details}`
            : (data.error ?? "Error al aprobar"),
        );
      }
    } catch {
      toast.error("Error al aprobar");
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioning(id);
    try {
      const res = await fetch(
        `/api/admin/saas-management/demo-requests/${id}/reject`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        toast.success("Solicitud rechazada");
        fetchData();
      } else {
        toast.error(data.error ?? "Error al rechazar");
      }
    } catch {
      toast.error("Error al rechazar");
    } finally {
      setActioning(null);
    }
  };

  const handleFunnelUpdate = async (
    id: string,
    funnel_stage: FunnelStage,
    extra?: Record<string, unknown>,
  ) => {
    setActioning(id);
    try {
      const res = await fetch(
        `/api/admin/saas-management/demo-requests/${id}/funnel`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ funnel_stage, ...extra }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message ?? "Etapa actualizada");
        setFunnelModalOpen(false);
        setSelectedRequest(null);
        fetchData();
      } else {
        toast.error(data.error ?? "Error al actualizar");
      }
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setActioning(null);
    }
  };

  const openLeadModal = (r: DemoRequest) => {
    setSelectedRequest(r);
    setFunnelForm({
      meeting_url: r.meeting_url ?? "",
      meeting_scheduled_at: r.meeting_scheduled_at
        ? r.meeting_scheduled_at.slice(0, 16)
        : "",
      notes: r.notes ?? "",
      offer_type: r.offer_type ?? "",
      lost_reason: r.lost_reason ?? "",
    });
    setFunnelModalOpen(true);
  };

  const copyLink = (path: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}${path}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado al portapapeles");
  };

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    const d = new Date(s);
    return d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const daysInDemo = (r: DemoRequest) => {
    if (!r.demo_started_at || !r.demo_expires_at) return null;
    const start = new Date(r.demo_started_at);
    const end = new Date(r.demo_expires_at);
    const now = new Date();
    if (now > end)
      return {
        days: Math.ceil((end.getTime() - start.getTime()) / 86400000),
        expired: true,
      };
    return {
      days: Math.ceil((now.getTime() - start.getTime()) / 86400000),
      expired: false,
    };
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-epoch-primary tracking-tight">
            Flujos de Nuevos Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Solicitudes de demo y acceso para ópticas conocidas
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/admin/saas-management/dashboard")}
          title="Volver al dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="admin-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Aprobadas este mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.approvedThisMonth}
              </div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Demos activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeDemos}</div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tasa conversión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.conversionRate ?? 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalConverted ?? 0} / {stats.totalApproved ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Por vencer (2 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.expiringSoon ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Dar acceso a óptica conocida
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparte este enlace con ópticas que conoces. Les permite crear
            cuenta y acceder a una demo dedicada de 7 días con banner de
            activación.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            <code className="px-3 py-2 bg-muted rounded-lg text-sm">
              {typeof window !== "undefined"
                ? `${window.location.origin}/acceso-opticas`
                : "/acceso-opticas"}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyLink("/acceso-opticas")}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar enlace
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Pipeline de Ventas
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Solicitudes desde /solicitar-demo. Gestiona cada etapa del funnel
            hasta la conversión.
          </p>
          <div className="flex gap-2 mt-4">
            {(["activos", "convertidos", "perdidos"] as const).map((t) => (
              <Button
                key={t}
                variant={tab === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTab(t)}
              >
                {t === "activos" && "Activos"}
                {t === "convertidos" && "Convertidos"}
                {t === "perdidos" && "Perdidos/Rechazados"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay solicitudes en esta categoría
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Email</th>
                    <th className="text-left py-3 px-2">Nombre / Óptica</th>
                    <th className="text-left py-3 px-2">Etapa</th>
                    <th className="text-left py-3 px-2">Días demo</th>
                    <th className="text-left py-3 px-2">Último contacto</th>
                    <th className="text-right py-3 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const stage = r.funnel_stage || "pending";
                    const days = daysInDemo(r);
                    return (
                      <tr
                        key={r.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => openLeadModal(r)}
                      >
                        <td className="py-3 px-2">{r.email}</td>
                        <td className="py-3 px-2">
                          <div>{r.full_name || "—"}</div>
                          {r.optica_name && (
                            <div className="text-xs text-muted-foreground">
                              {r.optica_name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant="secondary"
                            className={STAGE_COLORS[stage] || ""}
                          >
                            {STAGE_LABELS[stage] || stage}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          {days
                            ? `${days.days}${days.expired ? " (expiró)" : ""}`
                            : "—"}
                        </td>
                        <td className="py-3 px-2">
                          {formatDate(r.last_contact_at || r.created_at)}
                        </td>
                        <td
                          className="py-3 px-2 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex gap-2 justify-end">
                            {stage === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(r.id)}
                                  disabled={actioning === r.id}
                                >
                                  {actioning === r.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Aprobar
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(r.id)}
                                  disabled={actioning === r.id}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rechazar
                                </Button>
                              </>
                            )}
                            {[
                              "approved",
                              "demo_expiring",
                              "demo_expired",
                            ].includes(stage) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openLeadModal(r)}
                              >
                                <Video className="h-4 w-4 mr-1" />
                                Reunión
                              </Button>
                            )}
                            {[
                              "meeting_scheduled",
                              "post_meeting",
                              "negotiation",
                              "migration",
                            ].includes(stage) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openLeadModal(r)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={funnelModalOpen} onOpenChange={setFunnelModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del lead</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-muted-foreground">{selectedRequest.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Nombre / Óptica</p>
                <p className="text-muted-foreground">
                  {selectedRequest.full_name || "—"} /{" "}
                  {selectedRequest.optica_name || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Etapa actual</p>
                <Badge
                  variant="secondary"
                  className={
                    STAGE_COLORS[selectedRequest.funnel_stage || "pending"] ||
                    ""
                  }
                >
                  {STAGE_LABELS[selectedRequest.funnel_stage || "pending"]}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">URL de reunión</p>
                <input
                  type="url"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="https://meet.google.com/..."
                  value={funnelForm.meeting_url}
                  onChange={(e) =>
                    setFunnelForm((f) => ({
                      ...f,
                      meeting_url: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <p className="text-sm font-medium">Notas</p>
                <textarea
                  className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]"
                  placeholder="Notas del lead..."
                  value={funnelForm.notes}
                  onChange={(e) =>
                    setFunnelForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-4">
                {["approved", "demo_expiring", "demo_expired"].includes(
                  selectedRequest.funnel_stage || "",
                ) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const url =
                        funnelForm.meeting_url?.trim() ||
                        (typeof window !== "undefined"
                          ? `${window.location.origin}/contacto`
                          : "https://www.opttius.cl/contacto");
                      handleFunnelUpdate(
                        selectedRequest.id,
                        "meeting_scheduled",
                        {
                          meeting_url: url,
                          meeting_scheduled_at:
                            funnelForm.meeting_scheduled_at ||
                            new Date().toISOString(),
                        },
                      );
                    }}
                    disabled={actioning === selectedRequest.id}
                  >
                    Agendar reunión
                  </Button>
                )}
                {selectedRequest.funnel_stage === "meeting_scheduled" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      handleFunnelUpdate(selectedRequest.id, "post_meeting", {
                        notes: funnelForm.notes || undefined,
                      })
                    }
                    disabled={actioning === selectedRequest.id}
                  >
                    Reunión completada
                  </Button>
                )}
                {selectedRequest.funnel_stage === "post_meeting" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      handleFunnelUpdate(selectedRequest.id, "negotiation", {
                        notes: funnelForm.notes || undefined,
                      })
                    }
                    disabled={actioning === selectedRequest.id}
                  >
                    Enviar oferta
                  </Button>
                )}
                {selectedRequest.funnel_stage === "negotiation" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      handleFunnelUpdate(selectedRequest.id, "migration", {
                        notes: funnelForm.notes || undefined,
                      })
                    }
                    disabled={actioning === selectedRequest.id}
                  >
                    Iniciar migración
                  </Button>
                )}
                {selectedRequest.funnel_stage === "migration" && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() =>
                      handleFunnelUpdate(selectedRequest.id, "converted", {
                        notes: funnelForm.notes || undefined,
                      })
                    }
                    disabled={actioning === selectedRequest.id}
                  >
                    Marcar convertido
                  </Button>
                )}
                {[
                  "demo_expired",
                  "meeting_scheduled",
                  "post_meeting",
                  "negotiation",
                ].includes(selectedRequest.funnel_stage || "") && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      const reason = prompt("Motivo de pérdida:");
                      if (reason !== null)
                        handleFunnelUpdate(selectedRequest.id, "lost", {
                          lost_reason: reason || "Sin especificar",
                          notes: funnelForm.notes || undefined,
                        });
                    }}
                    disabled={actioning === selectedRequest.id}
                  >
                    Marcar perdido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
