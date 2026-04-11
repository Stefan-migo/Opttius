"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle,
  Database,
  Mail,
  Monitor,
  Receipt,
  Settings,
  Shield,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { HealthStatus } from "../hooks/useSystemHealth";

interface SystemOverviewProps {
  healthStatus: HealthStatus | null;
  onTabChange: (tab: string) => void;
}

const getHealthStatusBadge = (status: string) => {
  const config: Record<
    string,
    { variant: unknown; label: string; icon: unknown }
  > = {
    healthy: { variant: "default", label: "Saludable", icon: CheckCircle },
    warning: {
      variant: "secondary",
      label: "Advertencias",
      icon: AlertTriangle,
    },
    critical: { variant: "destructive", label: "Crítico", icon: XCircle },
  };

  const statusConfig = config[status] || config["healthy"];
  const Icon = statusConfig.icon;

  return (
    <Badge className="flex items-center gap-1" variant={statusConfig.variant}>
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  );
};

/**
 * Resumen del módulo Sistema con acciones rápidas y estado de salud.
 * Permite navegar a Config, Email, Notificaciones, Salud y Mantenimiento.
 *
 * @param props.healthStatus - Estado de salud del sistema (healthy, warning, critical)
 * @param props.onTabChange - Callback para cambiar de tab en el padre
 */
export default function SystemOverview({
  healthStatus,
  onTabChange,
}: SystemOverviewProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <Card className="rounded-xl border border-border">
          <CardHeader className="p-4 sm:p-6 pb-0">
            <CardTitle className="flex items-center font-display text-epoch-primary text-base sm:text-lg">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <Button
                className="justify-start rounded-xl border-epoch-primary/20 min-h-[44px] text-xs sm:text-sm"
                variant="outline"
                onClick={() => onTabChange("config")}
              >
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                Configuración
              </Button>
              <Button
                className="justify-start rounded-xl border-epoch-primary/20 min-h-[44px] text-xs sm:text-sm"
                variant="outline"
                onClick={() => onTabChange("email")}
              >
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                Plantillas Email
              </Button>
              <Button
                className="justify-start rounded-xl border-epoch-primary/20 min-h-[44px] text-xs sm:text-sm"
                variant="outline"
                onClick={() => onTabChange("notifications")}
              >
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                Notificaciones
              </Button>
              <Button
                className="justify-start rounded-xl border-epoch-primary/20 min-h-[44px] text-xs sm:text-sm"
                variant="outline"
                onClick={() => onTabChange("health")}
              >
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                Salud del Sistema
              </Button>
              <Button
                className="justify-start rounded-xl border-epoch-primary/20 min-h-[44px] text-xs sm:text-sm"
                variant="outline"
                onClick={() => onTabChange("maintenance")}
              >
                <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                Mantenimiento
              </Button>
              <Button
                className="justify-start rounded-xl border-epoch-primary/20 min-h-[44px] text-xs sm:text-sm"
                variant="outline"
                onClick={() => onTabChange("billing")}
              >
                <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                Boletas y Facturas
              </Button>
              <Button
                className="justify-start rounded-xl border-epoch-primary/20 min-h-[44px] text-xs sm:text-sm"
                variant="outline"
                onClick={() => onTabChange("maintenance")}
              >
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                Seguridad
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="rounded-xl border border-border">
          <CardHeader className="p-4 sm:p-6 pb-0">
            <CardTitle className="flex items-center font-display text-epoch-primary text-base sm:text-lg">
              <Monitor className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
              Información del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-epoch-primary/10">
              <span className="text-xs sm:text-sm text-epoch-primary/80">
                Estado General
              </span>
              {healthStatus && getHealthStatusBadge(healthStatus.status)}
            </div>
            <div className="flex items-center justify-between py-2 border-b border-epoch-primary/10">
              <span className="text-xs sm:text-sm text-epoch-primary/80">
                Advertencias
              </span>
              <span className="font-semibold text-yellow-600 text-sm sm:text-base">
                {healthStatus?.warnings || 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-epoch-primary/10">
              <span className="text-xs sm:text-sm text-epoch-primary/80">
                Problemas Críticos
              </span>
              <span className="font-semibold text-red-600 text-sm sm:text-base">
                {healthStatus?.criticals || 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs sm:text-sm text-epoch-primary/80">
                Última Verificación
              </span>
              <span className="text-xs sm:text-sm font-medium text-epoch-primary">
                {healthStatus?.last_check
                  ? new Date(healthStatus.last_check).toLocaleTimeString(
                      "es-AR",
                    )
                  : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
