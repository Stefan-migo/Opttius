"use client";

import { AlertTriangle, Clock, Monitor, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface HealthStatus {
  status: string;
  warnings: number;
  criticals: number;
  last_check: string;
}

function getHealthStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    healthy: {
      label: "Saludable",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    },
    warning: {
      label: "Advertencias",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    },
    critical: {
      label: "Crítico",
      className:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    },
  };
  const cfg = config[status] || {
    label: status,
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800",
  };
  return (
    <Badge className={`${cfg.className} border text-xs px-2 py-0.5`}>
      {cfg.label}
    </Badge>
  );
}

interface SystemHealthCardsProps {
  healthStatus: HealthStatus | null;
}

export function SystemHealthCards({ healthStatus }: SystemHealthCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="rounded-xl border border-border overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/70 uppercase tracking-wider mb-1">
                Estado
              </p>
              <div className="flex items-center gap-2 min-w-0">
                {healthStatus && getHealthStatusBadge(healthStatus.status)}
              </div>
            </div>
            <Monitor className="h-8 w-8 sm:h-10 sm:w-10 text-epoch-primary/40 shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/70 uppercase tracking-wider mb-1">
                Advertencias
              </p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600 tabular-nums">
                {healthStatus?.warnings ?? 0}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500/80 shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/70 uppercase tracking-wider mb-1">
                Críticos
              </p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 tabular-nums">
                {healthStatus?.criticals ?? 0}
              </p>
            </div>
            <XCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500/80 shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/70 uppercase tracking-wider mb-1">
                Última Verificación
              </p>
              <p className="text-sm sm:text-base font-medium text-epoch-primary break-words">
                {healthStatus?.last_check
                  ? new Date(healthStatus.last_check).toLocaleTimeString(
                      "es-AR",
                      { hour: "2-digit", minute: "2-digit" },
                    )
                  : "N/A"}
              </p>
            </div>
            <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-epoch-primary/40 shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
