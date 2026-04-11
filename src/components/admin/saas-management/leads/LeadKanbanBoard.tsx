"use client";

import { ArrowRight, Clock, MoreHorizontal, Phone, Star } from "lucide-react";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type FunnelStage =
  | "pending"
  | "approved"
  | "demo_expiring"
  | "demo_expired"
  | "meeting_scheduled"
  | "post_meeting"
  | "negotiation"
  | "migration"
  | "converted"
  | "lost"
  | "rejected";

interface Lead {
  id: string;
  email: string;
  full_name: string | null;
  optica_name: string | null;
  phone: string | null;
  funnel_stage: FunnelStage | null;
  lead_score?: number;
  priority_level?: string;
  created_at: string;
  last_contact_at: string | null;
  demo_expires_at: string | null;
  meeting_scheduled_at?: string | null;
  source?: string;
}

interface LeadKanbanBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStageChange: (leadId: string, newStage: FunnelStage) => void;
  loading?: boolean;
}

const STAGE_LABELS: Record<FunnelStage, string> = {
  pending: "Pendiente",
  approved: "Demo activa",
  demo_expiring: "Por vencer",
  demo_expired: "Expirada",
  meeting_scheduled: "Reunión",
  post_meeting: "Post-reunión",
  negotiation: "Negociación",
  migration: "Migración",
  converted: "Convertido",
  rejected: "Rechazado",
  lost: "Perdido",
};

const STAGE_COLORS: Record<FunnelStage, string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  demo_expiring: "bg-orange-500",
  demo_expired: "bg-slate-500",
  meeting_scheduled: "bg-blue-500",
  post_meeting: "bg-indigo-500",
  negotiation: "bg-violet-500",
  migration: "bg-cyan-500",
  converted: "bg-green-500",
  rejected: "bg-red-500",
  lost: "bg-gray-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-amber-500",
  cold: "bg-blue-500",
  at_risk: "bg-gray-500",
};

const KANBAN_COLUMNS: { stage: FunnelStage; label: string }[] = [
  { stage: "pending", label: "Pendiente" },
  { stage: "approved", label: "Demo Activa" },
  { stage: "meeting_scheduled", label: "Reunión" },
  { stage: "post_meeting", label: "Post-reunión" },
  { stage: "negotiation", label: "Negociación" },
  { stage: "migration", label: "Migración" },
];

function getNextStages(currentStage: FunnelStage): FunnelStage[] {
  const flow: Record<FunnelStage, FunnelStage[]> = {
    pending: ["approved", "rejected"],
    approved: ["meeting_scheduled", "demo_expiring", "demo_expired"],
    demo_expiring: ["meeting_scheduled", "demo_expired"],
    demo_expired: ["meeting_scheduled", "lost"],
    meeting_scheduled: ["post_meeting", "lost"],
    post_meeting: ["negotiation", "lost"],
    negotiation: ["migration", "lost"],
    migration: ["converted", "lost"],
    converted: [],
    rejected: [],
    lost: [],
  };
  return flow[currentStage] || [];
}

function LeadCard({
  lead,
  onClick,
  onMoveToStage,
}: {
  lead: Lead;
  onClick: () => void;
  onMoveToStage: (stage: FunnelStage) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const nextStages = getNextStages(lead.funnel_stage || "pending");

  // Calculate days until expiry - always available to avoid hydration mismatch
  const daysUntilExpiry = lead.demo_expires_at
    ? Math.ceil(
        (new Date(lead.demo_expires_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const displayName = lead.full_name || lead.email;
  const displayOptica = lead.optica_name;
  const displayScore = lead.lead_score;
  const displayPriority = lead.priority_level;
  const displayPhone = lead.phone;
  const displayLastContact = lead.last_contact_at;

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors group relative"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {displayName}
          </p>
          {displayOptica && (
            <p className="text-xs text-white/50 truncate">{displayOptica}</p>
          )}
        </div>
        {displayPriority && displayPriority !== "cold" && (
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              PRIORITY_COLORS[displayPriority] || "bg-gray-500"
            }`}
            title={`Prioridad: ${displayPriority}`}
          />
        )}
      </div>

      {/* Score & Contact */}
      <div className="flex items-center gap-2 mb-2">
        {displayScore !== undefined && displayScore > 0 && (
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Star className="h-3 w-3 text-amber-400" />
            <span>{displayScore}</span>
          </div>
        )}
        {displayPhone && (
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Phone className="h-3 w-3" />
            <span className="truncate">{displayPhone}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span suppressHydrationWarning>
            {displayLastContact
              ? new Date(displayLastContact).toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "short",
                })
              : "Sin contacto"}
          </span>
        </div>
        {daysUntilExpiry !== null &&
          daysUntilExpiry <= 3 &&
          daysUntilExpiry > 0 && (
            <Badge
              variant="outline"
              className="text-xs text-orange-400 border-orange-400/30"
            >
              <Clock className="h-3 w-3 mr-1" />
              {daysUntilExpiry}d
            </Badge>
          )}
      </div>

      {/* Quick Actions (visible on hover) */}
      {nextStages.length > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#0D1117] border-white/20 text-white min-w-[160px]"
            >
              {nextStages.map((stage) => (
                <DropdownMenuItem
                  key={stage}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToStage(stage);
                  }}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Mover a {STAGE_LABELS[stage]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  stage,
  label,
  leads,
  onLeadClick,
  onMoveToStage,
}: {
  stage: FunnelStage;
  label: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onMoveToStage: (leadId: string, newStage: FunnelStage) => void;
}) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${STAGE_COLORS[stage]}`} />
          <h3 className="font-medium text-white text-sm">{label}</h3>
        </div>
        <Badge variant="secondary" className="bg-white/10 text-white text-xs">
          {leads.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
        {leads.map((lead) => (
          <div key={lead.id} className="relative">
            <LeadCard
              lead={lead}
              onClick={() => onLeadClick(lead)}
              onMoveToStage={(stage) => onMoveToStage(lead.id, stage)}
            />
          </div>
        ))}
        {leads.length === 0 && (
          <div className="border border-dashed border-white/10 rounded-lg p-4 text-center text-white/30 text-sm">
            Sin leads
          </div>
        )}
      </div>
    </div>
  );
}

export function LeadKanbanBoard({
  leads,
  onLeadClick,
  onStageChange,
  loading,
}: LeadKanbanBoardProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/50">Cargando pipeline...</div>
      </div>
    );
  }

  // Group leads by stage
  const leadsByStage = KANBAN_COLUMNS.reduce(
    (acc, col) => {
      acc[col.stage] = leads.filter(
        (l) => (l.funnel_stage as FunnelStage) === col.stage,
      );
      return acc;
    },
    {} as Record<FunnelStage, Lead[]>,
  );

  return (
    <div className="relative">
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {KANBAN_COLUMNS.map(({ stage, label }) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              label={label}
              leads={leadsByStage[stage] || []}
              onLeadClick={onLeadClick}
              onMoveToStage={onStageChange}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
