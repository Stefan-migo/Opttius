"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { LeadDetail } from "./LeadDetailPanel";

function formatDate(date: string | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeadInfoTab({ lead }: { lead: LeadDetail }) {
  const daysUntilExpiry = lead.demo_expires_at
    ? Math.ceil(
        (new Date(lead.demo_expires_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <div className="space-y-6">
      {lead.lead_score !== undefined && lead.lead_score > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Score del Lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-white">
                {lead.lead_score}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-white/60">
                  Prioridad:{" "}
                  <span className="text-white">{lead.priority_level}</span>
                </p>
                {lead.score_last_calculated_at && (
                  <p className="text-xs text-white/40">
                    Actualizado: {formatDate(lead.score_last_calculated_at)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/70">
          Información de Contacto
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40">Email</p>
            <p className="text-sm text-white">{lead.email}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Teléfono</p>
            <p className="text-sm text-white">{lead.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Nombre</p>
            <p className="text-sm text-white">{lead.full_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Óptica</p>
            <p className="text-sm text-white">{lead.optica_name || "—"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/70">Pipeline</h3>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            {lead.funnel_stage || "Pendiente"}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/70">Fechas</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40">Creado</p>
            <p className="text-sm text-white">{formatDate(lead.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Último contacto</p>
            <p className="text-sm text-white">
              {formatDate(lead.last_contact_at)}
            </p>
          </div>
          {lead.demo_expires_at && (
            <div>
              <p className="text-xs text-white/40">Demo expira</p>
              <p className="text-sm text-white">
                {formatDate(lead.demo_expires_at)}
                {daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
                  <span className="ml-2 text-orange-400">
                    ({daysUntilExpiry} días)
                  </span>
                )}
              </p>
            </div>
          )}
          {lead.next_followup_at && (
            <div>
              <p className="text-xs text-white/40">Próximo follow-up</p>
              <p className="text-sm text-white">
                {formatDate(lead.next_followup_at)}
              </p>
            </div>
          )}
        </div>
      </div>

      {lead.source && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/70">Fuente</h3>
          <div className="flex flex-wrap gap-2">
            <Badge
              className="text-white border-white/30 bg-white/5"
              variant="outline"
            >
              {lead.source}
            </Badge>
            {lead.utm_source && (
              <Badge
                className="text-white border-white/30 bg-white/5"
                variant="outline"
              >
                UTM: {lead.utm_source}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
