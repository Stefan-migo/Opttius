"use client";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadKanbanBoard } from "@/components/admin/saas-management/leads/LeadKanbanBoard";
import {
  LeadDetailPanel,
  type LeadDetail,
  type LeadDetailPanelProps,
} from "@/components/admin/saas-management/leads/LeadDetailPanel";
import {
  LeadEmailModal,
  type LeadEmailModalProps,
} from "@/components/admin/saas-management/leads/LeadEmailModal";
import {
  LeadAIGeneratorModal,
  type LeadAIGeneratorModalProps,
} from "@/components/admin/saas-management/leads/LeadAIGeneratorModal";

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
  lead_score?: number;
  priority_level?: string;
  score_last_calculated_at?: string;
  assigned_to?: string;
  next_followup_at?: string;
  first_contact_at?: string;
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
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<DemoRequest | null>(
    null,
  );
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

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

  const handleDeleteClick = (r: DemoRequest) => {
    setRequestToDelete(r);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;
    setActioning(requestToDelete.id);
    try {
      const res = await fetch(
        `/api/admin/saas-management/demo-requests/${requestToDelete.id}/delete`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message ?? "Solicitud eliminada");
        setDeleteConfirmOpen(false);
        setRequestToDelete(null);
        setFunnelModalOpen(false);
        setSelectedRequest(null);
        fetchData();
      } else {
        const msg = data.details
          ? `${data.error ?? "Error"}: ${data.details}`
          : (data.error ?? "Error al eliminar");
        toast.error(msg);
      }
    } catch {
      toast.error("Error al eliminar");
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

  // Handler for Kanban quick stage changes
  const handleKanbanStageChange = async (
    leadId: string,
    newStage: FunnelStage,
  ) => {
    await handleFunnelUpdate(leadId, newStage);
  };

  const openLeadModal = (r: DemoRequest) => {
    setSelectedRequest(r);
    setDetailPanelOpen(true);
  };

  const openLegacyModal = (r: DemoRequest) => {
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

  // Handlers for email modals
  const handleSendEmail = async (
    leadId: string,
    subject: string,
    body: string,
  ) => {
    const res = await fetch(
      `/api/admin/saas-management/leads/${leadId}/email/send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Error al enviar");
    }
    toast.success("Email enviado correctamente");
    fetchData();
  };

  const handleGenerateAIEmail = async (leadId: string, prompt: string) => {
    const res = await fetch(
      `/api/admin/saas-management/leads/${leadId}/email/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Error al generar");
    }
    return { subject: data.subject, body: data.body };
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
    <div className="min-h-screen bg-[#0D1117] space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Pipeline de Leads
          </h1>
          <p className="text-white/50 mt-1">
            Gestiona tus leads y sigue el funnel de ventas
          </p>
        </div>
        <Button
          size="icon"
          title="Volver al dashboard"
          variant="outline"
          onClick={() => router.push("/admin/saas-management/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
                <Clock className="h-4 w-4 text-amber-400" />
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.pendingRequests}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Aprobadas este mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.approvedThisMonth}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
                <Users className="h-4 w-4 text-blue-400" />
                Demos activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.activeDemos}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                Tasa conversión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.conversionRate ?? 0}%
              </div>
              <p className="text-xs text-white/40 mt-1">
                {stats.totalConverted ?? 0} / {stats.totalApproved ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/70">
                <Calendar className="h-4 w-4 text-orange-400" />
                Por vencer (2 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.expiringSoon ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Target className="h-5 w-5 text-amber-400" />
            Pipeline de Ventas
          </CardTitle>
          <p className="text-sm text-white/50">
            Gestiona cada etapa del funnel hasta la conversión.
          </p>
          <div className="flex gap-2 mt-4">
            {(["activos", "convertidos", "perdidos"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tab === t ? "default" : "outline"}
                onClick={() => setTab(t)}
              >
                {t === "activos" && "Activos"}
                {t === "convertidos" && "Convertidos"}
                {t === "perdidos" && "Perdidos/Rechazados"}
              </Button>
            ))}
            <div className="ml-auto flex gap-1 border rounded-md p-1">
              <Button
                size="sm"
                variant={viewMode === "kanban" ? "default" : "ghost"}
                onClick={() => setViewMode("kanban")}
                title="Vista Kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "table" ? "default" : "ghost"}
                onClick={() => setViewMode("table")}
                title="Vista Tabla"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-white/50">
              No hay solicitudes en esta categoría
            </p>
          ) : viewMode === "kanban" ? (
            <LeadKanbanBoard
              leads={requests}
              onLeadClick={(lead) => openLeadModal(lead as DemoRequest)}
              onStageChange={handleKanbanStageChange}
              loading={loading}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-white/70">Email</th>
                    <th className="text-left py-3 px-2 text-white/70">
                      Nombre / Óptica
                    </th>
                    <th className="text-left py-3 px-2 text-white/70">Etapa</th>
                    <th className="text-left py-3 px-2 text-white/70">Score</th>
                    <th className="text-left py-3 px-2 text-white/70">
                      Último contacto
                    </th>
                    <th className="text-right py-3 px-2 text-white/70">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const stage = r.funnel_stage || "pending";
                    const days = daysInDemo(r);
                    return (
                      <tr
                        className="border-b border-white/10 hover:bg-white/5 cursor-pointer"
                        key={r.id}
                        onClick={() => openLeadModal(r)}
                      >
                        <td className="py-3 px-2 text-white">{r.email}</td>
                        <td className="py-3 px-2">
                          <div className="text-white">{r.full_name || "—"}</div>
                          {r.optica_name && (
                            <div className="text-xs text-white/50">
                              {r.optica_name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            className={`${STAGE_COLORS[stage] || ""} bg-opacity-20 text-white border-0`}
                            variant="secondary"
                          >
                            {STAGE_LABELS[stage] || stage}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          {r.lead_score !== undefined && r.lead_score > 0 ? (
                            <span className="text-amber-400 font-medium">
                              {r.lead_score}
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-white/70">
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
                                  disabled={actioning === r.id}
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(r.id)}
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
                                  disabled={actioning === r.id}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(r.id)}
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
                            <Button
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={actioning === r.id}
                              size="sm"
                              title="Eliminar solicitud"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(r);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                <p className="text-white/50">{selectedRequest.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Nombre / Óptica</p>
                <p className="text-white/50">
                  {selectedRequest.full_name || "—"} /{" "}
                  {selectedRequest.optica_name || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Etapa actual</p>
                <Badge
                  className={
                    STAGE_COLORS[selectedRequest.funnel_stage || "pending"] ||
                    ""
                  }
                  variant="secondary"
                >
                  {STAGE_LABELS[selectedRequest.funnel_stage || "pending"]}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">URL de reunión</p>
                <input
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="https://meet.google.com/..."
                  type="url"
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
                    disabled={actioning === selectedRequest.id}
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
                  >
                    Agendar reunión
                  </Button>
                )}
                {selectedRequest.funnel_stage === "meeting_scheduled" && (
                  <Button
                    disabled={actioning === selectedRequest.id}
                    size="sm"
                    onClick={() =>
                      handleFunnelUpdate(selectedRequest.id, "post_meeting", {
                        notes: funnelForm.notes || undefined,
                      })
                    }
                  >
                    Reunión completada
                  </Button>
                )}
                {selectedRequest.funnel_stage === "post_meeting" && (
                  <Button
                    disabled={actioning === selectedRequest.id}
                    size="sm"
                    onClick={() =>
                      handleFunnelUpdate(selectedRequest.id, "negotiation", {
                        notes: funnelForm.notes || undefined,
                      })
                    }
                  >
                    Enviar oferta
                  </Button>
                )}
                {selectedRequest.funnel_stage === "negotiation" && (
                  <Button
                    disabled={actioning === selectedRequest.id}
                    size="sm"
                    onClick={() =>
                      handleFunnelUpdate(selectedRequest.id, "migration", {
                        notes: funnelForm.notes || undefined,
                      })
                    }
                  >
                    Iniciar migración
                  </Button>
                )}
                {selectedRequest.funnel_stage === "migration" && (
                  <Button
                    disabled={actioning === selectedRequest.id}
                    size="sm"
                    variant="default"
                    onClick={() =>
                      handleFunnelUpdate(selectedRequest.id, "converted", {
                        notes: funnelForm.notes || undefined,
                      })
                    }
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
                    disabled={actioning === selectedRequest.id}
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
                  >
                    Marcar perdido
                  </Button>
                )}
                <Button
                  className="ml-auto"
                  disabled={actioning === selectedRequest.id}
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setFunnelModalOpen(false);
                    handleDeleteClick(selectedRequest);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar solicitud
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar solicitud</DialogTitle>
          </DialogHeader>
          {requestToDelete && (
            <div className="space-y-4">
              <p className="text-sm text-white/50">
                ¿Estás seguro de eliminar la solicitud de{" "}
                <strong>
                  {requestToDelete.full_name || requestToDelete.email}
                </strong>
                ? Se eliminará toda la información asociada
                {requestToDelete.organization_id &&
                  ", incluyendo la organización demo y sus datos"}
                .
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setRequestToDelete(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  disabled={actioning === requestToDelete.id}
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                >
                  {actioning === requestToDelete.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Eliminar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lead Detail Panel with Timeline */}
      <LeadDetailPanel
        lead={selectedRequest as LeadDetail}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        onUpdateStage={handleFunnelUpdate}
        onApprove={handleApprove}
        onReject={handleReject}
        onSendEmail={() => {
          setDetailPanelOpen(false);
          setEmailModalOpen(true);
        }}
        onGenerateAIEmail={() => {
          setDetailPanelOpen(false);
          setAiModalOpen(true);
        }}
        actioning={actioning}
      />

      {/* Manual Email Modal */}
      <LeadEmailModal
        lead={selectedRequest as LeadEmailModalProps["lead"]}
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        onSend={handleSendEmail}
      />

      {/* AI Generator Modal */}
      <LeadAIGeneratorModal
        lead={selectedRequest as LeadAIGeneratorModalProps["lead"]}
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onGenerate={handleGenerateAIEmail}
        onSend={handleSendEmail}
      />
    </div>
  );
}
