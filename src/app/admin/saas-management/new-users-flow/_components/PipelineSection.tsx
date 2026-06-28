"use client";

import {
  CheckCircle2,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Target,
  Trash2,
  Video,
  XCircle,
} from "lucide-react";

import { LeadKanbanBoard } from "@/components/admin/saas-management/leads/LeadKanbanBoard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DemoRequest, FunnelStage } from "./types";
import { STAGE_COLORS, STAGE_LABELS } from "./constants";

interface PipelineSectionProps {
  requests: DemoRequest[];
  loading: boolean;
  tab: "activos" | "convertidos" | "perdidos";
  onTabChange: (tab: "activos" | "convertidos" | "perdidos") => void;
  viewMode: "kanban" | "table";
  onViewModeChange: (mode: "kanban" | "table") => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOpenLeadModal: (r: DemoRequest) => void;
  onDeleteClick: (r: DemoRequest) => void;
  onStageChange: (leadId: string, newStage: FunnelStage) => void;
  actioning: string | null;
}

function formatDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysInDemo(r: DemoRequest) {
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
}

export function PipelineSection({
  requests,
  loading,
  tab,
  onTabChange,
  viewMode,
  onViewModeChange,
  onApprove,
  onReject,
  onOpenLeadModal,
  onDeleteClick,
  onStageChange,
  actioning,
}: PipelineSectionProps) {
  return (
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
              onClick={() => onTabChange(t)}
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
              onClick={() => onViewModeChange("kanban")}
              title="Vista Kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              onClick={() => onViewModeChange("table")}
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
            onLeadClick={(lead) => onOpenLeadModal(lead as DemoRequest)}
            onStageChange={(leadId, newStage) =>
              onStageChange(leadId, newStage as FunnelStage)
            }
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
                      onClick={() => onOpenLeadModal(r)}
                    >
                      <td className="py-3 px-2 text-white">{r.email}</td>
                      <td className="py-3 px-2">
                        <div className="text-white">
                          {r.full_name || "—"}
                        </div>
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
                                onClick={() => onApprove(r.id)}
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
                                onClick={() => onReject(r.id)}
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
                              onClick={() => onOpenLeadModal(r)}
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
                              onClick={() => onOpenLeadModal(r)}
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
                              onDeleteClick(r);
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
  );
}
