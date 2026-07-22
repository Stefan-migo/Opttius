"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { DemoRequest, FunnelStage, Stats } from "./types";

const ACTIVE_STAGES =
  "pending,approved,demo_expiring,demo_expired,meeting_scheduled,post_meeting,negotiation,migration";
const CONVERTED_STAGES = "converted";
const LOST_STAGES = "rejected,lost";

export function useNewUsersFlow() {
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

  const fetchData = useCallback(async () => {
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
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = useCallback(
    async (id: string) => {
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
    },
    [fetchData],
  );

  const handleDeleteClick = useCallback((r: DemoRequest) => {
    setRequestToDelete(r);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
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
        toast.error(
          data.details
            ? `${data.error ?? "Error"}: ${data.details}`
            : (data.error ?? "Error al eliminar"),
        );
      }
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setActioning(null);
    }
  }, [requestToDelete, fetchData]);

  const handleReject = useCallback(
    async (id: string) => {
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
    },
    [fetchData],
  );

  const handleFunnelUpdate = useCallback(
    async (
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
    },
    [fetchData],
  );

  const handleKanbanStageChange = useCallback(
    async (leadId: string, newStage: FunnelStage) => {
      await handleFunnelUpdate(leadId, newStage);
    },
    [handleFunnelUpdate],
  );

  const openLeadModal = useCallback((r: DemoRequest) => {
    setSelectedRequest(r);
    setDetailPanelOpen(true);
  }, []);

  const openLegacyModal = useCallback((r: DemoRequest) => {
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
  }, []);

  const handleSendEmail = useCallback(
    async (leadId: string, subject: string, body: string) => {
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
    },
    [fetchData],
  );

  const handleGenerateAIEmail = useCallback(
    async (leadId: string, prompt: string) => {
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
    },
    [],
  );

  return {
    requests,
    stats,
    loading,
    actioning,
    tab,
    viewMode,
    selectedRequest,
    funnelModalOpen,
    funnelForm,
    deleteConfirmOpen,
    requestToDelete,
    detailPanelOpen,
    emailModalOpen,
    aiModalOpen,
    setTab,
    setViewMode,
    setSelectedRequest,
    setFunnelModalOpen,
    setFunnelForm,
    setDeleteConfirmOpen,
    setRequestToDelete,
    setDetailPanelOpen,
    setEmailModalOpen,
    setAiModalOpen,
    fetchData,
    handleApprove,
    handleDeleteClick,
    handleDeleteConfirm,
    handleReject,
    handleFunnelUpdate,
    handleKanbanStageChange,
    openLeadModal,
    openLegacyModal,
    handleSendEmail,
    handleGenerateAIEmail,
  };
}
