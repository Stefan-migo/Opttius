"use client";

import { Activity, AlertTriangle, RefreshCw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { HealthMetric, HealthStatus } from "../hooks/useSystemHealth";

interface SystemHealthProps {
  healthMetrics: HealthMetric[];
  healthStatus: HealthStatus | null;
  onRefresh: () => void;
  onClearMemory: () => void;
  refreshing: boolean;
  clearingMemory: boolean;
}

const formatMetricValue = (value: number, unit?: string) => {
  if (unit === "megabytes") {
    return `${value.toFixed(1)} MB`;
  }
  if (unit === "percentage") {
    return `${value.toFixed(1)}%`;
  }
  if (unit === "seconds") {
    return `${value.toFixed(2)}s`;
  }
  if (unit === "count") {
    return Math.round(value).toString();
  }
  return value.toString();
};

const translateMetricName = (name: string): string => {
  const translations: Record<string, string> = {
    database_response_time: "Tiempo de Respuesta de Base de Datos",
    total_users: "Total de Usuarios",
    active_admin_users: "Administradores Activos",
    admin_activity_24h: "Actividad Admin (24h)",
    memory_usage: "Uso de Memoria",
    database_records: "Registros en Base de Datos",
  };

  return (
    translations[name] ||
    name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

const getMetricResolution = (metric: HealthMetric): string => {
  const resolutions: Record<string, string> = {
    database_response_time:
      "Verificar conexión a la base de datos y optimizar consultas lentas.",
    total_users:
      "Este es un límite de advertencia. El sistema puede manejar más usuarios.",
    active_admin_users:
      "Revisar si hay administradores inactivos que deberían ser eliminados.",
    admin_activity_24h:
      "Monitorear actividad inusual. Puede indicar uso intensivo del sistema.",
    memory_usage:
      "Usar el botón 'Limpiar Memoria' para liberar memoria de forma segura.",
    database_records:
      "Considerar archivar datos antiguos o optimizar la base de datos.",
  };

  return (
    resolutions[metric.metric_name] ||
    "Revisar la configuración del sistema y contactar al administrador si persiste."
  );
};

export default function SystemHealth({
  healthMetrics,
  healthStatus,
  onRefresh,
  onClearMemory,
  refreshing,
  clearingMemory,
}: SystemHealthProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Health Metrics */}
      <Card className="rounded-xl border border-border">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
            <div className="flex items-center min-w-0 flex-1">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
              <span className="truncate break-words">Métricas de Salud</span>
            </div>
            <Button
              className="rounded-xl border-epoch-primary/20 min-h-[44px] min-w-[44px] shrink-0"
              disabled={refreshing}
              size="sm"
              variant="outline"
              onClick={onRefresh}
            >
              <RefreshCw
                className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4">
          {healthMetrics.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-epoch-primary/40 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-xs sm:text-sm text-epoch-primary/80 mb-4">
                No hay métricas de salud disponibles
              </p>
              <Button
                className="rounded-xl border-epoch-primary/20 min-h-[44px]"
                disabled={refreshing}
                size="sm"
                variant="outline"
                onClick={onRefresh}
              >
                <RefreshCw
                  className={`h-3 w-3 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Recolectar Métricas
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Métrica
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Valor
                    </TableHead>
                    <TableHead className="text-epoch-primary/80 text-xs sm:text-sm">
                      Estado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthMetrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell className="capitalize text-xs sm:text-sm text-epoch-primary break-words max-w-[120px] sm:max-w-none">
                        {translateMetricName(metric.metric_name)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-epoch-primary/80">
                        {formatMetricValue(
                          metric.metric_value,
                          metric.metric_unit,
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="text-[10px] sm:text-xs"
                          variant={
                            metric.is_healthy ? "default" : "destructive"
                          }
                        >
                          {metric.is_healthy ? "Saludable" : "Problema"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Issues */}
      {healthStatus &&
        (healthStatus.critical_metrics.length > 0 ||
          healthStatus.warning_metrics.length > 0) && (
          <Card className="rounded-xl border border-border">
            <CardHeader className="p-4 sm:p-6 pb-0">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                  Problemas Detectados
                </div>
                {healthStatus.critical_metrics.some(
                  (m) => m.metric_name === "memory_usage",
                ) && (
                  <Button
                    className="rounded-xl border-epoch-primary/20 min-h-[44px] w-full sm:w-auto"
                    disabled={clearingMemory}
                    size="sm"
                    variant="outline"
                    onClick={onClearMemory}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${clearingMemory ? "animate-spin" : ""}`}
                    />
                    Limpiar Memoria
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4">
              <div className="space-y-3 sm:space-y-4">
                {healthStatus.critical_metrics.map((metric) => (
                  <div
                    className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                    key={metric.id}
                  >
                    <div className="flex items-start space-x-3">
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-red-700 dark:text-red-400">
                            Crítico
                          </span>
                          <Badge className="text-xs" variant="destructive">
                            Requiere Acción
                          </Badge>
                        </div>
                        <p className="font-medium text-red-800 dark:text-red-300 mb-1">
                          {translateMetricName(metric.metric_name)}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                          Valor actual:{" "}
                          <span className="font-semibold">
                            {formatMetricValue(
                              metric.metric_value,
                              metric.metric_unit,
                            )}
                          </span>
                          {metric.threshold_critical && (
                            <span className="ml-2 text-xs">
                              (Límite crítico:{" "}
                              {formatMetricValue(
                                metric.threshold_critical,
                                metric.metric_unit,
                              )}
                              )
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded mt-2">
                          <strong>Resolución:</strong>{" "}
                          {getMetricResolution(metric)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {healthStatus.warning_metrics.map((metric) => (
                  <div
                    className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl"
                    key={metric.id}
                  >
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-yellow-700 dark:text-yellow-400">
                              Advertencia
                            </span>
                          </div>
                          {metric.metric_name === "memory_usage" && (
                            <Button
                              className="h-7 text-xs rounded-xl min-h-[44px] sm:min-h-7"
                              disabled={clearingMemory}
                              size="sm"
                              variant="outline"
                              onClick={onClearMemory}
                            >
                              <RefreshCw
                                className={`h-3 w-3 mr-1 ${clearingMemory ? "animate-spin" : ""}`}
                              />
                              Limpiar
                            </Button>
                          )}
                        </div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                          {translateMetricName(metric.metric_name)}
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          Valor actual:{" "}
                          <span className="font-semibold">
                            {formatMetricValue(
                              metric.metric_value,
                              metric.metric_unit,
                            )}
                          </span>
                          {metric.threshold_warning && (
                            <span className="ml-2 text-xs">
                              (Límite de advertencia:{" "}
                              {formatMetricValue(
                                metric.threshold_warning,
                                metric.metric_unit,
                              )}
                              )
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
