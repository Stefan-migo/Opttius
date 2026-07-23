"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { LeadCard } from "./LeadCard";
import { KANBAN_COLUMNS, STAGE_COLORS } from "./leadConstants";
import type { FunnelStage, Lead } from "./types";

interface LeadKanbanBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStageChange: (leadId: string, newStage: FunnelStage) => void;
  loading?: boolean;
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
        <Badge className="bg-white/10 text-white text-xs" variant="secondary">
          {leads.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
        {leads.map((lead) => (
          <div className="relative" key={lead.id}>
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
              label={label}
              leads={leadsByStage[stage] || []}
              stage={stage}
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
