"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LeadActivityTimeline } from "@/components/admin/saas-management/leads/LeadActivityTimeline";
import { LeadInfoTab } from "@/components/admin/saas-management/leads/LeadInfoTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface Activity {
  id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by_user?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export interface LeadDetail {
  id: string;
  email: string;
  full_name: string | null;
  optica_name: string | null;
  phone: string | null;
  source: string;
  funnel_stage: FunnelStage | null;
  lead_score?: number;
  priority_level?: string;
  score_last_calculated_at?: string;
  created_at: string;
  last_contact_at?: string;
  next_followup_at?: string;
  demo_started_at?: string;
  demo_expires_at?: string;
  meeting_scheduled_at?: string;
  meeting_url?: string;
  notes?: string;
  lost_reason?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface LeadDetailPanelProps {
  lead: LeadDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStage: (
    id: string,
    stage: FunnelStage,
    extra?: Record<string, unknown>,
  ) => Promise<void>;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onSendEmail: (lead: LeadDetail) => void;
  onGenerateAIEmail: (lead: LeadDetail) => void;
  actioning?: string | null;
}

const STAGE_LABELS: Record<FunnelStage, string> = {
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

const STAGE_COLORS: Record<FunnelStage, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  demo_expiring: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  demo_expired: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  meeting_scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  post_meeting: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  negotiation: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  migration: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  converted: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  lost: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  hot: { label: "Hot", color: "text-red-400", bg: "bg-red-500/20" },
  warm: { label: "Warm", color: "text-amber-400", bg: "bg-amber-500/20" },
  cold: { label: "Cold", color: "text-blue-400", bg: "bg-blue-500/20" },
  at_risk: { label: "At Risk", color: "text-gray-400", bg: "bg-gray-500/20" },
};

export function LeadDetailPanel({
  lead,
  open,
  onOpenChange,
  onUpdateStage,
  onApprove,
  onReject,
  onSendEmail,
  onGenerateAIEmail,
  actioning,
}: LeadDetailPanelProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "activity">("info");

  useEffect(() => {
    if (lead && open) {
      setActivitiesLoading(true);
      fetch(`/api/admin/saas-management/leads/${lead.id}/activities?limit=20`)
        .then((res) => res.json())
        .then((data) => {
          setActivities(data.activities || []);
        })
        .catch(() => {
          toast.error("Error al cargar actividades");
        })
        .finally(() => {
          setActivitiesLoading(false);
        });
    }
  }, [lead, open]);

  if (!lead) return null;

  const priorityConfig = lead.priority_level
    ? PRIORITY_CONFIG[lead.priority_level]
    : null;

  const formatDate = (date: string | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const daysUntilExpiry = lead.demo_expires_at
    ? Math.ceil(
        (new Date(lead.demo_expires_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0D1117] border-white/20 text-white">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-white">
            <span>Detalle del Lead</span>
            {priorityConfig && (
              <Badge
                className={`${priorityConfig.bg} ${priorityConfig.color} border-0`}
              >
                {priorityConfig.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-2 flex-shrink-0">
          <Button
            size="sm"
            variant={activeTab === "info" ? "default" : "ghost"}
            onClick={() => setActiveTab("info")}
          >
            Información
          </Button>
          <Button
            size="sm"
            variant={activeTab === "activity" ? "default" : "ghost"}
            onClick={() => setActiveTab("activity")}
          >
            Actividad ({activities.length})
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "info" ? (
            <LeadInfoTab lead={lead} />
          ) : (
            <div className="py-2">
              <LeadActivityTimeline
                activities={activities}
                loading={activitiesLoading}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-white/10 flex-shrink-0">
          {/* Botones de aprobar/rechazar para leads pendientes */}
          {lead.funnel_stage === "pending" && (
            <>
              {onApprove && (
                <Button
                  disabled={actioning === lead.id}
                  size="sm"
                  variant="default"
                  onClick={() => onApprove(lead.id)}
                >
                  Aprobar Demo
                </Button>
              )}
              {onReject && (
                <Button
                  disabled={actioning === lead.id}
                  size="sm"
                  variant="destructive"
                  onClick={() => onReject(lead.id)}
                >
                  Rechazar
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => onSendEmail(lead)}>
            Enviar Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onGenerateAIEmail(lead)}
          >
            Generar con IA
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
