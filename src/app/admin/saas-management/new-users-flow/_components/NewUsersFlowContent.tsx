"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  LeadAIGeneratorModal,
  type LeadAIGeneratorModalProps,
} from "@/components/admin/saas-management/leads/LeadAIGeneratorModal";
import {
  LeadDetailPanel,
  type LeadDetail,
} from "@/components/admin/saas-management/leads/LeadDetailPanel";
import {
  LeadEmailModal,
  type LeadEmailModalProps,
} from "@/components/admin/saas-management/leads/LeadEmailModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { FunnelDialog } from "./FunnelDialog";
import { PipelineSection } from "./PipelineSection";
import { StatsCards } from "./StatsCards";
import type { DemoRequest, FunnelStage, Stats } from "./types";

const ACTIVE_STAGES =
  "pending,approved,demo_expiring,demo_expired,meeting_scheduled,post_meeting,negotiation,migration";
const CONVERTED_STAGES = "converted";
const LOST_STAGES = "rejected,lost";

export default function NewUsersFlowContent() {
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
      } else {
        const errorData = await reqRes.json();
        toast.error(errorData.error || "Error al cargar solicitudes");
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch {
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

      {stats && <StatsCards stats={stats} />}

      <PipelineSection
        requests={requests}
        loading={loading}
        tab={tab}
        onTabChange={setTab}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onApprove={handleApprove}
        onReject={handleReject}
        onOpenLeadModal={openLegacyModal}
        onDeleteClick={handleDeleteClick}
        onStageChange={handleKanbanStageChange}
        actioning={actioning}
      />

      <FunnelDialog
        open={funnelModalOpen}
        onOpenChange={setFunnelModalOpen}
        selectedRequest={selectedRequest}
        funnelForm={funnelForm}
        onFormChange={(field, value) =>
          setFunnelForm((f) => ({ ...f, [field]: value }))
        }
        onFunnelUpdate={handleFunnelUpdate}
        onDeleteClick={handleDeleteClick}
        actioning={actioning}
      />

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        requestToDelete={requestToDelete}
        onDeleteConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setRequestToDelete(null);
        }}
        actioning={actioning}
      />

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

      <LeadEmailModal
        lead={selectedRequest as LeadEmailModalProps["lead"]}
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        onSend={handleSendEmail}
      />

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
