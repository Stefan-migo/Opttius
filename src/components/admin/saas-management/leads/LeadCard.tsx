"use client";

import { ArrowRight, Clock, MoreHorizontal, Phone, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PRIORITY_COLORS, STAGE_LABELS } from "./leadConstants";
import type { FunnelStage, Lead } from "./types";

function getNextStages(currentStage: FunnelStage): FunnelStage[] {
  const flow: Record<FunnelStage, FunnelStage[]> = {
    pending: ["approved", "rejected"],
    approved: ["demo_expiring", "meeting_scheduled", "demo_expired"],
    demo_expiring: ["demo_expired", "meeting_scheduled"],
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

export function LeadCard({
  lead,
  onClick,
  onMoveToStage,
}: {
  lead: Lead;
  onClick: () => void;
  onMoveToStage: (stage: FunnelStage) => void;
}) {
  const nextStages = getNextStages(lead.funnel_stage || "pending");

  const daysUntilExpiry = lead.demo_expires_at
    ? Math.ceil(
        (new Date(lead.demo_expires_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors group relative"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {lead.full_name || lead.email}
          </p>
          {lead.optica_name && (
            <p className="text-xs text-white/50 truncate">{lead.optica_name}</p>
          )}
        </div>
        {lead.priority_level && lead.priority_level !== "cold" && (
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              PRIORITY_COLORS[lead.priority_level] || "bg-gray-500"
            }`}
            title={`Prioridad: ${lead.priority_level}`}
          />
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        {lead.lead_score !== undefined && lead.lead_score > 0 && (
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Star className="h-3 w-3 text-amber-400" />
            <span>{lead.lead_score}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Phone className="h-3 w-3" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span suppressHydrationWarning>
            {lead.last_contact_at
              ? new Date(lead.last_contact_at).toLocaleDateString("es-CL", {
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
              className="text-xs text-orange-400 border-orange-400/30"
              variant="outline"
            >
              <Clock className="h-3 w-3 mr-1" />
              {daysUntilExpiry}d
            </Badge>
          )}
      </div>

      {nextStages.length > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
                size="icon"
                variant="ghost"
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
                  className="text-white hover:bg-white/10 cursor-pointer"
                  key={stage}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToStage(stage);
                  }}
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
